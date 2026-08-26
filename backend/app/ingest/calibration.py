"""Calibration loaders — every parameter cites a published source (REAL sources).

- UNCTAD Port Performance CSV → port_dwell_priors (median time in port, 2022-2024)
- Verschuur et al. Port Disruption DB (xlsx) → disruption_records
- Documented planning rules + SOP tariff matrix → calibrated_params
"""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session

from backend.app.ingest.dataco import FREIGHT_MODE_RULE, ORIGIN_BY_MARKET
from backend.app.models.entities import CalibratedParam, DisruptionRecord, PortDwellPrior

log = logging.getLogger(__name__)

UNCTAD_CITATION = ("UNCTAD Maritime Port Performance indicators "
                   "(data/raw/Maritime Port Performance Project Dataset.csv, 2022-S1..2023-S2)")
DISRUPTION_CITATION = ("Verschuur et al. 2020, 'Port disruptions due to climate extremes', "
                       "Transportation Research Part D (data/raw/Port-disruption-database.xlsx)")
SOP_GUIDE_CITATION = "Business_SOP_Research_Guide_TeamMember4.pdf (team-authored, v0.1 draft)"
BLUEPRINT_RULE = "docs/BLUEPRINT.md §4.4 planning rules (owner-approved)"


def load_dwell_priors(csv_path: Path, db: Session) -> int:
    df = pd.read_csv(csv_path)
    db.query(PortDwellPrior).delete()
    rows = []
    for _, r in df.iterrows():
        v = r.get("Median_time_in_port_days_Value")
        try:
            med = float(v)
        except (TypeError, ValueError):
            continue
        if med != med:  # NaN ("Not available or not separately reported") — skip honestly
            continue
        rows.append({"economy": str(r["Economy_Label"]), "vessel_type": str(r["CommercialMarket_Label"]),
                     "median_time_in_port_days": med, "period": str(r["period"])})
    db.bulk_insert_mappings(PortDwellPrior, rows)
    db.commit()
    log.info("loaded %d dwell priors", len(rows))
    return len(rows)


def load_disruption_records(xlsx_path: Path, db: Session) -> int:
    df = pd.read_excel(xlsx_path)
    db.query(DisruptionRecord).delete()
    df["event_date"] = pd.to_datetime(df["Date"], errors="coerce")
    cols = {"Event": "event", "port_name": "port_name", "Country": "country", "Year": "year",
            "event_date": "event_date", "reduction": "days_reduction", "shutdown": "days_shutdown",
            "recovery": "days_recovery", "total_affected_days": "total_affected_days",
            "severity": "severity"}
    rows = df.rename(columns=cols)[list(cols.values())].to_dict("records")
    db.bulk_insert_mappings(DisruptionRecord, rows)
    db.commit()
    log.info("loaded %d disruption records", len(rows))
    return len(rows)


def upsert_param(db: Session, key: str, value: dict, citation: str, unit: str | None = None,
                 source_file: str | None = None, notes: str | None = None) -> None:
    existing = db.query(CalibratedParam).filter_by(key=key).one_or_none()
    if existing:
        existing.value, existing.source_citation = value, citation
        if unit:
            existing.unit = unit
        if notes:
            existing.notes = notes
    else:
        db.add(CalibratedParam(key=key, value=value, unit=unit, source_citation=citation,
                               source_file=source_file, notes=notes))
    db.commit()


def load_calibrated_params(db: Session) -> int:
    """Planning rules + tariffs + approval caps, each with its citation."""
    upsert_param(db, "planning.freight_mode_rule", FREIGHT_MODE_RULE, BLUEPRINT_RULE,
                 notes="DataCo Shipping Mode → freight mode (deterministic)")
    upsert_param(db, "planning.origin_by_market", ORIGIN_BY_MARKET, BLUEPRINT_RULE,
                 notes="Regional DC assignment per DataCo market (CALIBRATED)")
    upsert_param(db, "demurrage.tariff_matrix", {
        "ocean_dry": {"free_days": 5, "per_day_usd": 250, "sla_fine_usd": 1000},
        "ocean_reefer": {"free_days": 2, "per_day_usd": 550, "sla_fine_usd": 2500},
        "air_express": {"free_hours": 24, "per_day_usd": 1200, "sla_fine_usd": 5000},
        "inland_ramp": {"free_hours": 12, "per_hour_usd": 150, "sla_fine_usd": 500},
    }, SOP_GUIDE_CITATION, source_file="docs/inputs/sop_seed_values.md",
        notes="Maersk/MSC/DHL/FedEx-referenced tariffs (Worksheet 2) — v0.1 DRAFT")
    upsert_param(db, "escalation.approval_caps_usd", {
        "dispatcher": 2500, "manager": 25000, "director": 100000, "vp": None,
    }, SOP_GUIDE_CITATION, source_file="docs/inputs/sop_seed_values.md",
        notes="Worksheet 4; vp = unlimited")
    upsert_param(db, "environment.iot_thresholds", {
        "vessel_speed_knots": {"normal": [14.0, 20.0], "warning": [10.0, 13.9]},
        "wave_height_m": {"warning": [3.1, 4.9], "critical_min": 5.0},
        "cold_chain_c": {"normal": [2.0, 8.0], "critical_gt": 10.0, "critical_after_hrs": 4},
        "humidity_pct": {"normal": [30, 50], "critical_gt": 65},
    }, SOP_GUIDE_CITATION, source_file="docs/inputs/sop_seed_values.md",
        notes="Worksheet 3 sensor thresholds")
    # Derived stats from the REAL disruption database
    dr = db.query(DisruptionRecord).filter(DisruptionRecord.severity.isnot(None),
                                           DisruptionRecord.severity > 0)
    pdf = pd.read_sql(dr.statement, dr.session.bind)  # type: ignore[attr-defined]
    if len(pdf):
        stats = (pdf.groupby("severity")["total_affected_days"]
                 .agg(["mean", "median", "count"]).round(2).reset_index().to_dict("records"))
        upsert_param(db, "disruption.tad_by_severity", {"classes": stats},
                     DISRUPTION_CITATION, unit="days",
                     notes="Total-affected-days distribution per severity class (paper classes 1-3)")
    return db.query(CalibratedParam).count()


def run(data_dir: Path, db: Session) -> dict:
    n_dwell = load_dwell_priors(data_dir / "Maritime Port Performance Project Dataset.csv", db)
    n_disr = load_disruption_records(data_dir / "Port-disruption-database.xlsx", db)
    n_params = load_calibrated_params(db)
    return {"dwell_priors": n_dwell, "disruption_records": n_disr, "calibrated_params": n_params}
