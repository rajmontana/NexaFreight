"""Measured VIA_CAPE corridor seeding (Task 20, P1). Logic core;
scripts/23_seed_corridors.py is a thin CLI wrapper.

Measured via the searoute marine graph (24 Sep 2026): India-EU lanes gain
~1.70-1.74x distance via the Cape; Singapore-EU only ~1.25x (pre-gulf
gateway). The seeded row carries the representative India-EU factors plus
the full per-lane table inside route_template_json.
"""

from __future__ import annotations

import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from nexafreight.adapters.routing.sea_route import compute_sea_route
from nexafreight.enums import DisruptionType
from nexafreight.models import CorridorAlternative
from nexafreight.models.location import Location

LANES: dict[str, tuple[str, str]] = {
    "INJNP->NLRTM": ("INJNP", "NLRTM"),
    "INMUN->NLRTM": ("INMUN", "NLRTM"),
    "SGSIN->NLRTM": ("SGSIN", "NLRTM"),
}
VIA_CAPE_KEY = "VIA_CAPE"
REPRESENTATIVE_LANE = "INJNP->NLRTM"


def _measure(
    olat: float, olon: float, dlat: float, dlon: float
) -> tuple[float, float, float, float]:
    """Return (suez_nm, cape_nm, suez_h, cape_h) via the marine graph."""
    normal = compute_sea_route(olat, olon, dlat, dlon, vessel_class="neo-panamax")
    cape = compute_sea_route(
        olat, olon, dlat, dlon, vessel_class="neo-panamax", restrictions=["suez"]
    )
    return (
        normal.distance_nm,
        cape.distance_nm,
        normal.duration_s / 3600.0,
        cape.duration_s / 3600.0,
    )


async def seed_corridors(session: AsyncSession) -> dict[str, dict]:
    """Upsert the VIA_CAPE corridor from measured marine-graph numbers."""
    locations = {
        locode: (
            await session.execute(select(Location).where(Location.locode == locode))
        ).scalar_one_or_none()
        for locode in {code for lane in LANES.values() for code in lane}
    }
    missing = [key for key, value in locations.items() if value is None]
    if missing:
        raise RuntimeError(f"Missing locations (run ingest/world scripts first): {missing}")

    lane_table: dict[str, dict] = {}
    for lane_name, (o_code, d_code) in LANES.items():
        o, d = locations[o_code], locations[d_code]
        suez_nm, cape_nm, suez_h, cape_h = _measure(
            o.latitude, o.longitude, d.latitude, d.longitude
        )
        lane_table[lane_name] = {
            "suez_nm": round(suez_nm, 1),
            "cape_nm": round(cape_nm, 1),
            "suez_h": round(suez_h, 2),
            "cape_h": round(cape_h, 2),
            "distance_ratio": round(cape_nm / suez_nm, 4),
            "added_hours": round(max(0.0, cape_h - suez_h), 2),
        }

    rep = lane_table[REPRESENTATIVE_LANE]
    row = (
        await session.execute(
            select(CorridorAlternative).where(CorridorAlternative.option_key == VIA_CAPE_KEY)
        )
    ).scalar_one_or_none()
    if row is None:
        row = CorridorAlternative(option_key=VIA_CAPE_KEY)
        session.add(row)
    row.display_name = "Cape of Good Hope diversion (Suez unavailable)"
    row.applicable_disruption_types_json = json.dumps(
        [DisruptionType.PORT_CONGESTION.value, DisruptionType.WEATHER.value]
    )
    row.route_template_json = json.dumps(
        {
            "legs": [{"mode": "SEA", "to": "DESTINATION"}],
            "via": "Cape of Good Hope",
            "measured_lanes": lane_table,
            "representative_lane": REPRESENTATIVE_LANE,
        }
    )
    row.time_delta_hours = rep["added_hours"]
    row.cost_delta_factor = round(rep["distance_ratio"], 4)
    row.co2_delta_factor = round(rep["distance_ratio"], 4)
    await session.commit()
    return lane_table
