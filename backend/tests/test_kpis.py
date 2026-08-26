"""/api/kpis returns REAL provenance-labeled aggregates."""

from __future__ import annotations

from backend.app.ingest import dataco, sop_seed
from backend.tests.test_ingest import FIXTURE


def test_kpis_after_ingest(client, db_session):
    dataco.run(FIXTURE, db_session)
    sop_seed.seed(db_session)
    r = client.get("/api/kpis")
    assert r.status_code == 200
    body = r.json()
    assert body["shipments"]["count"] == 5
    assert body["shipments"]["mode_mix"]["OCEAN"] == 2
    assert body["shipments"]["mode_mix"]["AIR"] == 2
    assert body["shipments"]["mode_mix"]["ROAD"] == 1
    assert body["shipments"]["provenance"] == "REAL:DataCo"
    assert body["orders"]["loss_making_lines"] == 2  # the two -30 profit lines
    assert body["calibration"]["sop_rules"] >= 6


def test_kpis_empty_db_is_zero_not_fake(client):
    body = client.get("/api/kpis").json()
    assert body["shipments"]["count"] == 0
    assert body["shipments"]["on_time_pct"] is None  # honest: no fake 100%
