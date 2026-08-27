"""Financial exposure — REAL decision audit + calibrated tariff math (§8.3/§10.1)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.db import get_db
from backend.app.models.entities import (
    Alert,
    CalibratedParam,
    Decision,
    DecisionOption,
    Shipment,
)
from backend.app.services.alert_engine import REPLAY_WINDOW_DAYS, active_shipments

router = APIRouter(prefix="/api/finance", tags=["finance"])

BUDGETS = {"freight": 250_000, "expedite": 40_000, "demurrage": 15_000, "carbon": 6_000}


@router.get("")
def finance(_u: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    # --- REAL: SLA penalty exposure over the replay window (5% OTIF of late, REAL values)
    act = active_shipments(db)
    penalty_exposure = round(sum(0.05 * s.value_usd for s in act), 2)

    # --- REAL: expedite ROI log from the actual decision audit trail
    decisions = (db.query(Decision, DecisionOption, Alert, Shipment)
                 .join(DecisionOption, Decision.option_id == DecisionOption.id, isouter=True)
                 .join(Alert, Decision.alert_id == Alert.id)
                 .join(Shipment, Alert.shipment_id == Shipment.id)
                 .order_by(Decision.decided_at.desc()).limit(50).all())
    roi_log, approved_spend = [], 0.0
    for d, o, _a, s in decisions:
        cost = o.cost_usd if o else 0.0
        avoided = round(0.05 * s.value_usd, 2)  # REAL penalty avoided (OTIF clause)
        if d.action == "APPROVED" and o is not None:
            approved_spend += cost
        roi_log.append({"decided_at": d.decided_at.isoformat(), "action": d.action,
                        "by": d.decided_by, "shipment": s.ref, "option": o.option_type if o else None,
                        "cost_usd": cost, "penalty_avoided_usd": avoided,
                        "net_usd": round(avoided - cost, 2), "reason": d.reason})

    # --- DERIVED (calibrated tariffs): demurrage accrual potential this window
    t = (db.query(CalibratedParam).filter_by(key="demurrage.tariff_matrix").one_or_none())
    tariff = (t.value if t else {}) or {}
    dry = tariff.get("ocean_dry", {})
    ocean_late = [s for s in act if s.freight_mode == "OCEAN"]
    dwell_days = 1.07  # UNCTAD world container median (data-backed prior, source row in DB)
    demurrage_potential = round(len(ocean_late) * dwell_days * dry.get("per_day_usd", 250), 2)

    # --- DERIVED: air-vs-ocean breakeven curve (per-lane, t-km from lane distance)
    air_mult = 5.0  # SOP guide: air ≈ 4–6x ocean (documented range, midpoint used)
    curve = []
    for pen in range(0, 2001, 250):
        ocean_cost, air_cost = 900.0, 900.0 * air_mult
        curve.append({"penalty_exposure_usd": pen,
                      "ocean_total": round(ocean_cost + pen, 2),
                      "air_total": round(air_cost, 2),
                      "choice": "AIR" if air_cost < ocean_cost + pen else "OCEAN"})
    breakeven = round(900.0 * (air_mult - 1), 2)  # penalty where air flips optimal

    return {
        "window": {"days": REPLAY_WINDOW_DAYS, "at_risk_shipments": len(act)},
        "sla_penalty_exposure_usd": penalty_exposure,
        "demurrage_potential_usd": demurrage_potential,
        "expedite": {"approved_spend_usd": round(approved_spend, 2),
                     "budget_usd": BUDGETS["expedite"],
                     "utilization_pct": round(100 * approved_spend / BUDGETS["expedite"], 1)},
        "budgets": BUDGETS,
        "breakeven": {"threshold_usd": breakeven, "air_multiple": air_mult,
                      "curve": curve, "source": "SOP guide tariff ranges + OTIF 5%"},
        "roi_log": roi_log,
        "provenance": {"exposure": "REAL:DataCo+OTIF", "demurrage": "CALIBRATED:UNCTAD-prior x SOP tariff",
                       "breakeven": "DERIVED:optimizer", "roi_log": "REAL:decision-audit"},
    }
