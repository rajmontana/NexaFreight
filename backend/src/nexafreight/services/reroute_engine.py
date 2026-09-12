"""Reroute option engine (Definitive Plan — Phase 5).

For every alert the engine produces exactly three scored options:

  A. ACCEPT_DELAY   — absorb the estimated delay; cost_delta = 0; the SLA
                      penalties + demurrage it causes are the impact.
  B. DIVERT         — take a seeded corridor alternative (least added
                      transit time among corridors applicable to this
                      disruption type). When no corridor matches, a
                      GENERIC_DIVERT_TEMPLATE placeholder is presented
                      (×1.25 cost, +36h, ×1.10 CO2) — carry no route
                      template so it cannot be executed by mistake.
  C. MODAL SHIFT    — fly the remaining distance (5000 km at 800 km/h
                      default + 12h handling); 1.8× freight, huge CO2.

Scoring: total_impact_usd = sla_penalty + demurrage + cost_delta + carbon.
Recommended = lowest total impact (traditional EXW total-cost-of-choice).
"""

from __future__ import annotations

import json
import logging
import math
from dataclasses import dataclass, field, replace
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from nexafreight.enums import DecisionAction, LegStatus
from nexafreight.models import Alert, Order, Shipment
from nexafreight.models.corridor import CorridorAlternative
from nexafreight.services.alert_engine import (
    estimate_demurrage,
    latest_planned_arrival,
)
from nexafreight.services.disruption_detector import TONNES_PER_CONTAINER
from nexafreight.services.financial_engine import (
    SLA_PENALTY_PCT_PER_DAY,
    calculate_co2_cost,
    calculate_co2_kg,
    calculate_freight_cost,
    calculate_sla_penalty,
)

logger = logging.getLogger(__name__)

#: Air transit planning speed (km/h) and flat handling time (h).
AIR_SPEED_KMH: float = 800.0
AIR_HANDLING_HOURS: float = 12.0

#: Fallback remaining distance when the shipment carries no planned legs.
DEFAULT_REMAINING_KM: float = 5_000.0

#: Fallback delay estimate when an alert payload carries none.
FALLBACK_DELAY_HOURS: float = 24.0

#: Generic divert template shown when no corridor alternative matches.
GENERIC_DIVERT_TEMPLATE: dict = {
    "cost_delta_factor": 1.25,
    "time_delta_hours": 36.0,
    "co2_delta_factor": 1.10,
}


# ---------------------------------------------------------------------------
# Option value object
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class RerouteOption:
    """One scored reroute option presented to the operator."""

    option_key: str
    action: DecisionAction
    display_name: str
    description: str
    revised_eta: datetime | None
    cost_delta_usd: float
    sla_penalty_usd: float
    demurrage_usd: float
    carbon_cost_usd: float
    co2_delta_kg: float
    sla_breaches: int
    total_impact_usd: float
    recommended: bool = False
    assumptions: list[str] = field(default_factory=list)
    route_template: dict | None = None
    corridor_alternative_id: int | None = None

    def to_dict(self) -> dict:
        return {
            "option_key": self.option_key,
            "action": str(self.action),
            "display_name": self.display_name,
            "description": self.description,
            "revised_eta": self.revised_eta.isoformat() if self.revised_eta else None,
            "cost_delta_usd": round(self.cost_delta_usd, 2),
            "sla_penalty_usd": round(self.sla_penalty_usd, 2),
            "demurrage_usd": round(self.demurrage_usd, 2),
            "carbon_cost_usd": round(self.carbon_cost_usd, 2),
            "co2_delta_kg": round(self.co2_delta_kg, 1),
            "sla_breaches": self.sla_breaches,
            "total_impact_usd": round(self.total_impact_usd, 2),
            "recommended": self.recommended,
            "assumptions": list(self.assumptions),
        }


# ---------------------------------------------------------------------------
# Scoring helpers
# ---------------------------------------------------------------------------


def _days_late(revised_eta: datetime | None, deadline: datetime | None) -> int:
    """Whole days late (ceil), 0 when on time or unknowable."""
    if revised_eta is None or deadline is None:
        return 0
    if revised_eta.tzinfo is None:
        revised_eta = revised_eta.replace(tzinfo=UTC)
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=UTC)
    if revised_eta <= deadline:
        return 0
    return max(1, math.ceil((revised_eta - deadline).total_seconds() / 86400.0))


def _score_sla(orders: list[Order], revised_eta: datetime | None) -> tuple[float, int]:
    """(total SLA penalty, breach count) for an order slate at an ETA."""
    total = 0.0
    breaches = 0
    for order in orders:
        late = _days_late(revised_eta, order.sla_deadline)
        if late > 0:
            breaches += 1
            total += calculate_sla_penalty(
                revenue=order.revenue,
                penalty_pct=SLA_PENALTY_PCT_PER_DAY,
                days_late=late,
            )
    return total, breaches


def _remaining_leg_metrics(shipment: Shipment) -> tuple[float, str]:
    """(remaining_km, current_mode) over the shipment's PLANNED legs."""
    planned = [leg for leg in shipment.legs if str(leg.status) == LegStatus.PLANNED]
    km = sum(leg.distance_km or 0.0 for leg in planned)
    mode = str(shipment.primary_transport_mode)
    return (km if km > 0 else DEFAULT_REMAINING_KM), mode


def _co2_for(mode: str, km: float, weight_t: float) -> float:
    return calculate_co2_kg(km, weight_t, mode)


def _freight_for(mode: str, km: float, weight_t: float) -> float:
    return calculate_freight_cost(km, weight_t, mode)


# ---------------------------------------------------------------------------
# Option builders
# ---------------------------------------------------------------------------


def _create_accept_option(
    alert: Alert,
    shipment: Shipment,
    orders: list[Order],
    payload: dict,
) -> RerouteOption:
    """Option A — absorb the delay (Plan §Phase 5 step 2)."""
    delay_hours = float(payload.get("estimated_delay_hours") or FALLBACK_DELAY_HOURS)
    base_eta = latest_planned_arrival(shipment)
    if base_eta is not None and base_eta.tzinfo is None:
        base_eta = base_eta.replace(tzinfo=UTC)
    revised_eta = base_eta + timedelta(hours=delay_hours) if base_eta else None

    sla_penalty, breaches = _score_sla(orders, revised_eta)
    demurrage = estimate_demurrage(shipment, delay_hours)
    total = sla_penalty + demurrage

    return RerouteOption(
        option_key="ACCEPT_DELAY",
        action=DecisionAction.ACCEPT_DELAY,
        display_name="Accept the delay",
        description=(
            f"Absorb the estimated {delay_hours:.0f}h delay on the current route. "
            "No freight premium; penalties and demurrage still apply."
        ),
        revised_eta=revised_eta,
        cost_delta_usd=0.0,
        sla_penalty_usd=sla_penalty,
        demurrage_usd=demurrage,
        carbon_cost_usd=0.0,
        co2_delta_kg=0.0,
        sla_breaches=breaches,
        total_impact_usd=total,
        assumptions=[
            "Delay estimate from detection payload (or 24h fallback).",
            "Freight cost unchanged — same route, same carrier.",
        ],
    )


def _create_divert_option(
    alert: Alert,
    shipment: Shipment,
    orders: list[Order],
    corridor: dict | None,
) -> RerouteOption:
    """Option B — divert via corridor alternative, else generic placeholder."""
    remaining_km, mode = _remaining_leg_metrics(shipment)
    weight_t = max(1, shipment.container_count) * TONNES_PER_CONTAINER
    baseline_freight = _freight_for(mode, remaining_km, weight_t)
    baseline_co2 = _co2_for(mode, remaining_km, weight_t)
    base_eta = latest_planned_arrival(shipment)
    if base_eta is not None and base_eta.tzinfo is None:
        base_eta = base_eta.replace(tzinfo=UTC)

    if corridor is not None:
        time_delta = float(corridor["time_delta_hours"])
        cost_factor = float(corridor["cost_delta_factor"])
        co2_factor = float(corridor["co2_delta_factor"])
        option_key = str(corridor["option_key"])
        display_name = str(corridor["display_name"])
        template = corridor.get("route_template")
        corridor_id = corridor.get("id")
        assumptions = [
            f"Corridor factors ({cost_factor:.2f}× cost, {co2_factor:.2f}× CO2) "
            "applied to remaining freight.",
        ]
    else:
        time_delta = GENERIC_DIVERT_TEMPLATE["time_delta_hours"]
        cost_factor = GENERIC_DIVERT_TEMPLATE["cost_delta_factor"]
        co2_factor = GENERIC_DIVERT_TEMPLATE["co2_delta_factor"]
        option_key = "DIVERT_GENERIC"
        display_name = "Divert via alternate route (generic)"
        template = None
        corridor_id = None
        assumptions = [
            "No seeded corridor matches this disruption type — generic "
            "template (×1.25 cost, +36h, ×1.10 CO2); not executable.",
        ]

    revised_eta = base_eta + timedelta(hours=time_delta) if base_eta else None
    cost_delta = baseline_freight * (cost_factor - 1.0)
    co2_delta = baseline_co2 * (co2_factor - 1.0)
    carbon = calculate_co2_cost(co2_delta)
    sla_penalty, breaches = _score_sla(orders, revised_eta)
    demurrage = estimate_demurrage(shipment, time_delta)
    total = cost_delta + carbon + sla_penalty + demurrage

    return RerouteOption(
        option_key=option_key,
        action=DecisionAction.REROUTE,
        display_name=display_name,
        description=(
            f"Divert the remaining {remaining_km:,.0f} km via an alternate "
            f"corridor (+{time_delta:.0f}h transit, {cost_factor:.2f}× freight)."
        ),
        revised_eta=revised_eta,
        cost_delta_usd=cost_delta,
        sla_penalty_usd=sla_penalty,
        demurrage_usd=demurrage,
        carbon_cost_usd=carbon,
        co2_delta_kg=co2_delta,
        sla_breaches=breaches,
        total_impact_usd=total,
        assumptions=assumptions,
        route_template=template,
        corridor_alternative_id=corridor_id,
    )


def _create_modal_option(
    alert: Alert,
    shipment: Shipment,
    orders: list[Order],
    *,
    now: datetime,
) -> RerouteOption:
    """Option C — modal shift to air over the remaining distance."""
    remaining_km, current_mode = _remaining_leg_metrics(shipment)
    weight_t = max(1, shipment.container_count) * TONNES_PER_CONTAINER

    transit_hours = remaining_km / AIR_SPEED_KMH + AIR_HANDLING_HOURS
    revised_eta = now + timedelta(hours=transit_hours)

    air_freight = _freight_for("AIR", remaining_km, weight_t)
    cur_freight = _freight_for(current_mode, remaining_km, weight_t)
    cost_delta = air_freight - cur_freight

    air_co2 = _co2_for("AIR", remaining_km, weight_t)
    cur_co2 = _co2_for(current_mode, remaining_km, weight_t)
    co2_delta = air_co2 - cur_co2
    carbon = calculate_co2_cost(co2_delta)

    sla_penalty, breaches = _score_sla(orders, revised_eta)
    total = cost_delta + carbon + sla_penalty

    return RerouteOption(
        option_key="MODAL_SHIFT_AIR",
        action=DecisionAction.REROUTE,
        display_name="Modal shift to air freight",
        description=(
            f"Fly the remaining {remaining_km:,.0f} km "
            f"(~{transit_hours:.0f}h including handling). High cost and CO2, "
            "best chance of preserving SLA deadlines."
        ),
        revised_eta=revised_eta,
        cost_delta_usd=cost_delta,
        sla_penalty_usd=sla_penalty,
        demurrage_usd=0.0,
        carbon_cost_usd=carbon,
        co2_delta_kg=co2_delta,
        sla_breaches=breaches,
        total_impact_usd=total,
        assumptions=[
            f"Air transit {AIR_SPEED_KMH:.0f} km/h + {AIR_HANDLING_HOURS:.0f}h handling.",
            "Air freight 1.8 USD/t-km vs current-mode nominal rate.",
        ],
        route_template={"legs": [{"mode": "AIR", "to": "DESTINATION"}]},
    )


# ---------------------------------------------------------------------------
# Corridor lookup
# ---------------------------------------------------------------------------


async def _find_alternative_port(
    session: AsyncSession, disruption_type: str
) -> dict | None:
    """Corridor lookup: best seeded alternative applicable to this disruption.

    "Best" = least added transit time. Applicability is stored as a JSON list
    of DisruptionType values on the corridor row.
    """
    result = await session.execute(select(CorridorAlternative))
    candidates: list[CorridorAlternative] = []
    for corridor in result.scalars().all():
        try:
            applies = json.loads(corridor.applicable_disruption_types_json)
        except json.JSONDecodeError:
            continue
        if disruption_type in applies:
            candidates.append(corridor)

    if not candidates:
        return None

    best = min(candidates, key=lambda c: c.time_delta_hours)
    return {
        "id": best.id,
        "option_key": best.option_key,
        "display_name": best.display_name,
        "cost_delta_factor": best.cost_delta_factor,
        "time_delta_hours": best.time_delta_hours,
        "co2_delta_factor": best.co2_delta_factor,
        "route_template": json.loads(best.route_template_json),
    }


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------


async def generate_options(
    session: AsyncSession,
    alert: Alert,
    *,
    now: datetime | None = None,
) -> list[RerouteOption]:
    """Generate the three scored reroute options for an alert.

    The recommended option is the one with the lowest total financial
    impact. Order is stable: [ACCEPT_DELAY, DIVERT, MODAL_SHIFT_AIR].
    """
    now = now or datetime.now(UTC)

    shipment = (
        (
            await session.execute(
                select(Shipment).where(Shipment.id == alert.shipment_id)
            )
        )
        .scalars()
        .first()
    )
    if shipment is None:
        from nexafreight.exceptions import ResourceNotFoundError

        raise ResourceNotFoundError("Shipment", alert.shipment_id)
    await session.refresh(shipment, ["legs", "orders"])
    orders = list(shipment.orders)

    try:
        payload = json.loads(alert.sla_breach_details_json or "{}")
    except json.JSONDecodeError:
        payload = {}

    # Query the parent disruption directly — accessing the `alert.disruption`
    # relationship here would lazy-load IO outside the async greenlet.
    disruption_type = "MANUAL"
    if alert.disruption_id:
        from nexafreight.models import Disruption

        disruption = await session.get(Disruption, alert.disruption_id)
        if disruption is not None:
            disruption_type = str(disruption.disruption_type)
    corridor = await _find_alternative_port(session, disruption_type)

    accept = _create_accept_option(alert, shipment, orders, payload)
    divert = _create_divert_option(alert, shipment, orders, corridor)
    modal = _create_modal_option(alert, shipment, orders, now=now)

    options = [accept, divert, modal]
    best = min(options, key=lambda o: o.total_impact_usd)
    options = [replace(o, recommended=True) if o is best else o for o in options]

    logger.info(
        "Generated %d options for alert %s; recommended=%s ($%.2f)",
        len(options),
        alert.id,
        best.option_key,
        best.total_impact_usd,
    )
    return options
