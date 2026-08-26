"""Alert engine + HITL decision tests (fixtures + direct REAL-shaped rows)."""

from __future__ import annotations

import datetime as dt
import os

import pytest

from backend.app.ingest import dataco, seed_users, sop_seed
from backend.app.models.entities import Alert, Decision, DecisionOption, Shipment
from backend.app.services import alert_engine
from backend.tests.test_ingest import FIXTURE

TEST_PASSWORD = "test-password-1234"


@pytest.fixture()
def alert_env(db_session):
    """Fixture data + one REAL-shaped at-risk shipment above the $50k trigger."""
    os.environ["SEED_USER_PASSWORD"] = TEST_PASSWORD
    dataco.run(FIXTURE, db_session)
    seed_users.seed(db_session)
    sop_seed.seed(db_session)
    from sqlalchemy import func

    as_of = db_session.query(func.max(Shipment.order_date)).scalar() or dt.datetime(2017, 9, 1)
    import datetime as dtl

    db_session.add(Shipment(ref="NXF-99001", dataco_order_id=99001, customer_id=1,
                            dest_city="Rotterdam", dest_country="Netherlands", dest_region="Western Europe",
                            market="Europe", dest_lat=51.9, dest_lon=4.4, freight_mode="OCEAN",
                            status="DELIVERED", value_usd=142500.0,
                            order_date=as_of, planned_ship_date=as_of,
                            sla_due_at=as_of, actual_delivery=as_of + dtl.timedelta(days=5),
                            was_late=True))
    db_session.commit()
    yield db_session


def _login(client, email="manager@nexafreight.com"):
    return {"Authorization": "Bearer " + client.post(
        "/api/auth/login", json={"email": email, "password": TEST_PASSWORD}
    ).json()["access_token"]}


def test_generate_alerts_idempotent(alert_env):
    r1 = alert_engine.generate_alerts(alert_env)
    r2 = alert_engine.generate_alerts(alert_env)
    # NXF-99001 triggers BOTH SOP-LOG-001 (value>$50k, delay>2d) and SOP-SLA-003
    assert r1["created"] == 2 and r2["created"] == 0 and r2["skipped"] == 2
    codes = {a.rule_code for a in alert_env.query(Alert).all()}
    assert codes == {"SOP-LOG-001", "SOP-SLA-003"}
    a = alert_env.query(Alert).filter_by(rule_code="SOP-LOG-001").one()
    assert a.severity == "CRITICAL"
    opts = alert_env.query(DecisionOption).filter_by(alert_id=a.id).order_by(
        DecisionOption.expected_total_cost_usd).all()
    assert len(opts) == 3 and opts[0].option_type != "PARTIAL_AIR"  # cheapest first


def test_full_hitl_flow(client, db_session, alert_env):
    # note: alert_env used db_session; client shares the same engine/tables
    h = _login(client)
    alert_engine.generate_alerts(alert_env)
    lst = client.get("/api/alerts", headers=h)
    assert lst.status_code == 200 and lst.json()["total"] == 2  # both rules fired
    aid = next(a["id"] for a in lst.json()["data"] if a["rule_code"] == "SOP-LOG-001")
    det = client.get(f"/api/alerts/{aid}", headers=h).json()
    assert len(det["options"]) == 3
    opt_air = next(o for o in det["options"] if o["option_type"] == "PARTIAL_AIR")
    r = client.post(f"/api/alerts/{aid}/decide", headers=h, json={
        "action": "APPROVED", "option_id": opt_air["id"], "reason": "Contractual Tier-A penalty too high"})
    assert r.status_code == 200 and r.json()["option"] == "PARTIAL_AIR"
    d = db_session.query(Decision).one()
    assert d.action == "APPROVED" and d.decided_by == "manager@nexafreight.com"
    # immutable: second decision rejected
    r2 = client.post(f"/api/alerts/{aid}/decide", headers=h, json={
        "action": "REJECTED", "reason": "changed mind"})
    assert r2.status_code == 409


def test_authority_enforced(client, db_session, alert_env):
    h = _login(client, email="dispatcher@nexafreight.com")  # limit $2,500
    alert_engine.generate_alerts(alert_env)
    aid = db_session.query(Alert).filter_by(rule_code="SOP-LOG-001").first().id
    opt = db_session.query(DecisionOption).filter_by(alert_id=aid, option_type="REROUTE_PORT").one()
    r = client.post(f"/api/alerts/{aid}/decide", headers=h, json={
        "action": "APPROVED", "option_id": opt.id, "reason": "try to approve big spend"})
    assert r.status_code == 403 and "authority" in r.json()["detail"]


def test_reason_mandatory(client, db_session, alert_env):
    h = _login(client)
    alert_engine.generate_alerts(alert_env)
    aid = db_session.query(Alert).filter_by(rule_code="SOP-LOG-001").first().id
    r = client.post(f"/api/alerts/{aid}/decide", headers=h, json={
        "action": "REJECTED", "reason": "x"})
    assert r.status_code == 422
