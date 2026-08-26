"""/api/kpis returns REAL provenance-labeled aggregates (auth-protected)."""

from __future__ import annotations

import os

import pytest

from backend.app.ingest import dataco, seed_users, sop_seed
from backend.tests.test_ingest import FIXTURE

TEST_PASSWORD = "test-password-1234"


@pytest.fixture()
def auth_headers(client, db_session):
    os.environ["SEED_USER_PASSWORD"] = TEST_PASSWORD
    seed_users.seed(db_session)
    tok = client.post("/api/auth/login",
                      json={"email": "manager@nexafreight.com", "password": TEST_PASSWORD}
                      ).json()["access_token"]
    return {"Authorization": f"Bearer {tok}"}


def test_kpis_after_ingest(client, db_session, auth_headers):
    dataco.run(FIXTURE, db_session)
    sop_seed.seed(db_session)
    r = client.get("/api/kpis", headers=auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["shipments"]["count"] == 5
    assert body["shipments"]["mode_mix"]["OCEAN"] == 2
    assert body["shipments"]["mode_mix"]["AIR"] == 2
    assert body["shipments"]["mode_mix"]["ROAD"] == 1
    assert body["shipments"]["provenance"] == "REAL:DataCo"
    assert body["orders"]["loss_making_lines"] == 2  # the two -30 profit lines
    assert body["calibration"]["sop_rules"] >= 6


def test_kpis_empty_db_is_zero_not_fake(client, auth_headers):
    body = client.get("/api/kpis", headers=auth_headers).json()
    assert body["shipments"]["count"] == 0
    assert body["shipments"]["on_time_pct"] is None  # honest: no fake 100%
