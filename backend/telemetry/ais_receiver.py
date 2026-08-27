"""
SmartTrack™ Live AIS Maritime Telemetry Engine
==============================================
Two mutually-exclusive workers, guarded so double-start is a no-op:

1. LIVE MODE (AISstream.io WebSocket, requires AISSTREAM_API_KEY)
     Subscribes to PositionReport + ShipStaticData over the trade-lane
     bounding boxes the control tower tracks (Indian Ocean, Suez,
     Malacca, N-Europe, Trans-Pacific). Auto-reconnects with
     exponential backoff. Every message mutates LIVE_VESSELS.

2. DEAD-RECKONING SIMULATOR (no key / stream unreachable)
     Advances the seeded corridor fleet along its heading at the
     reported speed every DRIFT_TICK_SECONDS so the radar visibly
     breathes exactly like a live satellite feed. Status is reported
     truthfully as ``simulated``.
"""

import json
import math
import threading
import time
from typing import Any, Dict, List, Optional

# ----------------------------------------------------------------------
# In-memory vessel store (thread-safe)
# ----------------------------------------------------------------------
LIVE_VESSELS: Dict[int, Dict[str, Any]] = {}
_STORE_LOCK = threading.Lock()

AIS_STREAM_STATUS: Dict[str, Any] = {
    "mode": "boot",                 # boot | live | simulated
    "connected": False,
    "total_messages": 0,
    "position_reports": 0,
    "last_message_at": None,
    "last_updated": None,
    "source": "AISstream.io",
}

_STARTED = False
_DRIFT_TICK_SECONDS = 4.0

AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream"

# Trade-lane watch boxes: [[south, west], [north, east]] (lat/lon degrees)
WATCH_BOUNDING_BOXES = [
    [[-15.0, 30.0], [30.0, 120.0]],   # Indian Ocean + Arabian Sea + Bay of Bengal
    [[10.0, 30.0], [35.0, 60.0]],     # Red Sea / Gulf of Aden / Suez approach
    [[0.0, 90.0], [15.0, 115.0]],     # Malacca Strait & Singapore anchorages
    [[35.0, -10.0], [65.0, 30.0]],    # North & West Europe (Rotterdam/Genoa)
    [[20.0, -130.0], [40.0, -110.0]], # US West Coast (Los Angeles approach)
]


# ----------------------------------------------------------------------
# Seed corridor fleet (also doubles as pre-warm cache while a live
# stream establishes its first fix burst)
# ----------------------------------------------------------------------
DEFAULT_CORRIDOR_SHIPS = [
    {"mmsi": 244670000, "name": "CMA CGM MARCO POLO", "vessel_type": "Ultra Large Container Vessel (ULCV)",
     "latitude": 43.55, "longitude": -9.48, "speed_knots": 18.4, "heading_deg": 32,
     "destination": "PORT OF ROTTERDAM", "eta": "2026-08-29 14:00",
     "transit_modality": "🚢 Ocean TEU Container", "status": "Underway Using Engine"},
    {"mmsi": 419000123, "name": "MSC GULSUN", "vessel_type": "23,000 TEU Container Ship",
     "latitude": 15.12, "longitude": 61.85, "speed_knots": 19.1, "heading_deg": 242,
     "destination": "JNPT NAVI MUMBAI", "eta": "2026-08-31 06:30",
     "transit_modality": "🚢 Ocean TEU Container", "status": "Underway Using Engine"},
    {"mmsi": 563000456, "name": "EVER GIVEN", "vessel_type": "20,000 TEU Container Ship",
     "latitude": 4.62, "longitude": 100.12, "speed_knots": 16.8, "heading_deg": 128,
     "destination": "SINGAPORE PSA", "eta": "2026-08-28 18:00",
     "transit_modality": "🚢 Ocean TEU Container", "status": "Underway Using Engine"},
    {"mmsi": 311000789, "name": "MAERSK MC-KINNEY MOLLER", "vessel_type": "Triple-E Container Ship",
     "latitude": 20.05, "longitude": 38.52, "speed_knots": 11.2, "heading_deg": 338,
     "destination": "SUEZ CANAL TRANSIT", "eta": "2026-08-28 22:00",
     "transit_modality": "🚢 Ocean TEU Container", "status": "Transiting Canal"},
    {"mmsi": 636019825, "name": "OOCL SPAIN", "vessel_type": "24,188 TEU Container Ship",
     "latitude": 12.41, "longitude": 45.15, "speed_knots": 17.6, "heading_deg": 285,
     "destination": "BAB-EL-MANDEB STRAIT", "eta": "2026-08-27 20:15",
     "transit_modality": "🚢 Ocean TEU Container", "status": "Underway Using Engine"},
    {"mmsi": 477234500, "name": "COSCO SHIPPING UNIVERSE", "vessel_type": "21,000 TEU Container Ship",
     "latitude": 33.86, "longitude": -121.4, "speed_knots": 15.9, "heading_deg": 78,
     "destination": "PORT OF LOS ANGELES", "eta": "2026-08-30 09:45",
     "transit_modality": "🚢 Ocean TEU Container", "status": "Underway Using Engine"},
    {"mmsi": 538090442, "name": "OCEAN NETWORK EXPRESS SWAN", "vessel_type": "14,000 TEU Container Ship",
     "latitude": 1.19, "longitude": 103.64, "speed_knots": 0.4, "heading_deg": 90,
     "destination": "SINGAPORE ANCHORAGE", "eta": "Moored",
     "transit_modality": "🚢 Ocean TEU Container", "status": "At Anchor (Berth Window Pending)"},
    {"mmsi": 235118549, "name": "HAPAG-LLOYD AL JASRAH", "vessel_type": "14,993 TEU Container Ship",
     "latitude": 50.62, "longitude": -0.82, "speed_knots": 14.8, "heading_deg": 62,
     "destination": "PORT OF ROTTERDAM", "eta": "2026-08-27 11:30",
     "transit_modality": "🚢 Ocean TEU Container", "status": "Underway Using Engine"},
]

for _s in DEFAULT_CORRIDOR_SHIPS:
    _s = dict(_s)
    _s["simulated"] = True
    LIVE_VESSELS[_s["mmsi"]] = _s


# ----------------------------------------------------------------------
# LIVE MODE: AISstream.io websocket worker
# ----------------------------------------------------------------------
def _handle_position_report(meta: Dict[str, Any], report: Dict[str, Any]) -> None:
    mmsi = int(meta.get("MMSI") or report.get("UserID") or 0)
    if not mmsi or report.get("Latitude") is None or report.get("Longitude") is None:
        return
    with _STORE_LOCK:
        v = LIVE_VESSELS.get(mmsi, {})
        v.update({
            "mmsi": mmsi,
            "name": v.get("name") or meta.get("ShipName") or f"VESSEL {mmsi}",
            "vessel_type": v.get("vessel_type") or "Cargo / Container Vessel",
            "latitude": round(float(report["Latitude"]), 5),
            "longitude": round(float(report["Longitude"]), 5),
            "speed_knots": round(float(report.get("Sog") or 0.0), 1),
            "heading_deg": int(report.get("TrueHeading", 511) if report.get("TrueHeading", 511) != 511
                               else round(float(report.get("Cog") or 0.0))),
            "destination": v.get("destination") or "UNREPORTED",
            "eta": v.get("eta") or "Pending",
            "transit_modality": "🚢 Ocean TEU Container",
            "status": v.get("status") or "Underway Using Engine",
            "simulated": False,
            "last_fix": time.time(),
        })
        LIVE_VESSELS[mmsi] = v
    AIS_STREAM_STATUS["position_reports"] += 1


def _handle_static_data(meta: Dict[str, Any], report: Dict[str, Any]) -> None:
    mmsi = int(meta.get("MMSI") or report.get("UserID") or 0)
    if not mmsi:
        return
    dim = report.get("Dimension") or {}
    ship_type = report.get("ShipType")
    with _STORE_LOCK:
        v = LIVE_VESSELS.get(mmsi, {})
        if v:
            v["name"] = (meta.get("ShipName") or v.get("name") or f"VESSEL {mmsi}").strip()
            dest = report.get("Destination")
            if dest and str(dest).strip():
                v["destination"] = str(dest).strip().upper()
            if ship_type and 70 <= int(ship_type) <= 79:
                v["vessel_type"] = f"Cargo Vessel ({dim.get('A', 0) + dim.get('B', 0)}m LOA)"
            v["simulated"] = False
            LIVE_VESSELS[mmsi] = v


def _live_stream_worker(api_key: str) -> None:
    """Runs forever; reconnects with exponential backoff on every failure."""
    import websocket  # websocket-client (added to requirements.txt)

    backoff = 2.0
    while True:
        ws = None
        try:
            AIS_STREAM_STATUS["connected"] = False
            ws = websocket.create_connection(AISSTREAM_URL, timeout=30)
            ws.send(json.dumps({
                "APIKey": api_key,
                "BoundingBoxes": WATCH_BOUNDING_BOXES,
                "FilterMessageTypes": ["PositionReport", "ShipStaticData"],
            }))
            AIS_STREAM_STATUS.update({"connected": True, "mode": "live"})
            print("[OK] AISstream.io live satellite feed connected")
            backoff = 2.0

            while True:
                raw = ws.recv()
                if not raw:
                    raise ConnectionError("empty frame")
                msg = json.loads(raw)
                if "error" in str(msg).lower()[:200] and "MessageType" not in msg:
                    raise ConnectionError(str(msg)[:120])
                mtype = msg.get("MessageType")
                body = msg.get("Message", {})
                meta = msg.get("MetaData", {})
                payload = body.get(mtype, {}) if isinstance(body, dict) else {}
                if mtype == "PositionReport":
                    _handle_position_report(meta, payload)
                elif mtype == "ShipStaticData":
                    _handle_static_data(meta, payload)
                AIS_STREAM_STATUS["total_messages"] += 1
                AIS_STREAM_STATUS["last_message_at"] = time.time()
                AIS_STREAM_STATUS["last_updated"] = time.time()
        except Exception as err:
            print(f"[WARN] AISstream.io feed interrupted ({err}); reconnecting in {backoff:.0f}s")
            AIS_STREAM_STATUS["connected"] = False
            time.sleep(backoff)
            backoff = min(backoff * 2, 60.0)
        finally:
            try:
                if ws is not None:
                    ws.close()
            except Exception:
                pass


# ----------------------------------------------------------------------
# DEAD-RECKONING SIMULATOR (fallback when no live key / stream)
# ----------------------------------------------------------------------
def _drift_worker() -> None:
    """Advance each seed vessel along its heading at its reported SOG."""
    import random
    rng = random.Random(20260827)
    while True:
        now = time.time()
        with _STORE_LOCK:
            for mmsi, v in LIVE_VESSELS.items():
                if not v.get("simulated", True):
                    continue  # never overwrite real AIS fixes
                sog = float(v.get("speed_knots") or 0.0)
                lat, lon = float(v["latitude"]), float(v["longitude"])
                if sog > 1.0:
                    # 1 nm = 1/60° lat; longitude scaled by cos(lat)
                    nm = sog * (_DRIFT_TICK_SECONDS / 3600.0)
                    hdg = math.radians(float(v.get("heading_deg") or 0.0))
                    d_lat = (nm * math.cos(hdg)) / 60.0
                    d_lon = (nm * math.sin(hdg)) / (60.0 * max(0.25, math.cos(math.radians(lat))))
                    v["latitude"] = round(lat + d_lat + rng.uniform(-0.002, 0.002), 5)
                    v["longitude"] = round(lon + d_lon + rng.uniform(-0.002, 0.002), 5)
                    # Gentle heading wander keeps motion organic
                    v["heading_deg"] = max(0, min(359, int(v.get("heading_deg", 0) + rng.randint(-2, 2))))
                else:
                    # Anchored: tiny current drift only
                    v["latitude"] = round(lat + rng.uniform(-0.0015, 0.0015), 5)
                    v["longitude"] = round(lon + rng.uniform(-0.0015, 0.0015), 5)
        AIS_STREAM_STATUS["total_messages"] += len(LIVE_VESSELS)
        AIS_STREAM_STATUS["last_updated"] = now
        AIS_STREAM_STATUS["mode"] = "simulated"
        time.sleep(_DRIFT_TICK_SECONDS)


# ----------------------------------------------------------------------
# PUBLIC API
# ----------------------------------------------------------------------
def start_ais_background_stream(api_key: str) -> Optional[threading.Thread]:
    """Idempotent bootstrap: live websocket when keyed, simulator otherwise."""
    global _STARTED
    if _STARTED:
        return None
    _STARTED = True

    AIS_STREAM_STATUS["last_updated"] = time.time()
    AIS_STREAM_STATUS["total_messages"] = len(LIVE_VESSELS)

    api_key = (api_key or "").strip()
    if api_key:
        try:
            import websocket  # noqa: F401  (fail fast if dependency missing)
            t = threading.Thread(target=_live_stream_worker, args=(api_key,), daemon=True, name="ais-live-stream")
            t.start()
            return t
        except Exception as err:
            print(f"[WARN] AIS live stream unavailable ({err}); falling back to dead-reckoning simulator")

    AIS_STREAM_STATUS["mode"] = "simulated"
    AIS_STREAM_STATUS["connected"] = True  # simulator is always "connected"
    t = threading.Thread(target=_drift_worker, daemon=True, name="ais-drift-simulator")
    t.start()
    print("[OK] AIS dead-reckoning vessel drift simulator online (set AISSTREAM_API_KEY for live satellite feed)")
    return t


def get_active_vessels() -> List[Dict[str, Any]]:
    with _STORE_LOCK:
        vessels = [dict(v) for v in LIVE_VESSELS.values()]
    return sorted(vessels, key=lambda v: str(v.get("name", "")))


def get_ais_status() -> Dict[str, Any]:
    live_count = 0
    with _STORE_LOCK:
        snapshot = list(LIVE_VESSELS.values())
    for v in snapshot:
        if not v.get("simulated", True):
            live_count += 1
    return {
        "status": "online",
        "mode": AIS_STREAM_STATUS["mode"],
        "simulated": AIS_STREAM_STATUS["mode"] != "live",
        "active_vessels_tracked": len(LIVE_VESSELS),
        "live_satellite_fixes": live_count,
        "total_ais_messages_received": AIS_STREAM_STATUS["total_messages"],
        "position_reports": AIS_STREAM_STATUS["position_reports"],
        "stream_connected": AIS_STREAM_STATUS["connected"],
        "last_updated": AIS_STREAM_STATUS["last_updated"],
        "source": AIS_STREAM_STATUS["source"],
    }
