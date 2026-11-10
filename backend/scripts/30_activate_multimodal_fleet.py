"""Activate multimodal fleet legs (SEA, AIR, ROAD, RAIL) dynamically relative to UTC now.

Supports both SQLite (local development) and PostgreSQL (Neon in CI / Render).
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Ensure src is on python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session


def activate():
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        # Normalize async postgres url to sync if needed for this script
        sync_url = db_url.replace("postgresql+asyncpg://", "postgresql://").replace("sqlite+aiosqlite:///", "sqlite:///")
        # Ensure sslmode for Neon if not present
        if "neon.tech" in sync_url and "sslmode" not in sync_url:
            sync_url += "?sslmode=require"
        engine = create_engine(sync_url)
    else:
        db_path = Path(__file__).resolve().parent.parent / "data" / "nexafreight.db"
        engine = create_engine(f"sqlite:///{db_path}")

    now = datetime.now(timezone.utc)
    t_start_2h = (now - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S")
    t_act_2h = (now - timedelta(hours=1, minutes=55)).strftime("%Y-%m-%d %H:%M:%S")
    t_end_air = (now + timedelta(hours=5)).strftime("%Y-%m-%d %H:%M:%S")
    t_end_road = (now + timedelta(hours=10)).strftime("%Y-%m-%d %H:%M:%S")
    t_end_rail = (now + timedelta(hours=24)).strftime("%Y-%m-%d %H:%M:%S")
    t_end_sea = (now + timedelta(hours=72)).strftime("%Y-%m-%d %H:%M:%S")

    with engine.begin() as conn:
        # 1. Activate AIR legs (planes in the air right now)
        conn.execute(
            text(f"""
            UPDATE legs
            SET status = 'IN_PROGRESS',
                planned_departure = '{t_start_2h}',
                actual_departure = '{t_act_2h}',
                planned_arrival = '{t_end_air}'
            WHERE id IN (
                SELECT id FROM legs
                WHERE transport_mode = 'AIR'
                  AND route_geometry_json IS NOT NULL
                LIMIT 8
            )
            """)
        )

        # 2. Activate ROAD legs (trucks driving on highways right now)
        conn.execute(
            text(f"""
            UPDATE legs
            SET status = 'IN_PROGRESS',
                planned_departure = '{t_start_2h}',
                actual_departure = '{t_act_2h}',
                planned_arrival = '{t_end_road}'
            WHERE id IN (
                SELECT id FROM legs
                WHERE transport_mode = 'ROAD'
                  AND route_geometry_json IS NOT NULL
                LIMIT 15
            )
            """)
        )

        # 3. Activate RAIL legs (trains hauling cargo right now)
        conn.execute(
            text(f"""
            UPDATE legs
            SET status = 'IN_PROGRESS',
                planned_departure = '{t_start_2h}',
                actual_departure = '{t_act_2h}',
                planned_arrival = '{t_end_rail}'
            WHERE id IN (
                SELECT id FROM legs
                WHERE transport_mode = 'RAIL'
                  AND route_geometry_json IS NOT NULL
                LIMIT 6
            )
            """)
        )

        # 4. Activate SEA legs (container ships sailing ocean lanes right now)
        conn.execute(
            text(f"""
            UPDATE legs
            SET status = 'IN_PROGRESS',
                planned_departure = '{t_start_2h}',
                actual_departure = '{t_act_2h}',
                planned_arrival = '{t_end_sea}'
            WHERE id IN (
                SELECT id FROM legs
                WHERE transport_mode = 'SEA'
                  AND route_geometry_json IS NOT NULL
                LIMIT 12
            )
            """)
        )

        # 5. Ensure all parent shipments for IN_PROGRESS legs are IN_TRANSIT
        conn.execute(
            text("""
            UPDATE shipments
            SET status = 'IN_TRANSIT'
            WHERE id IN (
                SELECT DISTINCT shipment_id
                FROM legs
                WHERE status = 'IN_PROGRESS'
                  AND shipment_id IS NOT NULL
            )
            """)
        )

    print("Successfully activated live multimodal fleet relative to current time!")

    # Verify breakdown
    with engine.connect() as conn:
        res = conn.execute(
            text("""
            SELECT transport_mode, count(*)
            FROM legs
            WHERE status = 'IN_PROGRESS'
            GROUP BY transport_mode
            """)
        ).fetchall()
        print("IN_PROGRESS legs by mode:")
        for r in res:
            print(f"  {r[0]}: {r[1]}")


if __name__ == "__main__":
    activate()
