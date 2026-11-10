"""Seed and activate a globally distributed multimodal fleet across the world.

Covers:
- North America (US coast-to-coast trucking: NY to LA)
- Europe (Rotterdam to Hamburg highway freight)
- Trans-Pacific shipping (Shanghai to Los Angeles)
- Trans-Atlantic shipping (New York to Rotterdam)
- Middle East to India shipping (Jebel Ali Dubai to Mundra)
- Southeast Asia to India shipping (Singapore to Mumbai)
- South America to South Africa shipping (Santos to Durban)
- Intercontinental air cargo flights (Delhi-Hamburg, Singapore-Tokyo, LA-Delhi, Sydney-Singapore)
- Plus domestic Indian express corridors (Road, Rail, Air)
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from sqlalchemy import create_engine, select, text

logger = logging.getLogger("nexafreight.fleet")

GLOBAL_SHIPMENT_SPECS = [
    {
        "id": "glob-road-us-001",
        "order_num": "ORD-GLOB-US-001",
        "origin_locode": "USNYC",
        "dest_locode": "USLAX",
        "mode": "ROAD",
        "edge_id": 133,
        "flight_num": None,
        "vessel_id": None,
        "duration_hours": 48.0,
        "dist_km": 4738.0,
        "co2_kg": 2840.0,
    },
    {
        "id": "glob-road-eu-001",
        "order_num": "ORD-GLOB-EU-001",
        "origin_locode": "NLRTM",
        "dest_locode": "DEHAM",
        "mode": "ROAD",
        "edge_id": 135,
        "flight_num": None,
        "vessel_id": None,
        "duration_hours": 12.0,
        "dist_km": 488.0,
        "co2_kg": 290.0,
    },
    {
        "id": "glob-sea-pac-001",
        "order_num": "ORD-GLOB-PAC-001",
        "origin_locode": "CNSHA",
        "dest_locode": "USLAX",
        "mode": "SEA",
        "edge_id": 121,
        "flight_num": None,
        "vessel_id": 1,
        "duration_hours": 168.0,
        "dist_km": 10450.0,
        "co2_kg": 1580.0,
    },
    {
        "id": "glob-sea-atl-001",
        "order_num": "ORD-GLOB-ATL-001",
        "origin_locode": "USNYC",
        "dest_locode": "NLRTM",
        "mode": "SEA",
        "edge_id": 125,
        "flight_num": None,
        "vessel_id": 2,
        "duration_hours": 144.0,
        "dist_km": 5860.0,
        "co2_kg": 920.0,
    },
    {
        "id": "glob-sea-me-001",
        "order_num": "ORD-GLOB-ME-001",
        "origin_locode": "AEBUE",
        "dest_locode": "INMUN",
        "mode": "SEA",
        "edge_id": 114,
        "flight_num": None,
        "vessel_id": 3,
        "duration_hours": 72.0,
        "dist_km": 1510.0,
        "co2_kg": 380.0,
    },
    {
        "id": "glob-sea-sg-001",
        "order_num": "ORD-GLOB-SG-001",
        "origin_locode": "SGSIN",
        "dest_locode": "INJNP",
        "mode": "SEA",
        "edge_id": 112,
        "flight_num": None,
        "vessel_id": 4,
        "duration_hours": 96.0,
        "dist_km": 3900.0,
        "co2_kg": 640.0,
    },
    {
        "id": "glob-sea-sa-001",
        "order_num": "ORD-GLOB-SA-001",
        "origin_locode": "BRSSZ",
        "dest_locode": "ZADUR",
        "mode": "SEA",
        "edge_id": 131,
        "flight_num": None,
        "vessel_id": 5,
        "duration_hours": 192.0,
        "dist_km": 7550.0,
        "co2_kg": 1210.0,
    },
    {
        "id": "glob-air-eu-001",
        "order_num": "ORD-GLOB-AIREU-001",
        "origin_locode": "INDEL",
        "dest_locode": "DEHAM",
        "mode": "AIR",
        "edge_id": None,
        "flight_num": "NX-801",
        "vessel_id": None,
        "duration_hours": 9.0,
        "dist_km": 5850.0,
        "co2_kg": 4200.0,
    },
    {
        "id": "glob-air-asia-001",
        "order_num": "ORD-GLOB-AIRAS-001",
        "origin_locode": "SGSIN",
        "dest_locode": "JPTYO",
        "mode": "AIR",
        "edge_id": None,
        "flight_num": "NX-502",
        "vessel_id": None,
        "duration_hours": 7.5,
        "dist_km": 5320.0,
        "co2_kg": 3850.0,
    },
    {
        "id": "glob-air-us-001",
        "order_num": "ORD-GLOB-AIRUS-001",
        "origin_locode": "USLAX",
        "dest_locode": "INDEL",
        "mode": "AIR",
        "edge_id": None,
        "flight_num": "NX-104",
        "vessel_id": None,
        "duration_hours": 18.0,
        "dist_km": 12870.0,
        "co2_kg": 9100.0,
    },
    {
        "id": "glob-air-oce-001",
        "order_num": "ORD-GLOB-AIROC-001",
        "origin_locode": "AUSYD",
        "dest_locode": "SGSIN",
        "mode": "AIR",
        "edge_id": None,
        "flight_num": "NX-308",
        "vessel_id": None,
        "duration_hours": 8.5,
        "dist_km": 6300.0,
        "co2_kg": 4500.0,
    },
]


def ensure_global_shipments(conn, now: datetime):
    """Insert global intercontinental shipments and legs if not already present."""
    from nexafreight.adapters.routing.sea_route import compute_sea_route
    from nexafreight.adapters.routing._geometry import great_circle_geojson_str

    # Fetch locations for IDs and lat/lons
    locs_res = conn.execute(text("SELECT id, locode, latitude, longitude FROM locations WHERE locode IS NOT NULL")).fetchall()
    loc_id_map = {r[1]: r[0] for r in locs_res}
    loc_coord_map = {r[1]: (float(r[2]), float(r[3])) for r in locs_res}

    # Fetch edge geometries
    edges_res = conn.execute(text("SELECT id, geometry_json FROM network_edges WHERE geometry_json IS NOT NULL")).fetchall()
    edges_geom = {r[0]: r[1] for r in edges_res}

    created_at = now.strftime("%Y-%m-%d %H:%M:%S")

    for spec in GLOBAL_SHIPMENT_SPECS:
        s_id = spec["id"]
        o_code = spec["origin_locode"]
        d_code = spec["dest_locode"]
        o_id = loc_id_map.get(o_code)
        d_id = loc_id_map.get(d_code)
        if not o_id or not d_id:
            logger.warning("Could not resolve location IDs for %s -> %s", o_code, d_code)
            continue

        mode = spec["mode"]

        # 1. Ensure shipment exists
        existing_s = conn.execute(text(f"SELECT id FROM shipments WHERE id = '{s_id}'")).fetchone()
        if not existing_s:
            conn.execute(
                text(f"""
                INSERT INTO shipments (
                    id, origin_id, destination_id, primary_transport_mode,
                    cargo_class, container_count, status, route_version,
                    planned_departure, strictest_sla_deadline, provenance, created_at, updated_at
                ) VALUES (
                    '{s_id}', {o_id}, {d_id}, '{mode}',
                    'GENERAL', 2, 'IN_TRANSIT', 1,
                    '{created_at}', '{created_at}', 'REAL', '{created_at}', '{created_at}'
                )
                """)
            )

        # 2. Compute or retrieve geometry
        geom_json = None
        if spec["edge_id"] and spec["edge_id"] in edges_geom:
            geom_json = edges_geom[spec["edge_id"]]
        elif mode == "SEA" and o_code in loc_coord_map and d_code in loc_coord_map:
            o_lat, o_lon = loc_coord_map[o_code]
            d_lat, d_lon = loc_coord_map[d_code]
            try:
                res = compute_sea_route(o_lat, o_lon, d_lat, d_lon)
                geom_json = res.geometry_geojson
            except Exception:
                geom_json = great_circle_geojson_str(o_lat, o_lon, d_lat, d_lon)
        elif mode == "AIR" and o_code in loc_coord_map and d_code in loc_coord_map:
            o_lat, o_lon = loc_coord_map[o_code]
            d_lat, d_lon = loc_coord_map[d_code]
            geom_json = great_circle_geojson_str(o_lat, o_lon, d_lat, d_lon, n=24)

        if not geom_json:
            continue

        # Timings relative to current time so vehicle is actively in motion
        dep_time = (now - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S")
        arr_time = (now + timedelta(hours=spec["duration_hours"] - 2)).strftime("%Y-%m-%d %H:%M:%S")

        # Escaped geometry string for SQL
        escaped_geom = geom_json.replace("'", "''")

        # 3. Ensure leg exists and is active
        existing_l = conn.execute(text(f"SELECT id FROM legs WHERE shipment_id = '{s_id}'")).fetchone()
        if not existing_l:
            flight_val = f"'{spec['flight_num']}'" if spec["flight_num"] else "NULL"
            vessel_val = str(spec["vessel_id"]) if spec["vessel_id"] else "NULL"

            conn.execute(
                text(f"""
                INSERT INTO legs (
                    shipment_id, sequence_number, route_version, transport_mode,
                    status, origin_id, destination_id, flight_number, vessel_id,
                    planned_departure, actual_departure, planned_arrival,
                    route_geometry_json, distance_km, co2_kg, provenance, created_at, updated_at
                ) VALUES (
                    '{s_id}', 1, 1, '{mode}',
                    'IN_PROGRESS', {o_id}, {d_id}, {flight_val}, {vessel_val},
                    '{dep_time}', '{dep_time}', '{arr_time}',
                    '{escaped_geom}', {spec['dist_km']}, {spec['co2_kg']}, 'REAL', '{created_at}', '{created_at}'
                )
                """)
            )
        else:
            # Refresh schedule to stay in progress
            conn.execute(
                text(f"""
                UPDATE legs
                SET status = 'IN_PROGRESS',
                    planned_departure = '{dep_time}',
                    actual_departure = '{dep_time}',
                    planned_arrival = '{arr_time}',
                    route_geometry_json = '{escaped_geom}'
                WHERE shipment_id = '{s_id}'
                """)
            )


def activate():
    import os
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        sync_url = db_url.replace("postgresql+asyncpg://", "postgresql://").replace("sqlite+aiosqlite:///", "sqlite:///")
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
        # Seed global cross-continent shipments
        ensure_global_shipments(conn, now)

        # Activate domestic and regional AIR legs
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
                LIMIT 15
            )
            """)
        )

        # Activate ROAD legs (trucks)
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
                LIMIT 25
            )
            """)
        )

        # Activate RAIL legs (trains)
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
                LIMIT 10
            )
            """)
        )

        # Activate SEA legs (container ships)
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
                LIMIT 20
            )
            """)
        )

        # Set parent shipments to IN_TRANSIT
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

        # Upgrade existing ROAD legs with matching real highway geometries via locode mapping
        locode_to_node = {r[1]: r[0] for r in conn.execute(text("SELECT id, locode FROM network_nodes WHERE locode IS NOT NULL")).fetchall()}
        edge_geoms = {
            (r[0], r[1]): r[2]
            for r in conn.execute(
                text("SELECT from_node_id, to_node_id, geometry_json FROM network_edges WHERE mode = 'ROAD' AND geometry_json IS NOT NULL")
            ).fetchall()
        }

        road_legs = conn.execute(text("""
            SELECT l.id, loc1.locode, loc2.locode
            FROM legs l
            JOIN locations loc1 ON l.origin_id = loc1.id
            JOIN locations loc2 ON l.destination_id = loc2.id
            WHERE l.transport_mode = 'ROAD'
        """)).fetchall()

        synced_road_legs = 0
        for leg_id, orig_code, dest_code in road_legs:
            from_node = locode_to_node.get(orig_code)
            to_node = locode_to_node.get(dest_code)
            if from_node and to_node and (from_node, to_node) in edge_geoms:
                geom = edge_geoms[(from_node, to_node)]
                conn.execute(
                    text("UPDATE legs SET route_geometry_json = :geom WHERE id = :leg_id"),
                    {"geom": geom, "leg_id": leg_id}
                )
                synced_road_legs += 1
        if synced_road_legs > 0:
            print(f"Synced real curved highway geometry to {synced_road_legs} road legs.")

    print("Successfully activated live global multimodal fleet relative to current time!")

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
