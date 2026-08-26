"""Alert Inbox API — list, detail, decide (human-in-the-loop, rule §9.4)."""

from __future__ import annotations

import datetime as dt
import math
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.db import get_db
from backend.app.models.entities import (
    Alert,
    Decision,
    DecisionOption,
    DisruptionRecord,
    EventLog,
    Port,
    Shipment,
    Vessel,
)
from backend.app.services import alert_engine

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("")
def list_alerts(status: str | None = None, severity: str | None = None,
                _u: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    q = db.query(Alert).order_by(Alert.severity.desc(), Alert.detected_at.desc())
    if status:
        q = q.filter(Alert.status == status.upper())
    if severity:
        q = q.filter(Alert.severity == severity.upper())
    rows = q.limit(100).all()
    out = []
    for a in rows:
        s = db.get(Shipment, a.shipment_id)
        n_options = db.query(DecisionOption).filter_by(alert_id=a.id).count()
        decision = (db.query(Decision).filter_by(alert_id=a.id)
                    .order_by(Decision.decided_at.desc()).first())
        out.append({"id": a.id, "rule_code": a.rule_code, "rule_version": a.rule_version,
                    "severity": a.severity, "status": a.status,
                    "detected_at": a.detected_at.isoformat(),
                    "shipment_ref": s.ref if s else None, "mode": s.freight_mode if s else None,
                    "value_usd": s.value_usd if s else None,
                    "dest_country": s.dest_country if s else None,
                    "options": n_options, "decided": bool(decision),
                    "provenance": a.provenance})
    return {"total": len(out), "replay_window_days": alert_engine.REPLAY_WINDOW_DAYS,
            "provenance": "DERIVED:replay-window", "data": out}


@router.get("/{alert_id}")
def alert_detail(alert_id: int, _u: dict = Depends(get_current_user),
                 db: Session = Depends(get_db)) -> dict[str, Any]:
    a = db.get(Alert, alert_id)
    if not a:
        raise HTTPException(404, "alert not found")
    s = db.get(Shipment, a.shipment_id)
    opts = db.query(DecisionOption).filter_by(alert_id=a.id).order_by(
        DecisionOption.expected_total_cost_usd).all()
    decisions = db.query(Decision).filter_by(alert_id=a.id).all()
    return {
        "id": a.id, "rule_code": a.rule_code, "rule_version": a.rule_version,
        "severity": a.severity, "status": a.status, "context": a.context,
        "provenance": a.provenance,
        "shipment": ({k: (v.isoformat() if isinstance(v, dt.datetime) else v)
                      for k, v in {"ref": s.ref, "mode": s.freight_mode, "value_usd": s.value_usd,
                                   "sla_due_at": s.sla_due_at, "dest_country": s.dest_country,
                                   "dest_city": s.dest_city, "was_late": s.was_late}.items()}
                     if s else None),
        "options": [{"id": o.id, "option_type": o.option_type, "label": o.label,
                     "cost_usd": o.cost_usd, "days_saved": o.days_saved,
                     "p_on_time": o.p_on_time, "expected_total_cost_usd": o.expected_total_cost_usd,
                     "detail": o.detail} for o in opts],
        "decisions": [{"action": d.action, "by": d.decided_by, "at": d.decided_at.isoformat(),
                       "reason": d.reason, "option_id": d.option_id} for d in decisions],
    }


class DecideRequest(BaseModel):
    action: str            # APPROVED | REJECTED | MODIFIED
    option_id: int | None = None
    reason: str


@router.post("/{alert_id}/decide")
def decide(alert_id: int, req: DecideRequest,
           user: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    a = db.get(Alert, alert_id)
    if not a:
        raise HTTPException(404, "alert not found")
    if a.status == "DECIDED":
        raise HTTPException(409, "alert already decided (immutable audit trail)")
    if req.action not in ("APPROVED", "REJECTED", "MODIFIED"):
        raise HTTPException(422, "action must be APPROVED|REJECTED|MODIFIED")
    if len(req.reason.strip()) < 3:
        raise HTTPException(422, "a decision reason is mandatory (audit rule)")

    option = None
    if req.option_id:
        option = db.get(DecisionOption, req.option_id)
        if not option or option.alert_id != a.id:
            raise HTTPException(422, "invalid option for this alert")
        # Authority check: option cost vs the DECIDER's approval limit (JWT claim)
        limit = float(user.get("approval_limit_usd") or 0)
        if req.action != "REJECTED" and option.cost_usd > limit:
            raise HTTPException(403, f"cost ${option.cost_usd:,.0f} exceeds your "
                                     f"${limit:,.0f} authority — escalate to a higher role")

    d = Decision(alert_id=a.id, option_id=req.option_id, action=req.action,
                 decided_by=user.get("sub", "unknown"), reason=req.reason.strip())
    db.add(d)
    a.status = "DECIDED"
    db.add(EventLog(entity_type="alert", entity_id=a.id,
                    event_type=f"DECISION_{req.action}",
                    payload={"by": d.decided_by, "option": option.option_type if option else None,
                             "cost_usd": option.cost_usd if option else None},
                    provenance="DERIVED:decision-log"))
    db.commit()
    return {"ok": True, "alert": a.id, "action": req.action,
            "decided_by": d.decided_by, "option": option.option_type if option else None}


@router.post("/generate")
def generate(_u: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    return alert_engine.generate_alerts(db)


@router.get("/disruptions/library", tags=["analytics"])
def disruptions_library(_u: dict = Depends(get_current_user),
                        db: Session = Depends(get_db)) -> dict[str, Any]:
    """Top historical port disruptions (Verschuur et al., REAL records)."""
    rows = (db.query(DisruptionRecord)
            .filter(DisruptionRecord.total_affected_days.isnot(None))
            .order_by(DisruptionRecord.total_affected_days.desc()).limit(12).all())
    return {"total_records": db.query(DisruptionRecord).count(),
            "provenance": "REAL:Verschuur-TRD",
            "data": [{"event": r.event, "port": r.port_name, "country": r.country,
                      "year": r.year, "total_affected_days": r.total_affected_days,
                      "severity": r.severity, "source": r.source} for r in rows]}



# ---- congestion (Phase 2 completion): derived from live AIS when connected ----
@router.get("/congestion/ports", tags=["telemetry"])
def port_congestion(_u: dict = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> dict[str, Any]:
    ports = db.query(Port).filter(Port.name.in_(
        ["NHAVA SHEVA", "CHENNAI", "ROTTERDAM", "SINGAPORE", "JEBEL ALI"])).all()
    vessels = db.query(Vessel).all()
    data = []
    for p in ports:
        anchored = sum(1 for v in vessels
                       if v.lat is not None and v.lon is not None
                       and (v.speed_kn or 99) < 1.0
                       and math.hypot(v.lat - p.lat, v.lon - p.lon) < 0.75)  # ~<=80km box
        data.append({"port": p.name, "country": p.country_code,
                     "vessels_anchored": anchored,
                     "index": min(100, anchored * 4),
                     "source": "DERIVED:AIS-anchorage-count" if vessels else "EMPTY:no-feed"})
    return {"data": data,
            "note": "honest empty until FEED_MODE=live streams vessels" if not vessels else ""}
