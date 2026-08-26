"""Lane geometry for the live map — real ports/airports, DERIVED geometry."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.db import get_db
from backend.app.models.entities import Lane, Port

router = APIRouter(prefix="/api/lanes", tags=["lanes"])


@router.get("")
def list_lanes(_user: dict = Depends(get_current_user),
               db: Session = Depends(get_db)) -> dict[str, Any]:
    lanes = db.query(Lane).order_by(Lane.mode, Lane.lane_key).all()
    return {"total": len(lanes), "provenance": "DERIVED:searoute|great-circle",
            "data": [{"lane_key": ln.lane_key, "mode": ln.mode,
                      "origin": ln.origin_name, "destination": ln.dest_name,
                      "distance_km": ln.distance_km,
                      "geojson": {"type": "Feature",
                                  "geometry": (ln.geojson or {}).get("geometry", ln.geojson)},
                      "source": ln.source_citation} for ln in lanes]}


@router.get("/ports")
def list_ports(_user: dict = Depends(get_current_user),
               db: Session = Depends(get_db)) -> dict[str, Any]:
    ports = db.query(Port).order_by(Port.name).all()
    return {"total": len(ports), "provenance": "REAL:NGA-WPI-Pub150",
            "data": [{"name": p.name, "country": p.country_code, "lat": p.lat,
                      "lon": p.lon, "locode": p.locode} for p in ports]}
