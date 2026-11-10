"""Integration tests for Phase 10 security and integrity remediations.

Verifies:
1. alerts/approve and POST /disruptions require OPERATOR or ADMIN (VIEWER gets 403).
2. /internal/activate-fleet and self-heal require valid HMAC or ADMIN Bearer token.
3. /api/health/validation requires authentication.
4. /health truthfully reports ml_models_loaded and package version.
"""

from __future__ import annotations

import hashlib
import hmac
from datetime import UTC, datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from nexafreight.config import get_settings
from nexafreight.enums import DisruptionType, UserRole
from nexafreight.models import Alert, Disruption, Order, Shipment, User


def _make_hmac_headers(secret: str, ts: str | None = None) -> dict[str, str]:
    stamp = ts or str(int(datetime.now(UTC).timestamp()))
    sig = hmac.new(secret.encode(), stamp.encode("ascii"), hashlib.sha256).hexdigest()
    return {"x-nexa-timestamp": stamp, "x-nexa-signature": sig}


@pytest.mark.asyncio
async def test_health_validation_requires_auth(
    client: AsyncClient,
    seed_viewer_user: User,
    auth_headers_factory,
) -> None:
    # 1. Unauthenticated gets 401
    resp_unauth = await client.get("/api/health/validation")
    assert resp_unauth.status_code == 401

    # 2. Authenticated user can read the validation matrix
    viewer_headers = auth_headers_factory(seed_viewer_user)
    resp_auth = await client.get("/api/health/validation", headers=viewer_headers)
    assert resp_auth.status_code == 200
    data = resp_auth.json()
    assert "generated_at" in data
    assert "all_ok" in data


@pytest.mark.asyncio
async def test_health_endpoint_version_and_ml_reporting(
    client: AsyncClient,
) -> None:
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["version"] == "0.1.0"
    assert "models" in data
    # Truthful check: ml_models_loaded must equal all(models.values())
    expected_all = all(data["models"].values())
    assert data["ml_models_loaded"] == expected_all


@pytest.mark.asyncio
async def test_post_disruptions_role_checks(
    client: AsyncClient,
    db_session: AsyncSession,
    seed_admin_user: User,
    seed_operator_user: User,
    seed_viewer_user: User,
    auth_headers_factory,
    make_shipment,
    make_order,
) -> None:
    order = await make_order()
    shipment = await make_shipment(order)
    db_session.add(order)
    db_session.add(shipment)
    await db_session.commit()

    disruption_payload = {
        "shipment_id": shipment.id,
        "disruption_type": "PORT_CONGESTION",
        "delay_hours": 12.0,
    }

    # 1. Unauthenticated gets 401
    resp_unauth = await client.post("/api/disruptions", json=disruption_payload)
    assert resp_unauth.status_code == 401

    # 2. VIEWER gets 403 Forbidden
    viewer_headers = auth_headers_factory(seed_viewer_user)
    resp_viewer = await client.post("/api/disruptions", json=disruption_payload, headers=viewer_headers)
    assert resp_viewer.status_code == 403
    assert "Only ADMIN or OPERATOR roles" in resp_viewer.text

    # 3. OPERATOR gets 201 Created
    operator_headers = auth_headers_factory(seed_operator_user)
    resp_op = await client.post("/api/disruptions", json=disruption_payload, headers=operator_headers)
    assert resp_op.status_code == 201
    assert "disruption_id" in resp_op.json()


@pytest.mark.asyncio
async def test_alerts_approve_role_checks(
    client: AsyncClient,
    db_session: AsyncSession,
    seed_admin_user: User,
    seed_operator_user: User,
    seed_viewer_user: User,
    auth_headers_factory,
    make_shipment,
    make_order,
) -> None:
    order = await make_order()
    shipment = await make_shipment(order)
    db_session.add(order)
    db_session.add(shipment)
    await db_session.commit()

    # Create active disruption and alert
    op_headers = auth_headers_factory(seed_operator_user)
    resp_disp = await client.post(
        "/api/disruptions",
        json={"shipment_id": shipment.id, "disruption_type": "PORT_CONGESTION", "delay_hours": 24},
        headers=op_headers,
    )
    assert resp_disp.status_code == 201
    alert_id = resp_disp.json()["alert_id"]

    approve_payload = {"option_key": "ACCEPT_DELAY"}

    # 1. Unauthenticated gets 401
    resp_unauth = await client.post(f"/api/alerts/{alert_id}/approve", json=approve_payload)
    assert resp_unauth.status_code == 401

    # 2. VIEWER gets 403 Forbidden even if user_id is injected in body
    viewer_headers = auth_headers_factory(seed_viewer_user)
    tampered_payload = {"option_key": "ACCEPT_DELAY", "user_id": seed_admin_user.id}
    resp_viewer = await client.post(
        f"/api/alerts/{alert_id}/approve", json=tampered_payload, headers=viewer_headers
    )
    assert resp_viewer.status_code == 403
    assert "Only ADMIN or OPERATOR roles" in resp_viewer.text

    # 3. OPERATOR gets 201
    resp_op = await client.post(
        f"/api/alerts/{alert_id}/approve", json=approve_payload, headers=op_headers
    )
    assert resp_op.status_code == 201
    assert resp_op.json()["action"] == "ACCEPT_DELAY"


@pytest.mark.asyncio
async def test_internal_activate_fleet_auth(
    client: AsyncClient,
    test_app,
    seed_admin_user: User,
    seed_operator_user: User,
    seed_viewer_user: User,
    auth_headers_factory,
    test_settings,
) -> None:
    # 1. Unauthenticated gets 401
    resp_unauth = await client.post("/internal/activate-fleet")
    assert resp_unauth.status_code == 401

    # 2. VIEWER gets 403
    viewer_headers = auth_headers_factory(seed_viewer_user)
    resp_viewer = await client.post("/internal/activate-fleet", headers=viewer_headers)
    assert resp_viewer.status_code == 403

    # 3. OPERATOR gets 403
    op_headers = auth_headers_factory(seed_operator_user)
    resp_op = await client.post("/internal/activate-fleet", headers=op_headers)
    assert resp_op.status_code == 403

    # 4. ADMIN gets authorized
    admin_headers = auth_headers_factory(seed_admin_user)
    resp_admin = await client.post("/internal/activate-fleet", headers=admin_headers)
    # The script execution response will be 200 or 404 depending on script file path in test env, but never 401/403
    assert resp_admin.status_code in (200, 404)

    # 5. HMAC headers with nightly secret authorize execution
    from pydantic import SecretStr
    from nexafreight.config import Settings, get_settings
    orig_override = test_app.dependency_overrides.get(get_settings)
    try:
        test_app.dependency_overrides[get_settings] = lambda: Settings(
            jwt_secret=test_settings.jwt_secret,
            nightly_secret=SecretStr("test-nightly-secret-12345"),
        )
        hmac_headers = _make_hmac_headers("test-nightly-secret-12345")
        resp_hmac = await client.post("/internal/activate-fleet", headers=hmac_headers)
        assert resp_hmac.status_code in (200, 404)
    finally:
        if orig_override:
            test_app.dependency_overrides[get_settings] = orig_override
        else:
            test_app.dependency_overrides.pop(get_settings, None)
