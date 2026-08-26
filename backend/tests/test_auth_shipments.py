"""Auth + protected endpoint tests."""

from __future__ import annotations

import pytest

from backend.app.ingest import dataco, seed_users
from backend.tests.test_ingest import FIXTURE

TEST_PASSWORD = "test-password-1234"


@pytest.fixture()
def seeded_users(db_session):
    import os
    os.environ["SEED_USER_PASSWORD"] = TEST_PASSWORD
    seed_users.seed(db_session)
    yield


def _login(client, email="manager@nexafreight.com", password=TEST_PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def test_login_ok(client, db_session, seeded_users):
    r = _login(client)
    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "manager" and body["access_token"]


def test_login_wrong_password(client, db_session, seeded_users):
    assert _login(client, password="nope").status_code == 401


def test_me_requires_token(client):
    assert client.get("/api/auth/me").status_code == 401


def test_kpis_requires_auth(client):
    assert client.get("/api/kpis").status_code == 401


def test_kpis_with_token(client, db_session, seeded_users):
    dataco.run(FIXTURE, db_session)
    tok = _login(client).json()["access_token"]
    r = client.get("/api/kpis", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 200 and r.json()["shipments"]["count"] == 5


def test_shipment_timeline(client, db_session, seeded_users):
    dataco.run(FIXTURE, db_session)
    tok = _login(client).json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    lst = client.get("/api/shipments?limit=2", headers=h)
    assert lst.status_code == 200 and lst.json()["total"] == 5
    ref = lst.json()["data"][0]["ref"]
    detail = client.get(f"/api/shipments/{ref}", headers=h)
    assert detail.status_code == 200
    body = detail.json()
    assert {e["event"] for e in body["timeline"]} >= {"ORDER_PLACED", "SHIPPED", "DELIVERED"}
    assert body["provenance"] == "REAL:DataCo"
