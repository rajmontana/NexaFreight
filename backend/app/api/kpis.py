"""KPIs computed from ingested REAL data — every figure carries provenance."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.db import get_db
from backend.app.models.entities import (
    CalibratedParam,
    Customer,
    DatacoOrder,
    DisruptionRecord,
    PortDwellPrior,
    Shipment,
    Sku,
    SopRule,
)

router = APIRouter(prefix="/api", tags=["kpis"])


def _mode_mix(db: Session) -> dict[str, int]:
    rows = (db.query(Shipment.freight_mode, func.count())
            .group_by(Shipment.freight_mode).all())
    return {mode or "UNKNOWN": int(n) for mode, n in rows}


@router.get("/kpis")
def kpis(_user: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    total = db.query(func.count(Shipment.id)).scalar() or 0
    late = db.query(func.count(Shipment.id)).filter(Shipment.was_late.is_(True)).scalar() or 0
    value = db.query(func.coalesce(func.sum(Shipment.value_usd), 0.0)).scalar() or 0.0
    loss_lines = (db.query(func.count(DatacoOrder.id))
                  .filter(DatacoOrder.profit < 0).scalar() or 0) if db.query(DatacoOrder.id).first() else 0
    all_lines = db.query(func.count(DatacoOrder.id)).scalar() or 0
    return {
        "provenance": "sections individually labeled (REAL/CALIBRATED)",
        "shipments": {"count": int(total), "total_value_usd": round(float(value), 2),
                      "on_time_pct": round(100 * (1 - late / total), 1) if total else None,
                      "late_pct": round(100 * late / total, 1) if total else None,
                      "mode_mix": _mode_mix(db), "provenance": "REAL:DataCo"},
        "orders": {"lines": int(all_lines),
                   "loss_making_lines": int(loss_lines),
                   "loss_making_pct": round(100 * loss_lines / all_lines, 1) if all_lines else None,
                   "provenance": "REAL:DataCo"},
        "master_data": {"customers": db.query(func.count(Customer.id)).scalar() or 0,
                        "skus": db.query(func.count(Sku.id)).scalar() or 0,
                        "provenance": "REAL:DataCo"},
        "calibration": {"calibrated_params": db.query(func.count(CalibratedParam.id)).scalar() or 0,
                        "dwell_priors": db.query(func.count(PortDwellPrior.id)).scalar() or 0,
                        "disruption_records": db.query(func.count(DisruptionRecord.id)).scalar() or 0,
                        "sop_rules": db.query(func.count(SopRule.id)).scalar() or 0,
                        "provenance": "REAL:UNCTAD|Verschuur|SOP-Guide"},
    }
