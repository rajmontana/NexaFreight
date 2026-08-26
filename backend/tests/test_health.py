"""Health & landing endpoint tests (Phase 0 acceptance: honest health)."""

from __future__ import annotations


def test_health_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["feed_mode"] in ("live", "replay", "mock")
    assert body["environment"] == "dev"
    assert "server_time_utc" in body


def test_health_db_ok(client):
    r = client.get("/api/health/db")
    assert r.status_code == 200
    assert r.json()["database"] == "reachable"


def test_landing_is_honest_placeholder(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "Phase 0" in r.text
    # No fake telemetry claims on the landing page.
    assert "AISstream" not in r.text and "109 Flights" not in r.text
