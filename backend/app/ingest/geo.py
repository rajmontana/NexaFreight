"""Geographic backbone — REAL ports, airports, and lane geometry.

Sources (cited per row):
- Ports: NGA World Port Index Pub 150 (data/raw/UpdatedPub150.csv)
- Airports: Our Airports (data/raw/ourairports.csv, public domain)
- Ocean lanes: searoute package (marnet maritime network) — DERIVED geometry
- Air lanes: great-circle — DERIVED geometry
No invented coordinates anywhere.
"""

from __future__ import annotations

import logging
import math
from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session

from backend.app.models.entities import Airport, Lane, Port

log = logging.getLogger(__name__)

# India-centric corridor focus (owner-selected UI decision)
SEA_LANES = [
    ("NHAVA SHEVA", "ROTTERDAM"), ("NHAVA SHEVA", "SINGAPORE"),
    ("CHENNAI", "SINGAPORE"), ("CHENNAI", "ROTTERDAM"),
    ("MUMBAI", "JEBEL ALI"),
]
AIR_LANES = [  # IATA pairs
    ("BOM", "AMS"), ("BOM", "SIN"), ("MAA", "SIN"), ("DEL", "LHR"), ("BOM", "DXB"),
]
WANTED_IATAS = sorted({i for pair in AIR_LANES for i in pair})


def load_ports(csv_path: Path, db: Session) -> int:
    with open(csv_path, encoding="utf-8", errors="replace") as fh:
        df = pd.read_csv(fh)
    db.query(Port).delete()
    rows = []
    for _, r in df.iterrows():
        try:
            lat, lon = float(r["Latitude"]), float(r["Longitude"])
        except (TypeError, ValueError):
            continue
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            continue
        rows.append({"wpi_number": int(r["World Port Index Number"]) if pd.notna(r["World Port Index Number"]) else None,
                     "name": str(r["Main Port Name"]).strip().upper(),
                     "country_code": str(r["Country Code"]) if pd.notna(r["Country Code"]) else None,
                     "locode": str(r["UN/LOCODE"]) if pd.notna(r["UN/LOCODE"]) else None,
                     "lat": lat, "lon": lon,
                     "harbor_size": str(r.get("Harbor Size")) if pd.notna(r.get("Harbor Size")) else None})
    db.bulk_insert_mappings(Port, rows)
    db.commit()
    log.info("loaded %d ports (WPI Pub 150 subset)", len(rows))
    return len(rows)


def load_airports(csv_path: Path, db: Session) -> int:
    df = pd.read_csv(csv_path, low_memory=False)
    db.query(Airport).delete()
    sub = df[df["iata_code"].isin(WANTED_IATAS) & df["type"].str.contains("airport")
             & ~df["type"].str.contains("closed", na=False)]
    rows = [{"iata": r.iata_code, "icao": r.ident, "name": r.name,
             "country": getattr(r, "iso_country", None),
             "lat": float(r.latitude_deg), "lon": float(r.longitude_deg)}
            for r in sub.itertuples()]
    db.bulk_insert_mappings(Airport, rows)
    db.commit()
    log.info("loaded %d airports (Our Airports)", len(rows))
    return len(rows)


def _great_circle_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(a))


def _air_geojson(o, d) -> dict:
    """Sampled great-circle arc (slerp on unit sphere, 33 points)."""
    import numpy as np
    v1 = np.array([math.cos(math.radians(o[0])) * math.cos(math.radians(o[1])),
                   math.cos(math.radians(o[0])) * math.sin(math.radians(o[1])),
                   math.sin(math.radians(o[0]))])
    v2 = np.array([math.cos(math.radians(d[0])) * math.cos(math.radians(d[1])),
                   math.cos(math.radians(d[0])) * math.sin(math.radians(d[1])),
                   math.sin(math.radians(d[0]))])
    omega = math.acos(float(np.clip(np.dot(v1, v2), -1, 1)))
    pts = []
    for t in [i / 32 for i in range(33)]:
        if omega < 1e-9:
            v = v1
        else:
            v = (math.sin((1 - t) * omega) * v1 + math.sin(t * omega) * v2) / math.sin(omega)
        lat = math.degrees(math.asin(v[2] / math.sqrt(float(np.dot(v, v)))))
        lon = math.degrees(math.atan2(v[1], v[0]))
        pts.append([round(lon, 4), round(lat, 4)])
    return {"type": "LineString", "coordinates": pts}


def build_lanes(db: Session) -> int:
    import searoute as sr

    db.query(Lane).delete()
    ports = {p.name: p for p in db.query(Port).all()}
    airports = {a.iata: a for a in db.query(Airport).all()}
    rows = []
    for orig, dest in SEA_LANES:
        po, pd_ = ports.get(orig), ports.get(dest)
        if not po or not pd_:
            log.warning("sea lane %s→%s skipped (port missing from WPI subset)", orig, dest)
            continue
        route = sr.searoute([po.lon, po.lat], [pd_.lon, pd_.lat])
        dist = float(route.properties["length"])
        if str(route.properties.get("units", "km")).lower() in ("m", "meters", "metres"):
            dist /= 1000.0
        rows.append({"lane_key": f"SEA:{orig}-{dest}", "mode": "OCEAN",
                     "origin_name": orig, "dest_name": dest,
                     "origin_lat": po.lat, "origin_lon": po.lon,
                     "dest_lat": pd_.lat, "dest_lon": pd_.lon,
                     "distance_km": round(dist, 1),
                     "geojson": {"type": "Feature", "geometry": route.geometry,
                                 "properties": {"ports": [orig, dest]}},
                     "provenance": "DERIVED:searoute-marnet",
                     "source_citation": "searoute PyPI (global maritime network) over WPI port coords"})
    for orig, dest in AIR_LANES:
        ao, ad = airports.get(orig), airports.get(dest)
        if not ao or not ad:
            log.warning("air lane %s→%s skipped (airport missing)", orig, dest)
            continue
        rows.append({"lane_key": f"AIR:{orig}-{dest}", "mode": "AIR",
                     "origin_name": orig, "dest_name": dest,
                     "origin_lat": ao.lat, "origin_lon": ao.lon,
                     "dest_lat": ad.lat, "dest_lon": ad.lon,
                     "distance_km": round(_great_circle_km(ao.lat, ao.lon, ad.lat, ad.lon), 1),
                     "geojson": _air_geojson((ao.lat, ao.lon), (ad.lat, ad.lon)),
                     "provenance": "DERIVED:great-circle",
                     "source_citation": "great-circle over Our Airports coords"})
    db.bulk_insert_mappings(Lane, rows)
    db.commit()
    log.info("built %d lanes (%d sea + %d air)", len(rows), len(SEA_LANES), len(AIR_LANES))
    return len(rows)


def run(data_dir: Path, db: Session) -> dict:
    n_ports = load_ports(data_dir / "UpdatedPub150.csv", db)
    n_air = load_airports(data_dir / "ourairports.csv", db)
    n_lanes = build_lanes(db)
    return {"ports": n_ports, "airports": n_air, "lanes": n_lanes}
