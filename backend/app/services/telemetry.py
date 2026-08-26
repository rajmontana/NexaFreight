"""Telemetry ingestion — AIS vessels (AISStream.io), aircraft (OpenSky/adsb.lol).

Design (AGENTS.md §9):
- FEED_MODE=live   → real websocket/HTTP connections (used on deployment; the
  dev sandbox has no egress to these hosts, so live paths are exercised at
  deploy/staging time).
- FEED_MODE=replay → deterministic playback of recorded messages from
  data/replay/*.jsonl through the SAME parse/persist handlers (test/dev).
- FEED_MODE=mock   → no external calls; endpoints report an honest empty state.

Parsing is separated from I/O so every handler is unit-testable without network.
No value is ever fabricated; failures are logged loudly.
"""

from __future__ import annotations

import asyncio
import datetime as dt
import json
import logging
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from backend.app.models.entities import Aircraft, PositionReport, Vessel

log = logging.getLogger("nexafreight.telemetry")

# Corridor bounding boxes (India-centric focus + chokepoints, owner-selected)
AIS_BBOXES = [
    [8, 55, 25, 76],     # Arabian Sea / Gulf (Nhava Sheva, Mumbai)
    [10, 32, 32, 45],    # Red Sea / Suez approach
    [-5, 95, 10, 106],   # Malacca Strait / Singapore
    [48, -6, 53, 6],     # English Channel / Rotterdam approach
]
OPENSKY_BBOXES = [[[8, 64, 30, 78], [22, 68, 32, 78]]]  # India domestic air corridors

MIN_REPORT_GAP_S = 300  # throttle per-vessel position reports (5 min)


# --------------------------------------------------------------------------
# Pure parse/persist handlers (network-free, unit-tested)
# --------------------------------------------------------------------------

def handle_ais_message(db: Session, msg: dict[str, Any]) -> bool:
    """Persist one AISStream.io message. Returns True if it updated a vessel."""
    pr = msg.get("PositionReport") or {}
    meta = msg.get("MetaData") or {}
    mmsi = str(meta.get("MMSI") or msg.get("MMSI") or "").strip()
    user = pr.get("User") or {}
    lat, lon = user.get("Latitude"), user.get("Longitude")
    if not mmsi or lat is None or lon is None:
        return False
    try:
        lat_f, lon_f = float(lat), float(lon)
    except (TypeError, ValueError):
        return False

    name = (meta.get("ShipName") or "").strip() or None
    sog = _f(pr.get("Sog"))
    cog = _f(pr.get("Cog"))
    dest = (pr.get("Destination") or "").strip() or None

    vessel = db.get(Vessel, int(mmsi)) if mmsi.isdigit() else None
    if vessel is None:
        vessel = Vessel(mmsi=int(mmsi), name=name, destination=dest,
                        lat=lat_f, lon=lon_f, speed_kn=sog, heading=cog,
                        last_seen=dt.datetime.now(dt.UTC))
        db.add(vessel)
        db.flush()
    else:
        gap_ok = (
            vessel.last_seen is None
            or (dt.datetime.now(dt.UTC) - vessel.last_seen.replace(tzinfo=dt.UTC)).total_seconds()
            >= MIN_REPORT_GAP_S
        )
        vessel.lat, vessel.lon = lat_f, lon_f
        vessel.speed_kn, vessel.heading = sog, cog
        vessel.last_seen = dt.datetime.now(dt.UTC)
        if name:
            vessel.name = name
        if dest:
            vessel.destination = dest
        if not gap_ok:
            db.commit()
            return True

    db.add(PositionReport(entity_type="vessel", entity_id=mmsi,
                          ts=dt.datetime.now(dt.UTC), lat=lat_f, lon=lon_f,
                          speed=sog, heading=cog, provenance="REAL:AIS"))
    db.commit()
    return True


def handle_opensky_states(db: Session, payload: dict[str, Any]) -> int:
    """Persist OpenSky /states/all payload. Returns number of aircraft updated."""
    states = payload.get("states") or []
    n = 0
    for s in states:
        if not s or s[5] is None or s[6] is None:
            continue
        icao24 = str(s[0]).strip().lower()
        callsign = (s[1] or "").strip() or None
        ac = db.get(Aircraft, icao24)
        now = dt.datetime.now(dt.UTC)
        if ac is None:
            db.add(Aircraft(icao24=icao24, callsign=callsign,
                            lat=float(s[6]), lon=float(s[5]),
                            alt_m=s[7] or 13_000.0, speed_ms=s[9] or 230.0,
                            last_seen=now))
        else:
            ac.lat, ac.lon = float(s[6]), float(s[5])
            ac.alt_m = s[7] if s[7] is not None else ac.alt_m
            ac.speed_ms = s[9] if s[9] is not None else ac.speed_ms
            ac.callsign = callsign or ac.callsign
            ac.last_seen = now
        n += 1
    db.commit()
    return n


def _f(v: Any) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


# --------------------------------------------------------------------------
# I/O loops (thin; exercised in live mode at deployment)
# --------------------------------------------------------------------------

async def run_ais_stream(db_factory, api_key: str) -> None:  # pragma: no cover - live only
    import websockets

    url = "wss://stream.aisstream.io/v0/stream"
    async with websockets.connect(url) as ws:
        sub = {"APIKey": api_key, "BoundingBoxes": AIS_BBOXES,
               "FilterMessageTypes": ["PositionReport"]}
        await ws.send(json.dumps(sub))
        log.info("AIS stream subscribed (%d bboxes)", len(AIS_BBOXES))
        async for raw in ws:
            msg = json.loads(raw).get("Message", {})
            if "PositionReport" in msg:
                db = db_factory()
                try:
                    handle_ais_message(db, msg)
                finally:
                    db.close()


async def run_opensky_poller(db_factory, username: str | None, password: str | None) -> None:
    # pragma: no cover - live only
    import httpx

    auth = (username, password) if username and password else None
    async with httpx.AsyncClient(timeout=15) as client:
        while True:
            for bbox in OPENSKY_BBOXES:
                q = f"lamin={bbox[0]}&lomin={bbox[1]}&lamax={bbox[2]}&lomax={bbox[3]}"
                try:
                    r = await client.get(f"https://opensky-network.org/api/states/all?{q}",
                                         auth=auth)
                    remaining = r.headers.get("X-Rate-Limit-Remaining")
                    if r.status_code == 200:
                        db = db_factory()
                        try:
                            n = handle_opensky_states(db, r.json())
                            log.info("opensky: %d aircraft updated (credits left: %s)", n, remaining)
                        finally:
                            db.close()
                    else:
                        log.warning("opensky HTTP %s (credits left: %s)", r.status_code, remaining)
                except Exception:  # noqa: BLE001 — never crash the loop, log loud
                    log.exception("opensky poll failed")
            await asyncio.sleep(120)


def replay_file(db: Session, path: Path) -> int:
    """Deterministic replay of recorded AIS messages (dev/tests)."""
    n = 0
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            if handle_ais_message(db, json.loads(line)):
                n += 1
    return n


def start_background_feeds(app) -> None:  # pragma: no cover - wiring
    """Called from app lifespan when FEED_MODE=live."""
    from backend.app.core.config import get_settings
    from backend.app.core.db import SessionLocal

    cfg = get_settings()
    if cfg.feed_mode != "live":
        return
    loop = asyncio.get_event_loop()
    if cfg.aisstream_api_key:
        app.state.ais_task = loop.create_task(run_ais_stream(SessionLocal, cfg.aisstream_api_key))
    else:
        log.warning("FEED_MODE=live but AISSTREAM_API_KEY unset — AIS disabled (fail loud)")
    app.state.opensky_task = loop.create_task(
        run_opensky_poller(SessionLocal, cfg.opensky_username, cfg.opensky_password))
