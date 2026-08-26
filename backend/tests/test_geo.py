"""Geo backbone tests: real-source loads + geometry sanity (deterministic)."""

from __future__ import annotations

from pathlib import Path

import pytest

from backend.app.ingest import geo
from backend.app.models.entities import Airport, Lane, Port

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "raw"


@pytest.fixture()
def geo_loaded(db_session):
    if not (DATA_DIR / "UpdatedPub150.csv").exists():
        pytest.skip("raw geo sources not present (CI)")
    return geo.run(DATA_DIR, db_session)


def test_ports_loaded_from_wpi(db_session, geo_loaded):
    assert geo_loaded["ports"] >= 100  # real subset
    names = {p.name for p in db_session.query(Port).all()}
    assert {"NHAVA SHEVA", "CHENNAI", "ROTTERDAM", "SINGAPORE", "JEBEL ALI"} <= names


def test_airports_loaded(db_session, geo_loaded):
    iatas = {a.iata for a in db_session.query(Airport).all()}
    assert {"BOM", "AMS", "SIN", "MAA", "DEL", "LHR", "DXB"} <= iatas


def test_sea_lanes_geometry_realistic(db_session, geo_loaded):
    lanes = {ln.lane_key: ln for ln in db_session.query(Lane).all()}
    assert len(lanes) >= 9
    # Nhava Sheva → Rotterdam via Suez: real-world ~11,000–13,000 km
    assert 10_000 < lanes["SEA:NHAVA SHEVA-ROTTERDAM"].distance_km < 14_000
    # geometry must have many points (maritime path, not a straight line)
    coords = lanes["SEA:NHAVA SHEVA-ROTTERDAM"].geojson["geometry"]["coordinates"]
    assert len(coords) > 50
    # Nhava Sheva → Singapore: real-world ~2,300–3,000 nm ≈ 4,200–5,600 km
    assert 3_800 < lanes["SEA:NHAVA SHEVA-SINGAPORE"].distance_km < 6_500


def test_air_lanes_great_circle(db_session, geo_loaded):
    lanes = {ln.lane_key: ln for ln in db_query(db_session)}
    # BOM→SIN real ~3,900 km
    assert 3_600 < lanes["AIR:BOM-SIN"].distance_km < 4_200
    assert len(lanes["AIR:BOM-SIN"].geojson["coordinates"]) == 33


def db_query(session):
    return session.query(Lane).all()
