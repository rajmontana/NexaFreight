"""Alert engine: evaluate SOP rules over the operational replay window and
generate priced decision options (blueprint §8–9).

Honesty notes (AGENTS.md §3):
- All shipments are historical (2015–17). We define an OPERATIONAL REPLAY
  WINDOW (last 45 days of real order data, as-of the max order date) and treat
  at-risk in-window shipments as "active" — every alert carries
  provenance=DERIVED:replay-window.
- Option costs come from calibrated_params (SOP guide tariffs — REAL source).
- p_on_time values are heuristic priors v1, labeled DERIVED:heuristic-v1;
  Phase 4 replaces them with ETA-quantile-model probabilities.
"""

from __future__ import annotations

import logging

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.models.entities import Alert, CalibratedParam, DecisionOption, Shipment, SopRule

log = logging.getLogger(__name__)

REPLAY_WINDOW_DAYS = 45

# Heuristic action-effectiveness priors (DERIVED:heuristic-v1 -> Phase 4 ETA model)
PRIORS = {
    "HOLD": {"days_saved": 0.0, "p_on_time": 0.10},
    "REROUTE_PORT": {"days_saved": 3.5, "p_on_time": 0.60},
    "PARTIAL_AIR": {"days_saved": 5.8, "p_on_time": 0.85},
}


def _tariff(db: Session) -> dict:
    p = db.query(CalibratedParam).filter_by(key="demurrage.tariff_matrix").one_or_none()
    return (p.value if p else {}) or {}


def active_shipments(db: Session) -> list[Shipment]:
    """At-risk shipments inside the replay window (real rows, replay-labeled)."""
    as_of = db.query(func.max(Shipment.order_date)).scalar()
    if not as_of:
        return []
    from datetime import timedelta

    floor = as_of - timedelta(days=REPLAY_WINDOW_DAYS)
    return (db.query(Shipment)
            .filter(Shipment.order_date >= floor, Shipment.order_date <= as_of,
                    Shipment.was_late.is_(True))
            .order_by(Shipment.value_usd.desc())
            .all())


def _options_for(db: Session, alert: Alert, s: Shipment, rule: SopRule) -> list[dict]:
    t = _tariff(db)
    sla_fine = float(t.get("ocean_dry", {}).get("sla_fine_usd", 1000))
    penalty = round(0.05 * s.value_usd, 2)  # OTIF 5% exposure (SOP guide)
    diversion = float(t.get("ocean_dry", {}).get("per_day_usd", 250))
    reroute_cost = round(2500 + 300, 2)  # flat + first day (SOP-LOG-001)
    air_cost = 12500.0  # SOP guide Worksheet 1 estimate
    rows = []
    for otype, label, cost in (
        ("HOLD", "Hold course — accept delay, absorb SLA penalty", penalty),
        ("REROUTE_PORT", f"Divert to secondary feeder port (flat $2,500 + ${int(diversion)}/d)", reroute_cost),
        ("PARTIAL_AIR", "Partial air expedite of urgent lines (~$12,500)", air_cost),
    ):
        prior = PRIORS[otype]
        from backend.app.ml import eta_model
        base_p = None
        if otype == "HOLD":
            pred = eta_model.predict_for_shipment(s)
            base_p = pred["p_on_time"] if pred and pred.get("p_on_time") is not None else None
        uplift = {"HOLD": 0.0, "REROUTE_PORT": 0.5, "PARTIAL_AIR": 0.75}[otype]
        p = prior["p_on_time"] if base_p is None else round(min(0.97, max(0.02, base_p + uplift)), 3)
        prov = "DERIVED:heuristic-v1" if base_p is None else "DERIVED:eta-model-v1 (+uplift prior)"
        rows.append({
            "alert_id": alert.id, "option_type": otype, "label": label, "cost_usd": cost,
            "days_saved": prior["days_saved"], "p_on_time": p,
            "expected_total_cost_usd": round(cost + (1 - p) * sla_fine, 2),
            "detail": {"provenance": prov, "tariff_source": "SOP guide v0.1-draft"},
        })
    return rows


def _delay_days(s: Shipment) -> float:
    if s.actual_delivery and s.sla_due_at:
        return (s.actual_delivery - s.sla_due_at).total_seconds() / 86400
    return 0.0


def _matches(s: Shipment, rule: SopRule) -> str | None:
    """Evaluate a rule's condition JSON; returns the trigger text or None."""
    conds = (rule.condition or {}).get("all_of", [])
    ok, bits = True, []
    for c in conds:
        if "cargo_value_usd" in c:
            if not (s.value_usd > list(c.values())[0][">"]):
                ok = False
                break
            bits.append(f"value>${list(c.values())[0]['>']:,.0f}")
        if "delay_days" in c:
            d = _delay_days(s)
            if not (d > list(c.values())[0][">"]):
                ok = False
                break
            bits.append(f"delay {d:.1f}d")
    return f"late_delivery_risk=REAL + {' + '.join(bits)} (replay)" if ok else None


def generate_alerts(db: Session, limit: int = 25) -> dict:
    """Idempotent: creates alerts + priced options for active at-risk shipments."""
    rules = [r for r in db.query(SopRule).filter(SopRule.is_active.is_(True)).all()
             if r.code in ("SOP-LOG-001", "SOP-SLA-003")]
    created = skipped = 0
    for s in active_shipments(db):
        if created >= limit:
            break
        for rule in rules:
            trigger = _matches(s, rule)
            if not trigger:
                continue
            if db.query(Alert).filter_by(shipment_id=s.id, rule_code=rule.code).one_or_none():
                skipped += 1
                continue
            a = Alert(shipment_id=s.id, rule_code=rule.code, rule_version=rule.version,
                      severity=rule.severity, status="PENDING_APPROVAL",
                      context={"ref": s.ref, "mode": s.freight_mode, "value_usd": s.value_usd,
                               "sla_due_at": s.sla_due_at.isoformat() if s.sla_due_at else None,
                               "dest_country": s.dest_country, "trigger": trigger})
            db.add(a)
            db.flush()
            for row in _options_for(db, a, s, rule):
                db.add(DecisionOption(**row))
            created += 1
            if created >= limit:
                break
    db.commit()
    total = db.query(Alert).count()
    log.info("alerts: created %d (skipped %d existing), total %d", created, skipped, total)
    return {"created": created, "skipped": skipped, "total": total}
