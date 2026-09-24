#!/usr/bin/env python3
"""
20_build_demo_world.py
======================
Task 6 (Time-World) — builds and anchors the demo world.

What it does
------------
1. Preflight (fail loud, same style as the 11_train E2 guard): verifies the
   multimodal network is seeded (network_nodes/network_edges), the hub
   locations exist (02_ingest_unlocode), and the ETA artifact is in place —
   the demo loop needs all three to be alive.
2. Re-anchors the Time-World: writes the four time_world.* parameters
   (anchor = build instant, warp = --warp, boot = build instant) into
   parameter_empirical, using core.clock.configure() as the single source
   of the key/value semantics.
3. --reset: deletes the previous SIMULATED world (alerts, decisions,
   disruptions, positions, legs, orders, shipments, route plans) in FK-safe
   order. Refuses to run without the flag — the demo world is precious.

Run order contract:
    alembic upgrade head                      (schema + India network seed)
    scripts/02_ingest_unlocode.py             (locations)
    scripts/20_build_demo_world.py            <-- YOU ARE HERE
    scripts/21_drip_orders.py --once          (world starts breathing)

Default warp is 1.0: the world runs on honest real time and every existing
worker (interpolator, SLA checker, disruption detector) just works on it.
"""

from __future__ import annotations

import asyncio
import argparse
import logging
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import delete, func, select  # noqa: E402

from nexafreight.config import get_settings  # noqa: E402
from nexafreight.core.clock import configure  # noqa: E402
from nexafreight.database import get_session_factory  # noqa: E402
from nexafreight.enums import Provenance  # noqa: E402
from nexafreight.models.alert import Alert  # noqa: E402
from nexafreight.models.decision import Decision  # noqa: E402
from nexafreight.models.disruption import Disruption  # noqa: E402
from nexafreight.models.leg import Leg  # noqa: E402
from nexafreight.models.network import NetworkEdge, NetworkNode  # noqa: E402
from nexafreight.models.order import Order  # noqa: E402
from nexafreight.models.parameter import ParameterEmpirical  # noqa: E402
from nexafreight.models.position import PositionReport  # noqa: E402
from nexafreight.models.shipment import Shipment  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("build_demo_world")

ETA_ARTIFACT = Path(__file__).resolve().parent.parent / "models" / "eta_quantile" / "model.joblib"


async def preflight() -> dict:
    """Verify the world's prerequisites; fail loud with the missing piece."""
    problems: list[str] = []

    async with get_session_factory()() as session:
        node_count = (await session.execute(select(func.count()).select_from(NetworkNode))).scalar_one()
        edge_count = (await session.execute(select(func.count()).select_from(NetworkEdge))).scalar_one()
        if node_count < 5:
            problems.append(
                f"network_nodes has {node_count} rows (need >=5). Run: alembic upgrade head"
            )
        if edge_count < 5:
            problems.append(
                f"network_edges has {edge_count} rows (need >=5). Run: alembic upgrade head"
            )

        mode_hist = (
            await session.execute(
                select(NetworkNode.node_type, func.count()).group_by(NetworkNode.node_type)
            )
        ).all()

        in_locodes = (
            await session.execute(
                select(func.count()).select_from(NetworkNode).where(NetworkNode.locode.like("IN%"))
            )
        ).scalar_one()
        if in_locodes < 2:
            problems.append(
                f"only {in_locodes} IN* network nodes — the India demo world needs the "
                "migration-seeded network (alembic upgrade head)"
            )

    if not ETA_ARTIFACT.exists():
        problems.append(
            f"ETA artifact missing at {ETA_ARTIFACT} — run scripts/11_train_eta_model.py"
        )

    if problems:
        for p in problems:
            log.error("PREFLIGHT FAIL: %s", p)
        raise SystemExit(2)

    log.info(
        "Preflight OK: %d network nodes, %d edges, ETA artifact present",
        node_count,
        edge_count,
    )
    return {"node_count": node_count, "edge_count": edge_count, "mode_hist": mode_hist}


async def reset_world() -> int:
    """Delete the SIMULATED demo world in FK-safe order. Returns rows removed."""
    async with get_session_factory()() as session:
        shipment_ids = (
            (
                await session.execute(
                    select(Shipment.id).where(Shipment.provenance == Provenance.SIMULATED)
                )
            )
            .scalars()
            .all()
        )
        if not shipment_ids:
            log.info("No SIMULATED shipments found — nothing to reset.")
            return 0

        # children by shipment_id (string FKs)
        await session.execute(delete(Alert).where(Alert.shipment_id.in_(shipment_ids)))
        await session.execute(delete(Decision).where(Decision.shipment_id.in_(shipment_ids)))
        await session.execute(delete(Disruption).where(Disruption.shipment_id.in_(shipment_ids)))
        # route plans reference shipment_id as a plain string column
        from nexafreight.models.route_plan import RoutePlanRecord  # local: heavy module

        await session.execute(
            delete(RoutePlanRecord).where(RoutePlanRecord.shipment_id.in_(shipment_ids))
        )
        # legs -> positions (positions FK legs)
        leg_ids = (
            (await session.execute(select(Leg.id).where(Leg.shipment_id.in_(shipment_ids))))
            .scalars()
            .all()
        )
        if leg_ids:
            await session.execute(delete(PositionReport).where(PositionReport.leg_id.in_(leg_ids)))
        await session.execute(delete(Leg).where(Leg.shipment_id.in_(shipment_ids)))
        await session.execute(delete(Order).where(Order.shipment_id.in_(shipment_ids)))
        await session.execute(delete(Shipment).where(Shipment.id.in_(shipment_ids)))
        await session.commit()

    log.info("Reset complete: removed %d SIMULATED shipments (with children).", len(shipment_ids))
    return len(shipment_ids)


async def anchor_world(warp: float) -> dict[str, str]:
    """Write the time_world.* parameters (upsert by key)."""
    now = datetime.now(UTC)
    kv = configure(anchor=now, warp=warp, boot_real=now)

    async with get_session_factory()() as session:
        for key, value in kv.items():
            row = await session.get(ParameterEmpirical, key)
            if row is None:
                row = ParameterEmpirical(
                    key=key,
                    value=value,
                    unit="n/a",
                    source="TIME_WORLD",
                    as_of=now,
                    derivation_method=(
                        "task-6 demo world build: anchor=build instant, "
                        f"warp from --warp (default 1.0 = real time)"
                    ),
                )
            else:
                row.value = value
                row.as_of = now
                row.source = "TIME_WORLD"
            await session.merge(row)
        await session.commit()

    log.info("World anchored: warp=%s anchor=%s", warp, kv["time_world.anchor_iso"])
    return kv


async def densify_schedules(days_ahead: int = 21) -> None:
    """Ensure every edge has a usable service cadence (task-7 wire).

    The migration-seeded timetable is sparse (weekly services), which makes
    the demo map dead: almost every leg is either COMPLETED or waiting days
    for the next departure. Generate SIMULATED services at a demo cadence —
    ROAD/RAIL every 6h, AIR every 12h, SEA every 24h — with durations from
    the SAME parameter keys the planner uses (no hardcoded speeds; knots
    keys get the 1.852 conversion, mirroring planner._get_speed).

    Idempotent: previously generated rows (service_name prefix 'DENSIFIED')
    are replaced on each run; seeded/live schedules are untouched.
    """
    from nexafreight.enums import TransportMode
    from nexafreight.core import params
    from nexafreight.models.network import EdgeSchedule

    cadence_h = {
        TransportMode.ROAD: 6,
        TransportMode.RAIL: 6,
        TransportMode.AIR: 12,
        TransportMode.SEA: 24,
    }
    now = datetime.now(UTC)
    # The timetable must exist in HISTORY too: backfilled orders plan at their
    # own order moment (days/weeks back). Without past services those queries
    # find nothing and every container teleports to "today" (found live —
    # delivered=0 world).
    horizon_start = now - timedelta(days=30)
    horizon_end = now + timedelta(days=days_ahead)

    async with get_session_factory()() as session:
        edges = (await session.execute(select(NetworkEdge))).scalars().all()
        generated = 0
        for edge in edges:
            mode = edge.mode if isinstance(edge.mode, TransportMode) else TransportMode(str(edge.mode))
            cad = cadence_h.get(mode, 12)

            # Replace only our own generated rows.
            from sqlalchemy import delete as _delete

            await session.execute(
                _delete(EdgeSchedule).where(
                    EdgeSchedule.edge_id == edge.id,
                    EdgeSchedule.service_name.like("DENSIFIED-%"),
                )
            )

            speed = params.get_float(edge.transit_speed_param_key, 40.0)
            if "kn" in str(edge.transit_speed_param_key):
                speed *= 1.852  # knots → km/h (mirrors planner._get_speed)
            if speed <= 0:
                continue
            # Floor: tiny connector edges (drayage hub→terminal, distance ~0)
            # would generate zero-duration services (dep==arr) that confuse
            # leg-status math. 0.5h minimum is honest for a connector.
            duration_h = max(0.5, edge.distance_km / speed)

            dep = horizon_start.replace(minute=0, second=0, microsecond=0)
            step = timedelta(hours=cad)
            while dep <= horizon_end:
                session.add(
                    EdgeSchedule(
                        edge_id=edge.id,
                        service_name=f"DENSIFIED-{edge.id}-{dep:%Y%m%d%H%M}",
                        departure_at=dep,
                        arrival_at=dep + timedelta(hours=round(duration_h, 2)),
                        provenance="SIMULATED",
                    )
                )
                generated += 1
                dep += step
        await session.commit()
    log.info("Densified schedules: %d services generated across %d edges.", generated, len(edges))


async def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--warp", type=float, default=1.0, help="world seconds per real second (default 1.0)")
    ap.add_argument("--reset", action="store_true", help="delete the previous SIMULATED world first")
    args = ap.parse_args()

    get_settings()  # fail fast on missing JWT_SECRET etc.
    stats = await preflight()

    if args.reset:
        await reset_world()

    kv = await anchor_world(args.warp)
    await densify_schedules()

    log.info("=" * 54)
    log.info("Demo world ready")
    log.info("  nodes: %d  edges: %d", stats["node_count"], stats["edge_count"])
    for node_type, count in stats["mode_hist"]:
        log.info("    %-14s %d", str(node_type), count)
    log.info("  anchor : %s", kv["time_world.anchor_iso"])
    log.info("  warp   : %s", kv["time_world.warp"])
    log.info("Next: python scripts/21_drip_orders.py --once")
    log.info("=" * 54)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
