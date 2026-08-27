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
    rows = (db.query(Shipment.freight_mode,
                     func.avg(func.julianday(Shipment.actual_delivery) -
                               func.julianday(Shipment.planned_ship_date)),
                     func.count())
            .filter(Shipment.actual_delivery.isnot(None),
                    Shipment.planned_ship_date.isnot(None))
            .group_by(Shipment.freight_mode).all())
    spc = [{"mode": m, "mean_days": round(float(a or 0), 2), "n": int(n)} for m, a, n in rows]

    # Late-rate by destination country (top 10 by volume, REAL)
    total_by = dict(db.query(Shipment.dest_country, func.count()).group_by(Shipment.dest_country).all())
    late_by = dict(db.query(Shipment.dest_country, func.count())
                   .filter(Shipment.was_late.is_(True)).group_by(Shipment.dest_country).all())
    countries = [{"country": c, "shipments": n, "late_pct": round(100 * late_by.get(c, 0) / n, 1)}
                 for c, n in sorted(total_by.items(), key=lambda kv: -kv[1])[:10]]
    return {"lead_time_spc": spc, "late_by_country": countries,
            "provenance": "REAL:DataCo"}
