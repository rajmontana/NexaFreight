"""Ingestion + calibration + SOP seed tests (fixtures only — AGENTS.md §3 permits
test fixtures; they never appear in the product)."""

from __future__ import annotations

from pathlib import Path

import pytest

from backend.app.ingest import calibration, dataco, sop_seed
from backend.app.models.entities import (
    CalibratedParam,
    Customer,
    DatacoOrder,
    Leg,
    Shipment,
    ShipmentLine,
    Sku,
    SopRule,
)

FIXTURE = Path(__file__).parent / "fixtures" / "dataco_fixture.csv"
DATA_DIR = Path(__file__).parent.parent.parent / "data" / "raw"


@pytest.fixture()
def ingested(db_session):
    return dataco.run(FIXTURE, db_session)


def test_stage_and_master(db_session, ingested):
    assert ingested["lines_staged"] == 8
    assert ingested["skus"] == 3       # three distinct product names
    assert ingested["customers"] == 3  # customer ids 3, 8, 11
    assert db_session.query(DatacoOrder).count() == 8
    assert db_session.query(Sku).count() == 3
    assert db_session.query(Customer).count() == 3


def test_shipments_built_with_rules(db_session, ingested):
    ships = {s.ref: s for s in db_session.query(Shipment).all()}
    assert len(ships) == 5  # order ids 40001..40005
    assert ships["NXF-40001"].freight_mode == "OCEAN"   # Standard Class rule
    assert ships["NXF-40002"].freight_mode == "AIR"     # First Class rule
    assert ships["NXF-40004"].freight_mode == "AIR"
    assert ships["NXF-40005"].freight_mode == "OCEAN"
    assert ships["NXF-40003"].freight_mode == "ROAD"    # Second Class rule
    assert db_session.query(ShipmentLine).count() == 8
    assert db_session.query(Leg).count() == 5
    # SLA due = order_date + scheduled days
    assert ships["NXF-40002"].sla_due_at is not None
    assert ships["NXF-40001"].was_late is False and ships["NXF-40002"].was_late is True


def test_calibration_params_cite_sources(db_session):
    if not (DATA_DIR / "Port-disruption-database.xlsx").exists():
        pytest.skip("raw calibration files not present (CI)")
    calibration.run(DATA_DIR, db_session)
    params = db_session.query(CalibratedParam).all()
    assert len(params) >= 5
    for p in params:  # acceptance: every calibrated parameter shows its source
        assert p.source_citation and len(p.source_citation) > 10


def test_sop_seed_idempotent(db_session):
    t1 = sop_seed.seed(db_session)
    t2 = sop_seed.seed(db_session)
    assert t1 == t2 >= 6
    r = db_session.query(SopRule).filter_by(code="SOP-LOG-001").one()
    assert r.version == "0.1-draft" and r.authority_role == "manager"
