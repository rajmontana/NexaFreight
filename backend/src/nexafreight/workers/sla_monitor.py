"""SLA monitor worker (Definitive Plan — Phase 4 finish/Phase 8).

Runs every 15 minutes via APScheduler:
    run_sla_sweep → sla_checker.check_all_in_transit
        (rescores all in-transit orders, mirrors shipment DELAYED status,
         escalates stale CRITICAL alerts into the immutable audit trail).

APScheduler: interval 15min, max_instances=1, coalesce=True.
"""

from __future__ import annotations

import logging

from nexafreight.services.sla_checker import check_all_in_transit

logger = logging.getLogger(__name__)

JOB_ID = "nexafreight_sla_monitor"
SCHEDULER_INTERVAL_MINUTES = 15


async def run_sla_sweep(session) -> dict:
    """Job: rescore SLA statuses across the live shipment book."""
    summary = await check_all_in_transit(session)
    await session.commit()
    return summary


def register_jobs(scheduler, session_factory) -> None:
    """Wire this worker into an APScheduler instance (id=JOB_ID)."""

    async def _run() -> None:
        async with session_factory() as session:
            await run_sla_sweep(session)

    scheduler.add_job(
        _run,
        "interval",
        minutes=SCHEDULER_INTERVAL_MINUTES,
        id=JOB_ID,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=30,
    )


__all__ = ["JOB_ID", "SCHEDULER_INTERVAL_MINUTES", "run_sla_sweep", "register_jobs"]
