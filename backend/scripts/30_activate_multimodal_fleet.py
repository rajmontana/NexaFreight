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


def sync_road_edge_geometries(conn):
    """Sync precomputed curved highway geometries from cached JSON to network_edges and road legs."""
    geom_file = Path(__file__).resolve().parent.parent / "models" / "congestion" / "road_edge_geometries.json"
    if not geom_file.exists():
        geom_file = Path(__file__).resolve().parent.parent / "data" / "road_edge_geometries.json"
    if not geom_file.exists():
        return
    with open(geom_file, "r") as f:
        geoms = json.load(f)

    loc_nodes = {r[1]: r[0] for r in conn.execute(text("SELECT id, locode FROM network_nodes WHERE locode IS NOT NULL")).fetchall()}
    updated_edges = 0
    for key, g_str in geoms.items():
        orig, dest = key.split("->")
        n1 = loc_nodes.get(orig)
        n2 = loc_nodes.get(dest)
        if n1 and n2:
            conn.execute(
                text("""
                    UPDATE network_edges
                    SET geometry_json = :geom
                    WHERE from_node_id = :n1 AND to_node_id = :n2 AND mode = 'ROAD'
                """),
                {"geom": g_str, "n1": n1, "n2": n2}
            )
            updated_edges += 1
    if updated_edges > 0:
        print(f"Synced {updated_edges} high-res curved highway geometries to network_edges.")


def ensure_corridor_alternatives(conn, now: datetime):
    """Seed verified corridor alternatives with broad applicability."""
    created_at = now.strftime("%Y-%m-%d %H:%M:%S")
    corridors = [
        (
            "VIA_CAPE",
            "Cape of Good Hope diversion (Suez / Red Sea bypass)",
            json.dumps(["VESSEL_DELAY", "PORT_CONGESTION", "WEATHER", "MANUAL"]),
            json.dumps({"legs": [{"mode": "SEA", "to": "DESTINATION"}], "via": "Cape of Good Hope"}),
            1.72, 240.0, 1.72
        ),
        (
            "DIVERT_ALTERNATE_PORT",
            "Divert to secondary deepwater container terminal",
            json.dumps(["PORT_CONGESTION", "WEATHER", "VESSEL_DELAY", "MANUAL"]),
            json.dumps({"legs": [{"mode": "SEA", "to": "ALTERNATE_PORT"}, {"mode": "ROAD", "to": "DESTINATION"}]}),
            1.14, 36.0, 1.12
        ),
        (
            "MODAL_SHIFT_AIR",
            "Express Air Cargo charter modal shift",
            json.dumps(["VESSEL_DELAY", "PORT_CONGESTION", "WEATHER", "MANUAL"]),
            json.dumps({"legs": [{"mode": "AIR", "to": "DESTINATION"}]}),
            2.85, -48.0, 4.20
        ),
    ]
    for opt_key, d_name, app_types, r_tmpl, cost_f, time_h, co2_f in corridors:
        row = conn.execute(text(f"SELECT id FROM corridor_alternatives WHERE option_key = '{opt_key}'")).fetchone()
        if not row:
            conn.execute(text(f"""
                INSERT INTO corridor_alternatives (
                    option_key, display_name, applicable_disruption_types_json,
                    route_template_json, cost_delta_factor, time_delta_hours, co2_delta_factor,
                    created_at, updated_at
                ) VALUES (
                    '{opt_key}', '{d_name}', '{app_types}',
                    '{r_tmpl}', {cost_f}, {time_h}, {co2_f},
                    '{created_at}', '{created_at}'
                )
            """))
        else:
            conn.execute(text(f"""
                UPDATE corridor_alternatives
                SET applicable_disruption_types_json = '{app_types}',
                    display_name = '{d_name}',
                    cost_delta_factor = {cost_f},
                    time_delta_hours = {time_h},
                    co2_delta_factor = {co2_f}
                WHERE option_key = '{opt_key}'
            """))


def ensure_global_orders(conn, now: datetime):
    """Ensure orders exist for all global shipments with calibrated revenue and SLAs."""
    created_at = now.strftime("%Y-%m-%d %H:%M:%S")
    order_specs = [
        ("ORD-GLOB-ME-001A", "glob-sea-me-001", 48500.0, 5200.0, 12, "SEA", "STANDARD", 24000.0, 68.0),
        ("ORD-GLOB-ME-001B", "glob-sea-me-001", 36000.0, 4100.0, 18, "SEA", "STANDARD", 18000.0, 52.0),
        ("ORD-GLOB-EU-001A", "glob-road-eu-001", 28000.0, 1800.0, 6, "ROAD", "STANDARD", 14000.0, 45.0),
        ("ORD-GLOB-PAC-001A", "glob-sea-pac-001", 62000.0, 7500.0, 24, "SEA", "STANDARD", 28000.0, 74.0),
        ("ORD-GLOB-PAC-001B", "glob-sea-pac-001", 44000.0, 5800.0, 36, "SEA", "STANDARD", 22000.0, 60.0),
        ("ORD-GLOB-US-001A", "glob-road-us-001", 22500.0, 2400.0, 8, "ROAD", "STANDARD", 16000.0, 50.0),
        ("ORD-GLOB-ATL-001A", "glob-sea-atl-001", 54000.0, 6200.0, 20, "SEA", "STANDARD", 26000.0, 70.0),
        ("ORD-GLOB-SG-001A", "glob-sea-sg-001", 38000.0, 4400.0, 14, "SEA", "STANDARD", 20000.0, 55.0),
        ("ORD-GLOB-SA-001A", "glob-sea-sa-001", 41000.0, 4900.0, 22, "SEA", "STANDARD", 21000.0, 58.0),
        ("ORD-GLOB-AIREU-001A", "glob-air-eu-001", 72000.0, 12500.0, 4, "AIR", "HIGH_VALUE", 4500.0, 18.0),
        ("ORD-GLOB-AIRAS-001A", "glob-air-asia-001", 68000.0, 11800.0, 4, "AIR", "HIGH_VALUE", 4200.0, 16.0),
        ("ORD-GLOB-AIRUS-001A", "glob-air-us-001", 85000.0, 16000.0, 6, "AIR", "HIGH_VALUE", 5200.0, 22.0),
    ]

    for ord_num, s_id, rev, cost, sla_buf_h, mode, cargo, wt, vol in order_specs:
        leg_row = conn.execute(text(f"SELECT planned_arrival FROM legs WHERE shipment_id = '{s_id}' ORDER BY sequence_number DESC LIMIT 1")).fetchone()
        if not leg_row or not leg_row[0]:
            continue
        plan_arr_str = str(leg_row[0])
        try:
            plan_arr = datetime.fromisoformat(plan_arr_str.replace("Z", "+00:00"))
        except Exception:
            plan_arr = now + timedelta(hours=48)
        sla_dl = (plan_arr + timedelta(hours=sla_buf_h)).strftime("%Y-%m-%d %H:%M:%S")
        ord_date = (now - timedelta(days=4)).strftime("%Y-%m-%d %H:%M:%S")

        existing_ord = conn.execute(text(f"SELECT id FROM orders WHERE order_number = '{ord_num}'")).fetchone()
        if not existing_ord:
            conn.execute(text(f"""
                INSERT INTO orders (
                    order_number, shipment_id, order_date, sla_deadline,
                    revenue, shipping_cost, sla_status, shipping_mode, cargo_class,
                    weight_kg, volume_m3, created_at, updated_at
                ) VALUES (
                    '{ord_num}', '{s_id}', '{ord_date}', '{sla_dl}',
                    {rev}, {cost}, 'ON_TIME', '{mode}', '{cargo}',
                    {wt}, {vol}, '{created_at}', '{created_at}'
                )
            """))


def seed_active_disruptions_and_alerts(conn, now: datetime):
    """Seed active disruptions and alerts powered by ML inferences across sea, air, and road corridors."""
    import math
    import uuid

    # Load ML models if available
    delay_booster = None
    eta_model = None
    try:
        from nexafreight.ml.registry import ModelRegistry
        reg = ModelRegistry()
        booster_dict = reg.get_delay_model()
        delay_booster = booster_dict.get("model", booster_dict)
        eta_model = reg.get_eta_model()
    except Exception as e:
        logger.info("ModelRegistry fallback: %s", e)

    created_at = now.strftime("%Y-%m-%d %H:%M:%S")

    # Find leg IDs for global shipments
    shipment_legs = {}
    for row in conn.execute(text("""
        SELECT shipment_id, id, transport_mode, planned_arrival, distance_km
        FROM legs
        WHERE shipment_id IN ('glob-sea-me-001', 'glob-road-eu-001', 'glob-sea-pac-001', 'glob-road-us-001')
    """)).fetchall():
        shipment_legs[row[0]] = {
            "leg_id": row[1],
            "mode": row[2],
            "planned_arrival": str(row[3]),
            "dist_km": float(row[4] or 1000.0)
        }

    # Also include an active Indian highway shipment (Mundra to Surat)
    ind_road = conn.execute(text("""
        SELECT l.shipment_id, l.id, loc1.locode, loc2.locode, l.planned_arrival, l.distance_km
        FROM legs l
        JOIN locations loc1 ON l.origin_id = loc1.id
        JOIN locations loc2 ON l.destination_id = loc2.id
        WHERE loc1.locode = 'INMUN' AND loc2.locode = 'INSUR'
        LIMIT 1
    """)).fetchone()

    disruptions_to_seed = [
        {
            "shipment_id": "glob-sea-me-001",
            "type": "VESSEL_DELAY",
            "delay_hours": 240.0,
            "corridor_name": "Bab-el-Mandeb / Red Sea",
            "reason": "Naval escort convoy restrictions holding commercial container vessels",
        },
        {
            "shipment_id": "glob-road-eu-001",
            "type": "PORT_CONGESTION",
            "delay_hours": 48.0,
            "corridor_name": "Rotterdam Maasvlakte II",
            "reason": "Terminal gate queue and labor action creating 48-hour outbound drayage backlog",
        },
        {
            "shipment_id": "glob-sea-pac-001",
            "type": "WEATHER",
            "delay_hours": 72.0,
            "corridor_name": "North Pacific Great Circle",
            "reason": "Severe gale swells and Pacific storm front forcing ship to throttle speed and alter course",
        },
        {
            "shipment_id": "glob-road-us-001",
            "type": "WEATHER",
            "delay_hours": 20.0,
            "corridor_name": "Wyoming I-80 Mountain Pass",
            "reason": "Winter blizzard and commercial vehicle chain-law closure holding haulers at dispatch",
        },
    ]

    if ind_road:
        s_ind_id = ind_road[0]
        # Ensure order exists
        ind_ord = conn.execute(text(f"SELECT id FROM orders WHERE shipment_id = '{s_ind_id}'")).fetchone()
        if not ind_ord:
            try:
                plan_arr = datetime.fromisoformat(str(ind_road[4]).replace("Z", "+00:00"))
            except Exception:
                plan_arr = now + timedelta(hours=12)
            sla_dl = (plan_arr + timedelta(hours=6)).strftime("%Y-%m-%d %H:%M:%S")
            conn.execute(text(f"""
                INSERT INTO orders (
                    order_number, shipment_id, order_date, sla_deadline,
                    revenue, shipping_cost, sla_status, shipping_mode, cargo_class,
                    weight_kg, volume_m3, created_at, updated_at
                ) VALUES (
                    'ORD-IND-MUN-SUR-001', '{s_ind_id}', '{created_at}', '{sla_dl}',
                    34000.0, 1400.0, 'ON_TIME', 'ROAD', 'STANDARD',
                    18000.0, 48.0, '{created_at}', '{created_at}'
                )
            """))
        shipment_legs[s_ind_id] = {
            "leg_id": ind_road[1],
            "mode": "ROAD",
            "planned_arrival": str(ind_road[4]),
            "dist_km": float(ind_road[5] or 480.0)
        }
        disruptions_to_seed.append({
            "shipment_id": s_ind_id,
            "type": "PORT_CONGESTION",
            "delay_hours": 24.0,
            "corridor_name": "Mundra SEZ Port Terminal",
            "reason": "Container terminal gate congestion & customs scanning queue delaying road dispatch",
        })

    for d_spec in disruptions_to_seed:
        s_id = d_spec["shipment_id"]
        if s_id not in shipment_legs:
            continue
        leg_info = shipment_legs[s_id]
        leg_id = leg_info["leg_id"]
        mode = leg_info["mode"]
        delay_h = d_spec["delay_hours"]

        # Predict via ML
        prob_delay = 0.72
        eta_p85 = round(delay_h / 24.0 + 1.5, 1)

        if delay_booster and eta_model:
            try:
                import pandas as pd
                from nexafreight.ml.constants import CATEGORICAL_COLUMNS, NUMERIC_COLUMNS
                feat = {
                    "shipping_mode": mode,
                    "cargo_class": "STANDARD",
                    "revenue": 45000.0,
                    "shipping_cost": 4500.0,
                    "scheduled_shipping_days": round(leg_info["dist_km"] / 600.0, 1),
                    "order_country": "United States",
                    "customer_country": "United States",
                    "product_price": 1200.0,
                    "order_profit": 9500.0,
                    "sla_month": now.month,
                    "sla_weekday": now.weekday(),
                    "sla_quarter": (now.month - 1) // 3 + 1,
                    "total_distance_km": leg_info["dist_km"],
                    "leg_count": 1,
                }
                df = pd.DataFrame([feat])
                for col in CATEGORICAL_COLUMNS:
                    if col in df.columns:
                        df[col] = df[col].astype("category")
                for col in NUMERIC_COLUMNS:
                    if col in df.columns:
                        df[col] = pd.to_numeric(df[col], errors="coerce").astype(float)
                prob_delay = float(delay_booster.predict(df)[0])
                ep = eta_model.predict(feat)
                eta_p85 = round(ep.p85_eta_days, 1)
            except Exception as ex:
                logger.debug("ML prediction note: %s", ex)

        risk_band = "CRITICAL" if prob_delay >= 0.75 else "HIGH" if prob_delay >= 0.55 else "MEDIUM"
        ml_tag = f"[ML DELAY: {risk_band} RISK P(delay)={prob_delay:.1%} | ETA P85=+{eta_p85}d]"
        full_desc = f"{ml_tag} {d_spec['corridor_name']} corridor disruption: {d_spec['reason']} (+{int(delay_h)}h estimated delay)."

        # Insert or update active disruption
        existing_d = conn.execute(text(f"SELECT id FROM disruptions WHERE shipment_id = '{s_id}' AND status = 'ACTIVE'")).fetchone()
        if not existing_d:
            d_id = str(uuid.uuid4())
            det_time = (now - timedelta(hours=2)).strftime("%Y-%m-%d %H:%M:%S")
            conn.execute(text(f"""
                INSERT INTO disruptions (
                    id, shipment_id, leg_id, disruption_type, status,
                    description, detected_at, created_at, updated_at
                ) VALUES (
                    '{d_id}', '{s_id}', {leg_id}, '{d_spec['type']}', 'ACTIVE',
                    :desc, '{det_time}', '{created_at}', '{created_at}'
                )
            """), {"desc": full_desc})
        else:
            d_id = existing_d[0]
            conn.execute(text("""
                UPDATE disruptions
                SET description = :desc, updated_at = :upd
                WHERE id = :did
            """), {"desc": full_desc, "upd": created_at, "did": d_id})

        # Insert or update alert
        existing_a = conn.execute(text(f"SELECT id FROM alerts WHERE disruption_id = '{d_id}'")).fetchone()
        if not existing_a:
            orders = conn.execute(text(f"""
                SELECT id, order_number, revenue, sla_deadline
                FROM orders WHERE shipment_id = '{s_id}'
            """)).fetchall()

            try:
                plan_arr_dt = datetime.fromisoformat(leg_info["planned_arrival"].replace("Z", "+00:00"))
            except Exception:
                plan_arr_dt = now + timedelta(hours=24)
            revised_eta_dt = plan_arr_dt + timedelta(hours=delay_h)
            revised_eta_str = revised_eta_dt.strftime("%Y-%m-%d %H:%M:%S")

            breaches = []
            total_penalty = 0.0
            for o_row in orders:
                o_id, o_num, o_rev, o_dead = o_row[0], o_row[1], float(o_row[2]), o_row[3]
                try:
                    o_dead_dt = datetime.fromisoformat(str(o_dead).replace("Z", "+00:00"))
                except Exception:
                    o_dead_dt = plan_arr_dt
                if revised_eta_dt > o_dead_dt:
                    days_late = max(1, math.ceil((revised_eta_dt - o_dead_dt).total_seconds() / 86400.0))
                    weeks_late = math.ceil(days_late / 7.0)
                    pen = min(o_rev * 0.10, o_rev * (0.005 * weeks_late))
                    total_penalty += pen
                    breaches.append({
                        "order_id": o_id,
                        "order_number": o_num,
                        "revenue_usd": o_rev,
                        "days_late": days_late,
                        "penalty_usd": round(pen, 2)
                    })

            delay_days = math.ceil(delay_h / 24.0)
            demurrage = max(0, delay_days - 4) * 62.50 * 2.0
            exposure = total_penalty + demurrage
            severity = "CRITICAL" if exposure >= 10000.0 else "HIGH" if exposure >= 2500.0 else "MEDIUM" if breaches else "LOW"

            payload = {
                "breaches": breaches,
                "sla_penalty_total_usd": round(total_penalty, 2),
                "demurrage_total_usd": round(demurrage, 2),
                "estimated_delay_hours": delay_h,
                "revised_eta": revised_eta_str,
            }

            a_id = str(uuid.uuid4())
            conn.execute(text(f"""
                INSERT INTO alerts (
                    id, disruption_id, shipment_id, severity, status,
                    financial_exposure, sla_breach_details_json,
                    created_at, updated_at
                ) VALUES (
                    '{a_id}', '{d_id}', '{s_id}', '{severity}', 'OPEN',
                    {round(exposure, 2)}, :payload,
                    '{created_at}', '{created_at}'
                )
            """), {"payload": json.dumps(payload)})
            conn.execute(text(f"UPDATE shipments SET status = 'DELAYED' WHERE id = '{s_id}'"))
            print(f"Seeded active Alert {a_id} for {s_id}: severity={severity}, exposure=${exposure:,.2f}")


def activate(engine=None):
    if engine is None:
        import os
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            scheme, _, remainder = db_url.partition("://")
            if scheme.lower() in ("postgres", "postgresql", "postgresql+asyncpg", "postgresql+psycopg2"):
                host_part = remainder.split("?", 1)[0]
                sync_url = f"postgresql://{host_part}"
                if "sslmode" not in sync_url:
                    sync_url += "?sslmode=require"
            elif scheme.lower() in ("sqlite", "sqlite+aiosqlite"):
                sync_url = f"sqlite:///{remainder}"
            else:
                sync_url = db_url
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
        # Pre-seed cached curved highway road geometries into network_edges
        sync_road_edge_geometries(conn)

        # Seed global cross-continent shipments and orders
        ensure_global_shipments(conn, now)
        ensure_global_orders(conn, now)

        # Seed rerouting corridor alternatives
        ensure_corridor_alternatives(conn, now)

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

        # Seed active disruptions and alerts powered by ML inferences
        seed_active_disruptions_and_alerts(conn, now)

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
