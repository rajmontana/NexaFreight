"""Endpoint smoke tests for the new operational routers (Definitive Plan Phases 6/9).

Directly aligned with the plan's demo loop:
  HTTP  POST /disruptions → auto detect → process → alert
  HTTP  GET  /alerts + GET /alerts/{id}/options → 3 options
"""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from nexafreight.enums import ShipmentStatus, UserRole


@pytest.mark.asyncio
async def test_post_disruption_triggers_alert(client, seed_admin_user, make_shipment, make_order, auth_headers_factory, make_leg):
    s = await make_shipment(status=ShipmentStatus.IN_TRANSIT)
    await make_order(order_number="ORD-ROUTER-1", shipment=s)
    await make_leg(shipment_id=s.id, sequence_number=1)

    headers = auth_headers_factory(seed_admin_user)

    res = await client.post(
        "/api/disruptions",
        json={"shipment_id": s.id, "disruption_type": "PORT_CONGESTION", "delay_hours": 24},
        headers=headers,
    )
    assert res.status_code in (201, 200), res.text
    body = res.json()
    assert "alert_id" in body
    assert "severity" in body

    res2 = await client.get("/api/alerts", headers=headers)
    assert res2.status_code == 200
    alerts = res2.json()["alerts"]
    assert any(a["id"] == body["alert_id"] for a in alerts)


@pytest.mark.asyncio
async def test_alert_options_shape(client, seed_admin_user, make_shipment, make_order, make_leg, auth_headers_factory):
    from nexafreight.models import Disruption

    s = await make_shipment(status=ShipmentStatus.IN_TRANSIT)
    await make_order(order_number="ORD-ROUTER-2", shipment=s)
    leg = await make_leg(shipment_id=s.id, sequence_number=1)

    headers = auth_headers_factory(seed_admin_user)

    res = await client.post(
        "/api/disruptions",
        json={"shipment_id": s.id, "disruption_type": "VESSEL_DELAY", "delay_hours": 48},
        headers=headers,
    )
    alert_id = res.json()["alert_id"]

    opts = await client.get(f"/api/alerts/{alert_id}/options", headers=headers)
    assert opts.status_code == 200
    body = opts.json()["options"]
    assert len(body) == 3
    expected = {"ACCEPT_DELAY", "MODAL_SHIFT_AIR"}
    assert expected.issubset({o["option_key"] for o in body})
    assert {o["action"] for o in body} <= {"ACCEPT_DELAY", "REROUTE", "SPLIT_SHIPMENT"}
    assert sum(1 for o in body if o["recommended"]) >= 1
    for opt in body:
        for key in ("cost_delta_usd", "sla_penalty_usd", "demurrage_usd", "carbon_cost_usd", "co2_delta_kg", "total_impact_usd"):
            assert key in opt


@pytest.mark.asyncio
async def test_unknown_alert_returns_404(client, seed_admin_user, auth_headers_factory):
    headers = auth_headers_factory(seed_admin_user)
    res = await client.get("/api/alerts/does-not-exist/options", headers=headers)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_decisions_admin_only(client, seed_admin_user, seed_viewer_user, auth_headers_factory):
    vheaders = auth_headers_factory(seed_viewer_user)
    aheaders = auth_headers_factory(seed_admin_user)
    res_v = await client.get("/api/decisions", headers=vheaders)
    assert res_v.status_code == 403
    res_a = await client.get("/api/decisions", headers=aheaders)
    assert res_a.status_code == 200
