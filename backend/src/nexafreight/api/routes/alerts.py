"""Alert endpoints (Definitive Plan — Phase 9).

List (severity/status filters), detail (embedded disruption), acknowledge,
reroute options, and approve (delegates to the decision executor).

Error map: ValidationError → 400/422, ConflictError → 409,
ResourceNotFoundError → 404.
"""

from __future__ import annotations

import json

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from nexafreight.database import get_db_session
from nexafreight.dependencies import get_current_user
from nexafreight.exceptions import (
    ResourceNotFoundError,
    ValidationError,
)
from nexafreight.models import Alert, Decision, User
from nexafreight.schemas.ops import (
    AcknowledgeRequest,
    AlertDetail,
    AlertOut,
    AlertsResponse,
    OptionsOut,
    RerouteOptionOut,
    SlaBreachOut,
)
from nexafreight.services.decision_executor import execute_decision
from nexafreight.services.reroute_engine import generate_options

router = APIRouter()


def _alert_out(alert: Alert) -> AlertOut:
    """ORM row → response DTO."""
    ack = None
    if getattr(alert, "acknowledged_by", None):
        ack = str(alert.acknowledged_by)
    return AlertOut(
        id=alert.id,
        shipment_id=alert.shipment_id,
        disruption_id=alert.disruption_id,
        disruption_type=(
            str(alert.disruption.disruption_type) if alert.disruption is not None else None
        ),
        severity=str(alert.severity),
        status=str(alert.status),
        financial_exposure=alert.financial_exposure,
        created_at=alert.created_at,
        acknowledged_by=ack,
        provenance="DERIVED",
    )


async def _get_alert(session: AsyncSession, alert_id: str) -> Alert:
    alert = await session.get(Alert, alert_id)
    if alert is None:
        raise ResourceNotFoundError("Alert", alert_id)
    # Load relationship inside the greenlet
    await session.refresh(alert, ["disruption"])
    return alert


@router.get("", response_model=AlertsResponse)
@router.get("/", response_model=AlertsResponse)
async def list_alerts(
    severity: str | None = Query(None),
    status: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_db_session),
    _current_user: User = Depends(get_current_user),
) -> AlertsResponse:
    """List alerts with optional severity/status filters."""
    stmt = select(Alert).order_by(Alert.created_at.desc()).limit(limit)
    if severity:
        stmt = stmt.where(Alert.severity == severity)
    if status:
        stmt = stmt.where(Alert.status == status)
    result = await session.execute(stmt)
    alerts = list(result.scalars().all())
    # touch disruption relationship within the greenlet
    for alert in alerts:
        await session.refresh(alert, ["disruption"])
    return AlertsResponse(alerts=[_alert_out(a) for a in alerts])


@router.get("/{alert_id}", response_model=AlertDetail)
async def get_alert(
    alert_id: str,
    session: AsyncSession = Depends(get_db_session),
    _current_user: User = Depends(get_current_user),
) -> AlertDetail:
    """Fetch a single alert with its disruption context."""
    alert = await _get_alert(session, alert_id)

    breach_out: list[SlaBreachOut] = []
    try:
        payload = json.loads(alert.sla_breach_details_json or "{}")
    except json.JSONDecodeError:
        payload = {}
    for breach in payload.get("breaches") or []:
        breach_out.append(SlaBreachOut(**breach))

    disruption_out = None
    if alert.disruption is not None:
        disruption = alert.disruption
        disruption_out = {
            "id": disruption.id,
            "shipment_id": disruption.shipment_id,
            "disruption_type": str(disruption.disruption_type),
            "status": str(disruption.status),
            "description": disruption.description,
            "leg_id": disruption.leg_id,
            "detected_at": disruption.detected_at,
            "resolved_at": disruption.resolved_at,
        }

    base = _alert_out(alert)
    return AlertDetail(
        **base.model_dump(),
        disruption=disruption_out,
        sla_breach_details=breach_out,
        description=(alert.disruption.description if alert.disruption is not None else None),
        detected_at=(alert.disruption.detected_at if alert.disruption is not None else None),
    )


@router.patch("/{alert_id}/acknowledge", response_model=AlertOut)
async def acknowledge_alert(
    alert_id: str,
    payload: AcknowledgeRequest = Body(default_factory=AcknowledgeRequest),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AlertOut:
    """Mark an alert as ACKNOWLEDGED and stamp the actor."""
    alert = await _get_alert(session, alert_id)

    # Resolve the acknowledging user: JWT identity preferred; payload user_id is
    # an admin override kept for the demo flow.
    ack_user = current_user or await session.get(User, int(payload.user_id))
    if ack_user is None:
        raise ValidationError(f"Unknown user id: {payload.user_id}")

    from datetime import UTC, datetime

    from nexafreight.enums import AlertStatus

    alert.status = AlertStatus.ACKNOWLEDGED
    alert.acknowledged_by = ack_user.id
    alert.acknowledged_at = datetime.now(UTC)
    await session.commit()
    # Re-load the disruption relation inside the greenlet (plain refresh would
    # expire it and force a lazy load outside IO context).
    await session.refresh(alert, ["disruption"])
    return _alert_out(alert)


@router.get("/{alert_id}/options", response_model=OptionsOut)
async def get_options(
    alert_id: str,
    session: AsyncSession = Depends(get_db_session),
    _current_user: User = Depends(get_current_user),
) -> OptionsOut:
    """Return exactly 3 scored reroute options (plan §Phase 5)."""
    alert = await _get_alert(session, alert_id)
    options = await generate_options(session, alert)
    # A decision row may already exist (idempotent approve) — still render options.
    return OptionsOut(
        options=[RerouteOptionOut(**option.to_dict()) for option in options]
    )


@router.post("/{alert_id}/approve", status_code=201)
async def approve_option(
    alert_id: str,
    payload: dict = Body(...),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Approve-and-execute a reroute option.

    Delegates to the decision executor; the decision row records everything
    presented to the operator (one decision per alert — duplicates → 409).
    """
    option_key = payload.get("option_key")
    if not option_key:
        raise ValidationError("option_key is required")

    if current_user is None and not payload.get("user_id"):
        raise ValidationError(
            "Provide user_id in the body to attest as an operator"
        )
    from nexafreight.models import User as UserModel

    approver: User | None = current_user
    if approver is None:
        approver = await session.get(UserModel, int(payload["user_id"]))
    if approver is None:
        raise ValidationError(f"Unknown user id: {payload.get('user_id')}")

    decision = await execute_decision(
        session, alert_id=alert_id, option_key=option_key, user=approver
    )
    await session.commit()

    return {
        "decision_id": decision.id,
        "action": str(decision.action),
        "chosen_option_key": decision.chosen_option_key,
        "provenance": "DERIVED",
    }


@router.get("/{alert_id}/decision", status_code=200)
async def get_alert_decision(
    alert_id: str,
    session: AsyncSession = Depends(get_db_session),
    _current_user: User = Depends(get_current_user),
) -> dict:
    """Return the executed decision for an alert, if any (audit trail view)."""
    result = await session.execute(select(Decision).where(Decision.alert_id == alert_id))
    decision = result.scalar_one_or_none()
    if decision is None:
        raise ResourceNotFoundError("Decision", f"alert={alert_id}")
    return {
        "id": decision.id,
        "alert_id": decision.alert_id,
        "shipment_id": decision.shipment_id,
        "action": str(decision.action),
        "chosen_option_key": decision.chosen_option_key,
        "financial_impact": decision.financial_impact,
        "route_version_before": decision.route_version_before,
        "route_version_after": decision.route_version_after,
        "approved_by": decision.approved_by,
        "provenance": "DERIVED",
    }
