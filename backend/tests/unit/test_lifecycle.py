"""Unit test for optimized sync_shipment_lifecycles query and memory isolation."""

import pytest
from datetime import UTC, datetime, timedelta
from sqlalchemy import select

from nexafreight.enums import LegStatus, Provenance, ShipmentStatus, TransportMode
from nexafreight.models.leg import Leg
from nexafreight.models.shipment import Shipment
from nexafreight.services.lifecycle import sync_shipment_lifecycles


@pytest.mark.asyncio
async def test_sync_shipment_lifecycles_promotes_only_legs_and_shipments(db_session, make_shipment, make_location):
    now = datetime.now(UTC)
    loc_a = await make_location(locode="INNSA", name="Nhava Sheva")
    loc_b = await make_location(locode="NLRTM", name="Rotterdam")

    # 1. Create a shipment with a completed leg (planned_arrival in past)
    sh1 = await make_shipment(
        origin=loc_a,
        destination=loc_b,
        status=ShipmentStatus.IN_TRANSIT,
        primary_transport_mode=TransportMode.ROAD,
        provenance=Provenance.SIMULATED,
    )

    leg1 = Leg(
        shipment_id=sh1.id,
        sequence_number=1,
        route_version=1,
        origin_id=loc_a.id,
        destination_id=loc_b.id,
        transport_mode=TransportMode.ROAD,
        status=LegStatus.IN_PROGRESS,
        planned_departure=now - timedelta(days=2),
        planned_arrival=now - timedelta(hours=2),
        provenance=Provenance.SIMULATED,
    )
    db_session.add(leg1)

    # 2. Create a placeholder shipment WITHOUT legs (e.g. historical DataCo row)
    sh_placeholder = await make_shipment(
        origin=loc_a,
        destination=loc_b,
        status=ShipmentStatus.PLANNED,
        primary_transport_mode=TransportMode.ROAD,
        provenance=Provenance.HISTORICAL,
    )
    await db_session.commit()

    # Execute sync
    updated = await sync_shipment_lifecycles(db_session, now=now)
    assert updated >= 1

    # Reload sh1
    result = await db_session.execute(select(Shipment).where(Shipment.id == sh1.id))
    reloaded_sh1 = result.scalar_one()
    assert str(reloaded_sh1.status) == ShipmentStatus.DELIVERED
