"""Unit tests for BUG9: source-aware congestion consumption."""

import pytest
from datetime import UTC, datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from nexafreight.models import Port, PortDailyStat
from nexafreight.services.disruption_detector import check_port_congestion
from nexafreight.enums import TransportMode, LegStatus

async def test_congestion_source_mixed(
    db_session: AsyncSession, make_shipment, make_location, make_leg
) -> None:
    """Mixed SIM+CAL rows for a port -> uses CAL only."""
    now = datetime.now(UTC)
    loc = await make_location(locode="MIXED", name="Mixed Port")
    port = Port(location_id=loc.id)
    db_session.add(port)
    await db_session.commit()

    # Baseline: 15 days of CALIBRATED
    for i in range(1, 16):
        db_session.add(
            PortDailyStat(
                port_id=port.id,
                stat_date=(now - timedelta(days=i)).date(),
                congestion_index=0.2,
                source="CALIBRATED"
            )
        )
    # Baseline: 15 days of SIMULATED (should be ignored)
    for i in range(16, 31):
        db_session.add(
            PortDailyStat(
                port_id=port.id,
                stat_date=(now - timedelta(days=i)).date(),
                congestion_index=0.9,
                source="SIMULATED"
            )
        )

    # Today: CALIBRATED=0.8
    db_session.add(PortDailyStat(port_id=port.id, stat_date=now.date(), congestion_index=0.8, source="CALIBRATED"))
    # Old Date: SIMULATED=0.1
    db_session.add(PortDailyStat(port_id=port.id, stat_date=(now - timedelta(days=35)).date(), congestion_index=0.1, source="SIMULATED"))
    await db_session.commit()

    # Create one inbound shipment
    s = await make_shipment(status="IN_TRANSIT")
    await make_leg(
        shipment_id=s.id,
        sequence_number=1,
        mode=TransportMode.SEA,
        status=LegStatus.PLANNED,
        destination=loc,
    )

    candidates = await check_port_congestion(db_session, now=now)
    # The CALIBRATED ratio is 0.8 / 0.2 = 4.0 (> 1.5) -> should flag
    # If it used SIMULATED, ratio would be 0.1 / 0.9 = 0.11 -> no flag
    assert len(candidates) == 1
    assert candidates[0].shipment_id == s.id

async def test_congestion_source_fallback(
    db_session: AsyncSession, make_shipment, make_location, make_leg
) -> None:
    """Only SIM rows -> falls back, returns rows (no crash)."""
    now = datetime.now(UTC)
    loc = await make_location(locode="SIMLY", name="Sim Only Port")
    port = Port(location_id=loc.id)
    db_session.add(port)
    await db_session.commit()

    # Baseline: 30 days of SIMULATED
    for i in range(1, 31):
        db_session.add(
            PortDailyStat(
                port_id=port.id,
                stat_date=(now - timedelta(days=i)).date(),
                congestion_index=0.2,
                source="SIMULATED"
            )
        )

    # Today: SIMULATED=0.8
    db_session.add(PortDailyStat(port_id=port.id, stat_date=now.date(), congestion_index=0.8, source="SIMULATED"))
    await db_session.commit()

    # Create one inbound shipment
    s = await make_shipment(status="IN_TRANSIT")
    await make_leg(
        shipment_id=s.id,
        sequence_number=1,
        mode=TransportMode.SEA,
        status=LegStatus.PLANNED,
        destination=loc,
    )

    candidates = await check_port_congestion(db_session, now=now)
    # The fallback should use SIMULATED. Ratio 0.8 / 0.2 = 4.0 (> 1.5) -> flags
    assert len(candidates) == 1
    assert candidates[0].shipment_id == s.id
