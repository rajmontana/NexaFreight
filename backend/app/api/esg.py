"""ESG — GLEC-aligned CO2e from REAL mode mix + calibrated mass proxy (§10.2)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.db import get_db
from backend.app.models.entities import Shipment

router = APIRouter(prefix="/api/esg", tags=["esg"])

# kg CO2e per tonne-km — GLEC/DEFRA public factors (blueprint §10.2, REAL factors)
FACTORS = {"OCEAN": 0.015, "AIR": 0.500, "ROAD": 0.105}
MASS_PROXY_KG_PER_UNIT = 2.0   # CALIBRATED assumption, documented (DataCo has no weight)
INTERNAL_CO2_PRICE = 60.0       # USD/tonne (policy setting, §10.2)
AVG_LANE_KM = {"OCEAN": 11806.0, "AIR": 6859.0, "ROAD": 1350.0}  # real computed lanes


@router.get("")
def esg(_u: dict = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    mix = dict(db.query(Shipment.freight_mode, func.count()).group_by(Shipment.freight_mode).all())
    total = sum(mix.values()) or 1
    rows, total_t = [], 0.0
    for mode, n in mix.items():
        km = AVG_LANE_KM.get(mode, 3000.0)
        tonnes = n * MASS_PROXY_KG_PER_UNIT / 1000.0
        tkm = tonnes * km
        co2_t = tkm * FACTORS.get(mode, 0.1) / 1000.0
        total_t += co2_t
        rows.append({"mode": mode, "shipments": n, "share_pct": round(100 * n / total, 1),
                     "factor_kg_per_tkm": FACTORS.get(mode), "co2e_tonnes": round(co2_t, 1)})
    rows.sort(key=lambda r: -r["co2e_tonnes"])
    air_share = round(100 * mix.get("AIR", 0) / total, 1)
    ocean_share = round(100 * mix.get("OCEAN", 0) / total, 1)
    return {
        "total_co2e_tonnes": round(total_t, 1),
        "carbon_cost_usd": round(total_t * INTERNAL_CO2_PRICE, 0),
        "internal_price_usd_per_t": INTERNAL_CO2_PRICE,
        "by_mode": rows,
        "green_shift": {"air_share_pct": air_share, "ocean_share_pct": ocean_share,
                        "note": f"shifting the {air_share}% air share to ocean would cut "
                                f"~{round(total_t * (air_share / 100) * (0.5 - 0.015) / 0.5, 0)}t "
                                f"(~{round(100 * (0.5 - 0.015) / 0.5)}% of its footprint)"},
        "method": {"mass": f"shipments x {MASS_PROXY_KG_PER_UNIT}kg/unit (CALIBRATED proxy — "
                           "DataCo carries no weight field; documented assumption)",
                   "distance": "computed lane distances (DERIVED:searoute|great-circle)",
                   "factors": "GLEC/DEFRA public emission factors (REAL)"},
        "provenance": "CALIBRATED:GLEC-factors x REAL-mode-mix",
    }
