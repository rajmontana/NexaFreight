"""SLA checker (Definitive Plan — Phase 4).

Continuous SLA surveillance:
    compute_sla_risk(deadline, current_eta)
        ON_TIME → (cushion >= 3d) / LOW (>=1d) / MEDIUM (>=12h) / HIGH (<12h)
        BREACH when the ETA is already past the deadline.
    check_all_in_transit(session)
        Rescores every order on IN_TRANSIT / DELAYED shipments from the
        shipment's current ETA (revised-else-planned) and persists
        Order.sla_status. Skips DELIVERED shipments.
    escalate_unacknowledged(alert)
        CRITICAL alerts still OPEN past the ack SLA (60 min) get an
        immutable escalation entry in the audit trail.
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime, timedelta
from enum import StrEnum

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from nexafreight.enums import AlertStatus, OrderSlaStatus, ShipmentStatus
from nexafreight.models import Alert, AuditLog, Order, Shipment
from nexafreight.services.alert_engine import latest_planned_arrival

logger = logging.getLogger(__name__)

#: Minutes a CRITICAL alert may stay unacknowledged before escalation.
ACK_SLA_MINUTES: int = 60

#: Cushion thresholds (days before the deadline an ETA may sit).
CUSHION_ON_TIME_DAYS: float = 3.0
CUSHION_LOW_DAYS: float = 1.0


class SlaRisk(StrEnum):
    """SLA risk bands (Definitive Plan Phase 4)."""

    ON_TIME = "ON_TIME"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    BREACH = "BREACH"


def compute_sla_risk(
    deadline: datetime | None,
    current_eta: datetime | None,
) -> SlaRisk:
    """SLA risk for an order delivered at ``current_eta`` vs ``deadline``.

    - ETA unknown → ON_TIME (no basis to warn)
    - ETA past deadline → BREACH
    - Cushion >= 3 days → ON_TIME
    - Cushion >= 1 day → LOW
    - Cushion >= 12 hours → MEDIUM
    - Less than that → HIGH
    """
    if deadline is None or current_eta is None:
        return SlaRisk.ON_TIME
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=UTC)
    if current_eta.tzinfo is None:
        current_eta = current_eta.replace(tzinfo=UTC)

    if current_eta > deadline:
        return SlaRisk.BREACH
    cushion_days = (deadline - current_eta).total_seconds() / 86400.0
    if cushion_days >= CUSHION_ON_TIME_DAYS:
        return SlaRisk.ON_TIME
    if cushion_days >= CUSHION_LOW_DAYS:
        return SlaRisk.LOW
    if cushion_days >= 0.5:
        return SlaRisk.MEDIUM
    return SlaRisk.HIGH


def _risk_to_order_status(risk: SlaRisk) -> OrderSlaStatus:
    """Map the 5-band risk onto the persisted 3-state OrderSlaStatus."""
    if risk is SlaRisk.BREACH:
        return OrderSlaStatus.LATE
    if risk is SlaRisk.ON_TIME:
        return OrderSlaStatus.ON_TIME
    return OrderSlaStatus.AT_RISK


def _current_eta(shipment: Shipment) -> datetime | None:
    """Current ETA: latest revised ETA from any open alert, else latest planned."""
    best: datetime | None = None
    for alert in shipment.alerts:
        if str(alert.status) == AlertStatus.RESOLVED:
            continue
        try:
            payload = json.loads(alert.sla_breach_details_json or "{}")
        except json.JSONDecodeError:
            continue
        eta_raw = payload.get("revised_eta")
        if eta_raw:
            eta = datetime.fromisoformat(eta_raw)
            if best is None or eta > best:
                best = eta
    return best or latest_planned_arrival(shipment)


async def check_all_in_transit(
    session: AsyncSession,
    *,
    now: datetime | None = None,
) -> dict:
    """Sweep all IN_TRANSIT / DELAYED shipments and rescore their orders.

    Returns a per-status summary dict for worker logging/telemetry.
    """
    now = now or datetime.now(UTC)

    result = await session.execute(
        select(Shipment).where(
            Shipment.status.in_([ShipmentStatus.IN_TRANSIT, ShipmentStatus.DELAYED])
        )
    )
    shipments = result.scalars().all()

    counts: dict[str, int] = {"ON_TIME": 0, "AT_RISK": 0, "LATE": 0}
    escalated = 0
    checked = 0

    for shipment in shipments:
        await session.refresh(shipment, ["legs", "orders", "alerts"])
        eta = _current_eta(shipment)
        late = False
        for order in shipment.orders:
            risk = compute_sla_risk(order.sla_deadline, eta)
            status = _risk_to_order_status(risk)
            counts[str(status)] += 1
            if status == OrderSlaStatus.LATE:
                late = True
            order.sla_status = status
            checked += 1

        # Rollup: shipment status mirror (no downgrade over PLANNED state)
        if late and str(shipment.status) != ShipmentStatus.DELAYED:
            shipment.status = ShipmentStatus.DELAYED

        # Escalate stale CRITICAL alerts attached to this shipment.
        for alert in shipment.alerts:
            escalated += int(
                await escalate_unacknowledged(session, alert, now=now)
            )

    await session.flush()
    summary = {
        "shipments_checked": len(shipments),
        "orders_checked": checked,
        "orders_on_time": counts["ON_TIME"],
        "orders_at_risk": counts["AT_RISK"],
        "orders_late": counts["LATE"],
        "alerts_escalated": escalated,
    }
    logger.info("SLA sweep complete: %s", summary)
    return summary


async def escalate_unacknowledged(
    session: AsyncSession,
    alert: Alert,
    *,
    now: datetime | None = None,
    ack_sla_minutes: int = ACK_SLA_MINUTES,
) -> bool:
    """Escalate a CRITICAL alert still OPEN past its ack SLA.

    Writes an immutable AuditLog entry (idempotent per alert).
    Returns True when an escalation entry was written.
    """
    now = now or datetime.now(UTC)

    if str(alert.status) != AlertStatus.OPEN:
        return False
    if str(alert.severity) != "CRITICAL":
        return False

    created = alert.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=UTC)
    if now - created < timedelta(minutes=ack_sla_minutes):
        return False

    # Idempotent: one escalation entry per alert.
    existing = (
        await session.execute(
            select(AuditLog).where(
                AuditLog.action == "alert_escalated",
                AuditLog.entity_id == alert.id,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        return False

    age_minutes = (now - created).total_seconds() / 60.0
    session.add(
        AuditLog(
            actor_type="system",
            actor_name="sla_monitor",
            action="alert_escalated",
            entity_type="alert",
            entity_id=alert.id,
            details_json=json.dumps(
                {
                    "severity": str(alert.severity),
                    "status": str(alert.status),
                    "age_minutes": round(age_minutes, 1),
                    "ack_sla_minutes": ack_sla_minutes,
                    "financial_exposure": alert.financial_exposure,
                }
            ),
        )
    )
    await session.flush()
    logger.warning(
        "Escalated unacknowledged CRITICAL alert %s (%.0f min old)", alert.id, age_minutes
    )
    return True
