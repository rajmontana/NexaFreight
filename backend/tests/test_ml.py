"""ETA model + registry endpoints (skip-if-untrained = honest)."""

from __future__ import annotations

import os

import pytest

from backend.app.ingest import dataco, seed_users, sop_seed
from backend.app.ml import eta_model
from backend.app.services import alert_engine
from backend.tests.test_ingest import FIXTURE

TEST_PASSWORD = "test-password-1234"


@pytest.fixture()
def ml_env(db_session):
    os.environ["SEED_USER_PASSWORD"] = TEST_PASSWORD
    dataco.run(FIXTURE, db_session)
    seed_users.seed(db_session)
    sop_seed.seed(db_session)
    return db_session


def test_prepare_dataset_shapes(ml_env):
    df = eta_model.prepare_dataset(ml_env)
    assert len(df) == 5  # fixture shipments with real dates
    assert {"y", "sla_days", "mode_idx"} <= set(df.columns)


def test_models_endpoints(client, db_session, ml_env, tmp_path, monkeypatch):
    monkeypatch.setattr(eta_model, "CACHE", tmp_path)  # isolate from real artifacts
    h = {"Authorization": "Bearer " + client.post(
        "/api/auth/login", json={"email": "manager@nexafreight.com",
                                 "password": TEST_PASSWORD}).json()["access_token"]}
    r = client.get("/api/models", headers=h)
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 0 and body["data"] == []  # honest: untrained on fixture
    eta_r = client.get("/api/eta/NXF-40001", headers=h)
    assert eta_r.status_code == 200 and eta_r.json()["available"] is False
    assert eta_r.json()["provenance"] == "EMPTY:HONEST"


def test_options_fallback_labeled_heuristic(ml_env):
    ml_env.add_all([__import__("backend.app.models.entities", fromlist=["Shipment"]).Shipment(
        ref="NXF-99002", dataco_order_id=99002, customer_id=1, dest_country="Netherlands",
        market="Europe", freight_mode="OCEAN", status="DELIVERED", value_usd=90000.0,
        order_date=__import__("datetime").datetime(2017, 9, 1),
        planned_ship_date=__import__("datetime").datetime(2017, 9, 1),
        sla_due_at=__import__("datetime").datetime(2017, 9, 4),
        actual_delivery=__import__("datetime").datetime(2017, 9, 9), was_late=True)])
    ml_env.commit()
    alert_engine.generate_alerts(ml_env)
    from backend.app.models.entities import DecisionOption
    opts = ml_env.query(DecisionOption).all()
    assert opts and all(o.detail["provenance"].startswith("DERIVED:") for o in opts)
