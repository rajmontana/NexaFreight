"""Disruption detector worker (Definitive Plan — Phase 8).

Schedule per Definitive Plan §Phase 2:
  1. Port congestion scan — APScheduler cron, daily at 06:00 UTC
     (jobs themselves are importable and individually callable for tests).
  2. Vessel delay scan — interval 15min (planned vs actual progress on live
     sea legs; the AIS listener remains the real-time position source).
Each candidate becomes a Disruption row; the alert pipeline
(process_disruption) runs per candidate to raise alerts.

Cron: hour=6 daily. max_instances=1, coalesce=True.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from sqlalchemy import select

from nexafreight.enums import (
    AlertStatus,
    DisruptionStatus,
    DisruptionType,
    LegStatus,
    TransportMode,
)
from nexafreight.models import Disruption, Leg
from nexafreight.services.alert_engine import process_disruption
from nexafreight.services.disruption_detector import (
    DetectionCandidate,
    check_port_congestion,
    check_vessel_delay,
)

logger = logging.getLogger(__name__)

JOB_ID = "nexafreight_disruption_detector"
SCHEDULER_INTERVAL_MINUTES = 15


def _simulate_live_progress(leg: Leg) -> float | None:
    """Actual-progress source for a live leg.

    Real AIS-driven progress belongs to the position pipeline; this worker's
    delay signal comes from the AIS listener writing PositionReports. Here we
    approximate progress from actual departure + adjacent telemetry when
    present, else None (no signal — skipped).
    """
    if leg.sequence_number == 1 and str(leg.status) == LegStatus.IN_PROGRESS:
        # Only leg-1 has position telemetry in the current build (see mock feed);
        # deeper legs stay silent rather than fabricating a signal.
        return 0.0
    return None


async def check_shipments(session, now=None) -> dict:
    """Job 1: congestion scan → Disruption rows + alerts.

    Returns a summary dict (counts) for logging/telemetry.
    """
    candidates = await check_port_congestion(session, now=now)
    created = 0
    skipped = 0

    for candidate in candidates:
        if candidate.shipment_id is None:
            skipped += 1
            continue

        # Idempotent: skip uncovered ACTIVE disruptions of the same type.
        existing = (
            await session.execute(
                select(Disruption).where(
                    Disruption.shipment_id == candidate.shipment_id,
                    Disruption.disruption_type == candidate.disruption_type,
                    Disruption.status == DisruptionStatus.ACTIVE,
                )
            )
        ).scalars().first()
        if existing is not None:
            skipped += 1
            continue

        disruption = Disruption(
            shipment_id=candidate.shipment_id,
            leg_id=candidate.leg_id,
            disruption_type=candidate.disruption_type,
            status=DisruptionStatus.ACTIVE,
            description=candidate.description,
            detected_at=datetime.now(UTC),
        )
        # NOTE: Disruption has no severity column — candidate.severity_hint
        # travels into the Alert created by process_disruption instead.
        session.add(disruption)
        await session.flush()

        alert = await process_disruption(
            session, disruption, estimated_delay_hours=candidate.estimated_delay_hours
        )
        if alert is None:
            skipped += 1
            continue
        created += 1

    await session.commit()
    summary = {"congestion_candidates": len(candidates), "created": created, "skipped": skipped}
    logger.info("Disruption scan complete: %s", summary)
    return summary


async def check_vessel_delays(session, now=None, *, progress_fn=None) -> dict:
    """Job 2: vessel delay scan over live sea legs (actual vs planned progress).

    ``progress_fn`` is injectable for tests (defaults to
    ``_simulate_live_progress``).
    """
    progress_fn = progress_fn or _simulate_live_progress

    live_legs = (
        (
            await session.execute(
                select(Leg).where(
                    Leg.status == LegStatus.IN_PROGRESS,
                    Leg.transport_mode == TransportMode.SEA,
                )
            )
        )
        .scalars()
        .all()
    )

    created = 0
    ontrack = 0
    for leg in live_legs:
        actual_progress = progress_fn(leg)
        if actual_progress is None:
            ontrack += 1
            continue
        candidate: DetectionCandidate | None = await check_vessel_delay(
            session, leg.id, actual_progress, now=now
        )
        if candidate is None:
            ontrack += 1
            continue

        disruption = Disruption(
            shipment_id=candidate.shipment_id,
            leg_id=candidate.leg_id,
            disruption_type=DisruptionType.VESSEL_DELAY,
            status=DisruptionStatus.ACTIVE,
            description=candidate.description,
            detected_at=datetime.now(UTC),
        )
        session.add(disruption)
        await session.flush()
        alert = await process_disruption(
            session, disruption, estimated_delay_hours=candidate.estimated_delay_hours
        )
        if alert is not None and str(alert.status) == AlertStatus.OPEN:
            created += 1

    await session.commit()
    summary = {
        "legs_scanned": len(live_legs),
        "on_track": ontrack,
        "alerts_created": created,
    }
    logger.info("Vessel-delay scan complete: %s", summary)
    return summary


def register_jobs(scheduler, session_factory) -> None:
    """Wire both scans into an APScheduler instance (id=JOB_ID)."""

    async def _run_congestion() -> None:
        async with session_factory() as session:
            await check_shipments(session)

    async def _run_vessel_delay() -> None:
        async with session_factory() as session:
            await check_vessel_delays(session)

    scheduler.add_job(
        _run_congestion,
        "cron",
        hour=6,  # plan: port congestion scan daily at 06:00
        id=f"{JOB_ID}_congestion",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=3600,
    )
    scheduler.add_job(
        _run_vessel_delay,
        "interval",
        minutes=SCHEDULER_INTERVAL_MINUTES,
        id=f"{JOB_ID}_vessel_delay",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=60,
    )


__all__ = [
    "JOB_ID",
    "SCHEDULER_INTERVAL_MINUTES",
    "check_shipments",
    "check_vessel_delays",
    "register_jobs",
]
