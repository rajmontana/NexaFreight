"""SOP rulebook seed — versioned data from the team's Business SOP Research Guide.

All rules carry version '0.1-draft' (owner directive: values subject to ongoing
real-world SOP research; changing them later is a data edit, never code).
"""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from backend.app.models.entities import SopRule

log = logging.getLogger(__name__)

RULES = [
    dict(code="SOP-LOG-001", category="sla", severity="CRITICAL",
         condition={"all_of": [{"ml_late_risk_pct": {">": 70}},
                               {"delay_days": {">": 2.0}},
                               {"cargo_value_usd": {">": 50000}}]},
         action_template=("Divert to secondary feeder port (cost ~$2,500 + $300/d) OR partial air "
                          "expedite of urgent lines (~$12,500); recovers 3-4d, avoids ~$20k SLA penalty"),
         authority_role="manager"),
    dict(code="SOP-DEM-001", category="demurrage", severity="WARN",
         condition={"all_of": [{"dwell_days": {">=": 4}}, {"mode": "OCEAN"}]},
         action_template="Container approaching end of ocean dry free time (5d): trigger priority gate-out",
         authority_role="dispatcher"),
    dict(code="SOP-DEM-002", category="demurrage", severity="CRITICAL",
         condition={"all_of": [{"hours_to_last_free_day": {"<=": 24}}]},
         action_template="Last free day within 24h: priority customs gate-out or drayage to bonded CFS",
         authority_role="dispatcher"),
    dict(code="SOP-SLA-002", category="sla", severity="CRITICAL",
         condition={"all_of": [{"p_on_time": {"<": 0.5}}, {"customer_tier": "A"}]},
         action_template="Tier-A contractual order at breach risk: evaluate modal shift; cost cap per matrix",
         authority_role="manager"),
    dict(code="SOP-SLA-003", category="sla", severity="CRITICAL",
         condition={"all_of": [{"delay_days": {">": 2}}, {"late_delivery_risk": True}]},
         action_template=("Replay-scale SLA trigger (order-level): breach with >2d delay — evaluate "
                          "expedite/reroute options; authority per escalation matrix"),
         authority_role="manager"),
    dict(code="SOP-FIN-001", category="finance", severity="CRITICAL",
         condition={"all_of": [{"total_exposure_usd": {">": 25000}}]},
         action_template="Financial exposure above $25k requires Regional Director approval",
         authority_role="director"),
    dict(code="SOP-ENV-001", category="environment", severity="CRITICAL",
         condition={"any_of": [{"wave_height_m": {">=": 5.0}},
                               {"cold_chain_temp_c": {">": 10.0}}]},
         action_template="Storm/severe swell or cold-chain excursion >4h: spoilage-claim protocol + reroute eval",
         authority_role="manager"),
]


def seed(db: Session) -> int:
    existing = {r.code for r in db.query(SopRule.code).all()}
    added = 0
    for r in RULES:
        if r["code"] in existing:
            continue
        db.add(SopRule(version="0.1-draft", reference_doc="Business_SOP_Research_Guide_TeamMember4.pdf",
                       **r))
        added += 1
    db.commit()
    total = db.query(SopRule).count()
    log.info("SOP rules: added %d, total %d", added, total)
    return total
