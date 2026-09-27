"""Unit tests for db-driven weather job."""

import pytest
import zlib
from datetime import UTC, datetime

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from nexafreight.models.external_event import ExternalEvent
from nexafreight.jobs.weather import run_weather

@pytest.fixture
def override_delays(monkeypatch):
    monkeypatch.setattr("nexafreight.jobs.weather.RETRY_DELAYS_SEC", (0, 0, 0))
    monkeypatch.setattr("nexafreight.jobs.weather.DELAY_BETWEEN_PORTS_SEC", 0)

@pytest.mark.asyncio
async def test_weather_rotation(db_session: AsyncSession, override_delays, monkeypatch) -> None:
    now = datetime.now(UTC)
    yday = now.timetuple().tm_yday
    
    # We want 5 locodes, one for each residue
    residues = {}
    i = 0
    while len(residues) < 5:
        locode = f"PORT{i}"
        res = zlib.crc32(locode.encode()) % 5
        if res not in residues:
            residues[res] = locode
            await db_session.execute(
                text("INSERT INTO network_nodes (locode, name, node_type, latitude, longitude, country_code, modes_json, created_at, updated_at) VALUES (:locode, 'Test', 'PORT', 10.0, 20.0, 'XX', '[]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"),
                {"locode": locode}
            )
        i += 1
    await db_session.commit()
    
    async def mock_get_json(url: str) -> dict:
        return {"current": {"wind_speed_10m": 12.0, "precipitation": 0.0}}
    monkeypatch.setattr("nexafreight.jobs.weather.get_json", mock_get_json)

    summary = await run_weather(db_session)
    assert "ok: 1 checked" in summary
    assert "0 breaches" in summary


@pytest.mark.asyncio
async def test_weather_breach_idempotent(db_session: AsyncSession, override_delays, monkeypatch) -> None:
    now = datetime.now(UTC)
    yday = now.timetuple().tm_yday
    
    locode = "TEST1"
    while zlib.crc32(locode.encode()) % 5 != (yday % 5):
        locode += "X"

    await db_session.execute(text("INSERT INTO network_nodes (locode, name, node_type, latitude, longitude, country_code, modes_json, created_at, updated_at) VALUES (:locode, 'Test', 'PORT', 10.0, 20.0, 'XX', '[]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"), {"locode": locode})
    await db_session.commit()

    async def mock_get_json(url: str) -> dict:
        return {"current": {"wind_speed_10m": 80.0, "precipitation": 120.0}}
    monkeypatch.setattr("nexafreight.jobs.weather.get_json", mock_get_json)

    # First run
    summary = await run_weather(db_session)
    assert "ok: 1 checked, 1 breaches" in summary
    events = (await db_session.execute(select(ExternalEvent))).scalars().all()
    assert len(events) == 1
    
    # Second run
    summary2 = await run_weather(db_session)
    assert "ok: 1 checked, 0 breaches" in summary2
    events2 = (await db_session.execute(select(ExternalEvent))).scalars().all()
    assert len(events2) == 1

@pytest.mark.asyncio
async def test_weather_429_twice_then_success(db_session: AsyncSession, override_delays, monkeypatch) -> None:
    now = datetime.now(UTC)
    yday = now.timetuple().tm_yday
    locode = "TEST1"
    while zlib.crc32(locode.encode()) % 5 != (yday % 5):
        locode += "X"

    await db_session.execute(text("INSERT INTO network_nodes (locode, name, node_type, latitude, longitude, country_code, modes_json, created_at, updated_at) VALUES (:locode, 'Test', 'PORT', 10.0, 20.0, 'XX', '[]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"), {"locode": locode})
    await db_session.commit()

    attempts = 0
    async def mock_get_json(url: str) -> dict:
        nonlocal attempts
        attempts += 1
        if attempts <= 2:
            raise Exception("429")
        return {"current": {"wind_speed_10m": 80.0, "precipitation": 120.0}}
    
    monkeypatch.setattr("nexafreight.jobs.weather.get_json", mock_get_json)

    summary = await run_weather(db_session)
    assert "ok: 1 checked, 1 breaches" in summary
    assert attempts == 3

@pytest.mark.asyncio
async def test_weather_all_fail(db_session: AsyncSession, override_delays, monkeypatch) -> None:
    now = datetime.now(UTC)
    yday = now.timetuple().tm_yday
    locode = "TEST1"
    while zlib.crc32(locode.encode()) % 5 != (yday % 5):
        locode += "X"

    await db_session.execute(text("INSERT INTO network_nodes (locode, name, node_type, latitude, longitude, country_code, modes_json, created_at, updated_at) VALUES (:locode, 'Test', 'PORT', 10.0, 20.0, 'XX', '[]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"), {"locode": locode})
    await db_session.commit()

    async def mock_get_json(url: str) -> dict:
        raise Exception("429")
    
    monkeypatch.setattr("nexafreight.jobs.weather.get_json", mock_get_json)

    summary = await run_weather(db_session)
    assert "warn: 0 checked, 0 breaches, 1 skipped (rate-limit)" in summary
