"""Shipment visibility endpoints — REAL data with provenance labels."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.db import get_db
from backend.app.models.entities import EventLog, Leg, Shipment, ShipmentLine, Sku

router = APIRouter(prefix="/api/shipments", tags=["shipments"])


@router.get("")
def list_shipments(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=200),
    mode: str | None = None,
    late: bool | None = None,
    search: str | None = None,
    _user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    q = db.query(Shipment)
    if mode:
        q = q.filter(Shipment.freight_mode == mode.upper())
    if late is not None:
        q = q.filter(Shipment.was_late.is_(late))
    if search:
        like = f"%{search}%"
        q = q.filter(or_(Shipment.ref.ilike(like), Shipment.dest_country.ilike(like),
                         Shipment.dest_city.ilike(like)))
    total = q.count()
    rows = (q.order_by(Shipment.id)
            .offset((page - 1) * limit).limit(limit).all())
    return {
        "total": total, "page": page, "limit": limit,
        "provenance": "REAL:DataCo",
        "data": [{
            "ref": s.ref, "freight_mode": s.freight_mode, "status": s.status,
            "value_usd": round(s.value_usd, 2), "dest_city": s.dest_city,
            "dest_country": s.dest_country, "was_late": s.was_late,
            "sla_due_at": s.sla_due_at.isoformat() if s.sla_due_at else None,
            "actual_delivery": s.actual_delivery.isoformat() if s.actual_delivery else None,
        } for s in rows],
    }


@router.get("/{ref}")
def shipment_detail(ref: str, _user: dict = Depends(get_current_user),
                    db: Session = Depends(get_db)) -> dict[str, Any]:
    s = db.query(Shipment).filter(Shipment.ref == ref).one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail=f"shipment {ref} not found")
    lines = (db.query(ShipmentLine, Sku.name)
             .join(Sku, Sku.id == ShipmentLine.sku_id)
             .filter(ShipmentLine.shipment_id == s.id).all())
    events = (db.query(EventLog)
              .filter(EventLog.entity_type == "shipment", EventLog.entity_id == s.id)
              .order_by(EventLog.ts).all())
    legs = db.query(Leg).filter(Leg.shipment_id == s.id).order_by(Leg.seq).all()
    return {
        "ref": s.ref, "freight_mode": s.freight_mode, "status": s.status,
        "value_usd": round(s.value_usd, 2), "was_late": s.was_late,
        "destination": {"city": s.dest_city, "country": s.dest_country, "region": s.dest_region,
                        "lat": s.dest_lat, "lon": s.dest_lon},
        "sla_due_at": s.sla_due_at.isoformat() if s.sla_due_at else None,
        "actual_delivery": s.actual_delivery.isoformat() if s.actual_delivery else None,
        "order_date": s.order_date.isoformat() if s.order_date else None,
        "lines": [{"sku": name, "qty": ln.qty, "unit_price": ln.unit_price,
                   "line_value": ln.line_value, "provenance": ln.provenance} for ln, name in lines],
        "legs": [{"seq": lg.seq, "mode": lg.mode, "origin": lg.origin,
                  "destination": lg.destination, "status": lg.status} for lg in legs],
        "timeline": [{"event": e.event_type, "ts": e.ts.isoformat(), "provenance": e.provenance}
                     for e in events],
        "provenance": "REAL:DataCo",
    }
