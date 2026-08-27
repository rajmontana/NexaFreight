"""Analytics — lane lead-time SPC (X-bar, 3-sigma) + late-rate by country (REAL)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.db import get_db
from backend.app.models.entities import Shipment

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("")
def analytics(_u: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    # Lead-time SPC by mode (REAL transit days)
    ships = (db.query(Shipment.freight_mode, Shipment.actual_delivery, Shipment.planned_ship_date)
             .filter(Shipment.actual_delivery.isnot(None),
                     Shipment.planned_ship_date.isnot(None)).all())
    acc = {}
    for mode, actual, planned in ships:
        d = (actual - planned).total_seconds() / 86400
        if -1 <= d <= 30:
            acc.setdefault(mode, []).append(d)
    spc = [{"mode": m, "mean_days": round(sum(v) / len(v), 2), "n": len(v)}
           for m, v in sorted(acc.items())]

    # Late-rate by destination country (top 10 by volume, REAL)
    total_by = dict(db.query(Shipment.dest_country, func.count()).group_by(Shipment.dest_country).all())
    late_by = dict(db.query(Shipment.dest_country, func.count())
                   .filter(Shipment.was_late.is_(True)).group_by(Shipment.dest_country).all())
    countries = [{"country": c, "shipments": n, "late_pct": round(100 * late_by.get(c, 0) / n, 1)}
                 for c, n in sorted(total_by.items(), key=lambda kv: -kv[1])[:10]]
    return {"lead_time_spc": spc, "late_by_country": countries,
            "provenance": "REAL:DataCo"}
