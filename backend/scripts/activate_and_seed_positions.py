"""Script to activate demo shipments and seed initial interpolated positions."""

from __future__ import annotations

import asyncio
import sqlite3

from nexafreight.database import get_session_factory
from nexafreight.workers.position_interpolator import _run_interpolation_job


def activate_legs() -> None:
    con = sqlite3.connect("./data/nexafreight.db")
    cur = con.cursor()
    cur.execute(
        "UPDATE shipments SET status = 'IN_TRANSIT' "
        "WHERE id IN (SELECT id FROM shipments WHERE status != 'DELAYED' LIMIT 500);"
    )
    # Activate road, air, rail and sea legs with fresh ongoing timelines
    cur.execute(
        "UPDATE legs SET status = 'IN_PROGRESS', "
        "actual_departure = datetime('now', '-30 minutes'), "
        "planned_departure = datetime('now', '-30 minutes'), "
        "planned_arrival = datetime('now', '+6 hours') "
        "WHERE id IN (SELECT id FROM legs WHERE transport_mode = 'ROAD' LIMIT 30);"
    )
    cur.execute(
        "UPDATE legs SET status = 'IN_PROGRESS', "
        "actual_departure = datetime('now', '-45 minutes'), "
        "planned_departure = datetime('now', '-45 minutes'), "
        "planned_arrival = datetime('now', '+8 hours') "
        "WHERE id IN (SELECT id FROM legs WHERE transport_mode = 'AIR' LIMIT 15);"
    )
    cur.execute(
        "UPDATE legs SET status = 'IN_PROGRESS', "
        "actual_departure = datetime('now', '-1 hours'), "
        "planned_departure = datetime('now', '-1 hours'), "
        "planned_arrival = datetime('now', '+12 hours') "
        "WHERE id IN (SELECT id FROM legs WHERE transport_mode = 'RAIL' LIMIT 8);"
    )
    # Maritime sea legs: multi-day oceanic voyages active over days
    cur.execute(
        "UPDATE legs SET status = 'IN_PROGRESS', "
        "actual_departure = datetime('now', '-2 days'), "
        "planned_departure = datetime('now', '-2 days'), "
        "planned_arrival = datetime('now', '+5 days') "
        "WHERE status = 'IN_PROGRESS' AND transport_mode = 'SEA';"
    )
    con.commit()
    in_prog = cur.execute("SELECT COUNT(*) FROM legs WHERE status = 'IN_PROGRESS';").fetchone()[0]
    sea_in_prog = cur.execute("SELECT COUNT(*) FROM legs WHERE status = 'IN_PROGRESS' AND transport_mode = 'SEA';").fetchone()[0]
    print(f"Active IN_PROGRESS legs: {in_prog} (Maritime SEA legs: {sea_in_prog})")
    con.close()


async def run_worker() -> None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        await _run_interpolation_job(session)


def check_positions() -> None:
    con = sqlite3.connect("./data/nexafreight.db")
    cur = con.cursor()
    count = cur.execute("SELECT COUNT(*) FROM position_reports;").fetchone()[0]
    print(f"Total position reports in database: {count}")
    cur.execute(
        "SELECT leg_id, asset_type, latitude, longitude, provenance, reported_at "
        "FROM position_reports LIMIT 5;"
    )
    for row in cur.fetchall():
        print("  Sample position:", row)
    con.close()


if __name__ == "__main__":
    activate_legs()
    asyncio.run(run_worker())
    check_positions()
