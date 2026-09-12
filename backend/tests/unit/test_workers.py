"""Worker contract tests (Definitive Plan — Phase 8).

Static shape only: scheduler registration function + interval constants.
"""

from __future__ import annotations

import inspect

from nexafreight.workers import disruption_detector, sla_monitor


def test_disruption_detector_worker_contract() -> None:
    assert inspect.isfunction(disruption_detector.register_jobs)
    sig = inspect.signature(disruption_detector.register_jobs)
    assert len(sig.parameters) == 2  # (scheduler, session_factory)
    # Plan §Phase 2: congestion scan is a daily 06:00 cron; vessel-delay scan stays 15-min
    assert disruption_detector.SCHEDULER_INTERVAL_MINUTES == 15
    # Jobs are importable pure coroutines
    assert inspect.iscoroutinefunction(disruption_detector.check_shipments)
    assert inspect.iscoroutinefunction(disruption_detector.check_vessel_delays)


def test_sla_monitor_worker_contract() -> None:
    assert inspect.isfunction(sla_monitor.register_jobs)
    sig = inspect.signature(sla_monitor.register_jobs)
    assert len(sig.parameters) == 2
    assert sla_monitor.SCHEDULER_INTERVAL_MINUTES == 15
    assert inspect.iscoroutinefunction(sla_monitor.run_sla_sweep)
