"""Live telemetry status + vessel/aircraft positions for the map."""

from __future__ import annotations

import datetime as dt
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.config import get_settings
from backend.app.core.db import get_db
from backend.app.models.entities import Aircraft, Vessel

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])

STALE_AFTER_MIN = 30


@router.get("/live")
def live(_user: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    cfg = get_settings()
    vessels = db.query(Vessel).order_by(Vessel.last_seen.desc()).limit(500).all()
    aircraft = db.query(Aircraft).order_by(Aircraft.last_seen.desc()).limit(500).all()
    cutoff = dt.datetime.now(dt.UTC).replace(tzinfo=None) - dt.timedelta(minutes=STALE_AFTER_MIN)
    fresh_v = [v for v in vessels if v.last_seen and v.last_seen > cutoff]
    fresh_a = [a for a in aircraft if a.last_seen and a.last_seen > cutoff]
    return {
        "feed": {
            "mode": cfg.feed_mode,
            "connected": cfg.feed_mode == "live",
            "note": ("LIVE — AIS stream running" if cfg.feed_mode == "live" and cfg.aisstream_api_key
                     else "FEED_MODE=live but AISSTREAM_API_KEY is NOT SET — add it in Render Environment"
                     if cfg.feed_mode == "live"
                     else "replay mode — deterministic playback" if cfg.feed_mode == "replay"
                     else "no external feed connected — honest empty state"),
            "ais_key_present": bool(cfg.aisstream_api_key),
            "opensky_auth_present": bool(cfg.opensky_username),
        },
        "vessels": [{"mmsi": v.mmsi, "name": v.name, "lat": v.lat, "lon": v.lon,
                     "speed_kn": v.speed_kn, "destination": v.destination,
                     "last_seen": v.last_seen.isoformat() if v.last_seen else None}
                    for v in fresh_v],
        "aircraft": [{"icao24": a.icao24, "callsign": a.callsign, "lat": a.lat, "lon": a.lon,
                      "alt_m": a.alt_m, "speed_ms": a.speed_ms,
                      "last_seen": a.last_seen.isoformat() if a.last_seen else None}
                     for a in fresh_a],
        "provenance": "REAL:AIS|REAL:ADS-B" if cfg.feed_mode == "live" else "EMPTY:HONEST",
    }
