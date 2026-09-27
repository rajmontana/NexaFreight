"""add international network

Revision ID: ca009891c5e2
Revises: 334acd8cb53d
Create Date: 2026-09-27 11:00:09.364921+00:00

"""
from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime
import math

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ca009891c5e2'
down_revision: str | None = '334acd8cb53d'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def _haversine_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    return _haversine_km(lat1, lon1, lat2, lon2) / 1.852

_LOCATIONS = [
    ("USNYC", "Port of New York and New Jersey", "US",  40.6688,  -74.0453),
    ("USLAX", "Port of Los Angeles",           "US",  33.7295, -118.2620),
    ("DEHAM", "Port of Hamburg",               "DE",  53.5413,    9.9169),
    ("NLRTM", "Port of Rotterdam",             "NL",  51.9167,    4.5000),
    ("JPTYO", "Port of Tokyo",                 "JP",  35.6167,  139.7833),
    ("CNSHA", "Port of Shanghai",              "CN",  31.2200,  121.4900),
    ("BRSSZ", "Port of Santos",                "BR", -23.9556,  -46.3258),
    ("AUSYD", "Port of Sydney",                "AU", -33.8591,  151.2011),
    ("ZADUR", "Port of Durban",                "ZA", -29.8687,   31.0218),
    ("AEBUE", "Jebel Ali Port",                "AE",  25.0111,   55.0611),
    ("SGSIN", "Port of Singapore",             "SG",   1.2833,  103.8500),
]

_EDGES_RAW = [
    ("INJNP", "SGSIN", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("SGSIN", "INJNP", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("INMUN", "AEBUE", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("AEBUE", "INMUN", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("SGSIN", "JPTYO", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("JPTYO", "SGSIN", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("SGSIN", "AUSYD", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("AUSYD", "SGSIN", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("CNSHA", "SGSIN", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("SGSIN", "CNSHA", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("CNSHA", "USLAX", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("USLAX", "CNSHA", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("USLAX", "JPTYO", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("JPTYO", "USLAX", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("USNYC", "NLRTM", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("NLRTM", "USNYC", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("AEBUE", "NLRTM", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("NLRTM", "AEBUE", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("ZADUR", "SGSIN", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("SGSIN", "ZADUR", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("ZADUR", "BRSSZ", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    ("BRSSZ", "ZADUR", "SEA",   None, "sea.panamax.speed_kn", "sea.cost_usd_per_nm", "co2.sea_g_per_tonne_km", 0.92, False, 2000),
    
    ("USNYC", "USLAX", "ROAD", None, "road.speed_kmh", "road.cost_usd_per_km", "co2.road_g_per_tonne_km", 0.88, False, None),
    ("USLAX", "USNYC", "ROAD", None, "road.speed_kmh", "road.cost_usd_per_km", "co2.road_g_per_tonne_km", 0.88, False, None),
    ("DEHAM", "NLRTM", "ROAD", None, "road.speed_kmh", "road.cost_usd_per_km", "co2.road_g_per_tonne_km", 0.88, False, None),
    ("NLRTM", "DEHAM", "ROAD", None, "road.speed_kmh", "road.cost_usd_per_km", "co2.road_g_per_tonne_km", 0.88, False, None),
]

def upgrade() -> None:
    conn = op.get_bind()
    now_str = datetime.utcnow().isoformat()
    
    # 1. Locations
    for locode, name, country, lat, lon in _LOCATIONS:
        conn.execute(
            sa.text(
                "INSERT INTO locations (locode, name, country_code, location_type, latitude, longitude, created_at, updated_at) "
                "VALUES (:locode, :name, :country, 'PORT', :lat, :lon, :now, :now) "
                "ON CONFLICT(locode) DO NOTHING"
            ),
            {"locode": locode, "name": name, "country": country, "lat": lat, "lon": lon, "now": now_str},
        )
        
    # 2. Network Nodes
    node_id_by_locode = {}
    for locode, name, country, lat, lon in _LOCATIONS:
        conn.execute(
            sa.text(
                "INSERT INTO network_nodes (locode, name, node_type, modes_json, latitude, longitude, country_code, created_at, updated_at) "
                "VALUES (:locode, :name, 'PORT', '[\"SEA\",\"ROAD\"]', :lat, :lon, :country, :now, :now) "
                "ON CONFLICT(locode) DO NOTHING"
            ),
            {"locode": locode, "name": name, "lat": lat, "lon": lon, "country": country, "now": now_str},
        )
        
    # We need other nodes as well, because we are creating edges to INJNP etc.
    rows = conn.execute(sa.text("SELECT id, locode, latitude, longitude FROM network_nodes")).fetchall()
    node_by_locode = {row[1]: {"id": row[0], "lat": row[2], "lon": row[3]} for row in rows}

    # 3. Edges
    for f_loc, t_loc, mode, dist_override, spd_k, cst_k, co2_k, rel, is_dfc, cap in _EDGES_RAW:
        f_node = node_by_locode[f_loc]
        t_node = node_by_locode[t_loc]
        
        if dist_override is not None:
            dist = dist_override
        elif mode == "SEA":
            dist = _haversine_nm(f_node["lat"], f_node["lon"], t_node["lat"], t_node["lon"])
        elif mode == "ROAD":
            dist = _haversine_km(f_node["lat"], f_node["lon"], t_node["lat"], t_node["lon"]) * 1.2
        else:
            dist = _haversine_km(f_node["lat"], f_node["lon"], t_node["lat"], t_node["lon"])
            
        conn.execute(
            sa.text(
                "INSERT INTO network_edges (from_node_id, to_node_id, mode, distance_km, transit_speed_param_key, "
                "base_cost_param_key, co2_intensity_param_key, reliability, is_dfc, capacity_teu, created_at, updated_at) "
                "VALUES (:f_id, :t_id, :mode, :dist, :spd_k, :cst_k, :co2_k, :rel, :is_dfc, :cap, :now, :now)"
            ),
            {
                "f_id": f_node["id"], "t_id": t_node["id"], "mode": mode,
                "dist": dist, "spd_k": spd_k, "cst_k": cst_k, "co2_k": co2_k,
                "rel": rel, "is_dfc": is_dfc, "cap": cap, "now": now_str
            }
        )

def downgrade() -> None:
    conn = op.get_bind()
    
    # Edges
    for f_loc, t_loc, mode, *_ in _EDGES_RAW:
        conn.execute(
            sa.text(
                "DELETE FROM network_edges WHERE from_node_id = (SELECT id FROM network_nodes WHERE locode = :f_loc) "
                "AND to_node_id = (SELECT id FROM network_nodes WHERE locode = :t_loc) AND mode = :mode"
            ),
            {"f_loc": f_loc, "t_loc": t_loc, "mode": mode}
        )
        
    # Nodes
    locodes = [loc[0] for loc in _LOCATIONS]
    conn.execute(
        sa.text("DELETE FROM network_nodes WHERE locode IN :locodes"),
        {"locodes": tuple(locodes)}
    )
