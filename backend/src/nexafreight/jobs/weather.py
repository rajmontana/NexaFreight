"""Open-Meteo port-weather watch: store only threshold breaches."""
from __future__ import annotations

import asyncio
import zlib
from datetime import UTC, datetime

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from nexafreight.jobs.http import get_json
from nexafreight.models.external_event import ExternalEvent

_WIND_ALERT_KMH = 50.0   # roughly Beaufort 7+; disrupts crane ops
_RAIN_ALERT_MM = 50.0    # heavy shower band; flooding risk at ports

RETRY_DELAYS_SEC = (2, 5, 10)
DELAY_BETWEEN_PORTS_SEC = 0.25

async def run_weather(session: AsyncSession) -> str:
    """Check current wind/rain at ports; record breaches. Returns summary."""
    breaches = 0
    checked = 0
    skipped = 0
    
    now = datetime.now(UTC)
    today = now.date().isoformat()
    yday = now.timetuple().tm_yday
    
    stmt = text("SELECT locode, latitude, longitude FROM network_nodes WHERE node_type = 'PORT' AND latitude IS NOT NULL AND longitude IS NOT NULL")
    rows = (await session.execute(stmt)).all()
    
    for row in rows:
        locode = row.locode
        lat = row.latitude
        lon = row.longitude
        
        if zlib.crc32(locode.encode()) % 5 != (yday % 5):
            continue
            
        success = False
        payload = None
        for attempt in range(4):
            try:
                payload = await get_json(
                    "https://api.open-meteo.com/v1/forecast"
                    f"?latitude={lat}&longitude={lon}&current=wind_speed_10m,precipitation"
                )
                success = True
                break
            except Exception:
                if attempt < len(RETRY_DELAYS_SEC):
                    await asyncio.sleep(RETRY_DELAYS_SEC[attempt])
                else:
                    success = False
                    
        if not success:
            skipped += 1
            continue
            
        checked += 1
            
        current = payload.get("current", {})
        wind = current.get("wind_speed_10m")
        rain = current.get("precipitation")
        
        if wind is None and rain is None:
            await asyncio.sleep(DELAY_BETWEEN_PORTS_SEC)
            continue
            
        wind = float(wind) if wind is not None else 0.0
        rain = float(rain) if rain is not None else 0.0
        
        if wind < _WIND_ALERT_KMH and rain < _RAIN_ALERT_MM:
            await asyncio.sleep(DELAY_BETWEEN_PORTS_SEC)
            continue
            
        external_id = f"weather-{locode}-{today}"
        existing_q = await session.execute(
            select(ExternalEvent).where(
                ExternalEvent.source == "OPEN-METEO",
                ExternalEvent.external_id == external_id,
            )
        )
        if existing_q.scalar_one_or_none() is not None:
            await asyncio.sleep(DELAY_BETWEEN_PORTS_SEC)
            continue
            
        severity = "RED" if wind >= 70.0 or rain >= 100.0 else "ORANGE"
        
        session.add(ExternalEvent(
            source="OPEN-METEO",
            external_id=external_id,
            event_type="WEATHER",
            title=f"{locode}: wind {wind:.0f} km/h, rain {rain:.1f} mm",
            severity=severity,
            latitude=lat,
            longitude=lon,
            event_time=now,
            raw_json=None,
            provenance="REAL",
        ))
        breaches += 1
        
        await asyncio.sleep(DELAY_BETWEEN_PORTS_SEC)
        
    await session.commit()
    if skipped > 0:
        return f"warn: {checked} checked, {breaches} breaches, {skipped} skipped (rate-limit)"
    return f"ok: {checked} checked, {breaches} breaches"
