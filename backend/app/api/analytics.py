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


@router.get("/spc")
def spc_series(_u: dict = Depends(get_current_user),
               db: Session = Depends(get_db)) -> dict[str, Any]:
    """Weekly fleet mean transit days, last 26 weeks, with 3-sigma limits (REAL)."""

    ships = (db.query(Shipment.actual_delivery, Shipment.planned_ship_date)
             .filter(Shipment.actual_delivery.isnot(None),
                     Shipment.planned_ship_date.isnot(None)).all())
    weeks: dict[str, list[float]] = {}
    for actual, planned in ships:
        d = (actual - planned).total_seconds() / 86400
        if -1 <= d <= 30:
            wk = actual.strftime("%G-W%V")  # ISO week
            weeks.setdefault(wk, []).append(d)
    items = sorted(weeks.items())[-26:]
    vals = [round(sum(v) / len(v), 2) for _, v in items]
    mean = round(sum(vals) / max(len(vals), 1), 2)
    import math

    var = sum((x - mean) ** 2 for x in vals) / max(len(vals) - 1, 1)
    sigma = round(math.sqrt(var), 2)
    return {"labels": [k for k, _ in items], "values": vals,
            "cl": mean, "ucl": round(mean + 3 * sigma, 2), "lcl": round(max(mean - 3 * sigma, 0), 2),
            "provenance": "REAL:DataCo"}


@router.get("/forecast")
def forecast_series(_u: dict = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> dict[str, Any]:
    """Weekly order history (tail), 12-week projection, and honest backtest scores."""
    from backend.app.ml import demand_forecast as dfm
    from backend.app.models.entities import ModelRun

    y = dfm.weekly_series(db)
    if len(y) < 104:
        return {"available": False, "provenance": "EMPTY:HONEST",
                "note": "not enough history to forecast"}
    labels_raw = list(y.index[-26:])
    y = y.reset_index(drop=True)  # positional index for seasonal math
    horizon = dfm._forecast(y, 12, 52)
    run = (db.query(ModelRun).filter_by(model="demand_forecast")
           .order_by(ModelRun.trained_at.desc()).first())
    labels = labels_raw
    return {"available": True,
            "history_labels": labels, "history_values": [round(float(v), 1) for v in y.tail(26).tolist()],
            "forecast_labels": [f"+{i}w" for i in range(1, 13)], "forecast_values": horizon,
            "scores": run.metrics if run else None,
            "provenance": "REAL history + PROJECTED:seasonal-v1"}
