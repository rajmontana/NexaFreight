"""Domain entities — Phase 1 (blueprint §5 subset).

Provenance discipline (AGENTS.md §3): every table that carries business numbers
has a `provenance` column with values REAL / DERIVED / CALIBRATED / PROJECTED.
Raw imports keep a staging table (`dataco_orders`) for full traceability.
"""

from __future__ import annotations

import datetime as dt

from sqlalchemy import JSON, Boolean, DateTime, Float, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.core.db import Base

UTC_NOW = dt.datetime.now(dt.UTC)


class User(Base):
    """Operator accounts. Roles + approval caps mirror the SOP escalation matrix."""

    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(40), default="dispatcher")  # dispatcher|manager|director|vp|finance
    approval_limit_usd: Mapped[int] = mapped_column(Integer, default=2500)  # SOP Worksheet 4
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), default=UTC_NOW)


class Customer(Base):
    """Customers — extracted from DataCo (REAL)."""

    __tablename__ = "customers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    dataco_customer_id: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    segment: Mapped[str] = mapped_column(String(40))  # Consumer | Corporate | Home Office
    city: Mapped[str | None] = mapped_column(String(120))
    country: Mapped[str | None] = mapped_column(String(120))
    region: Mapped[str | None] = mapped_column(String(120))
    market: Mapped[str | None] = mapped_column(String(60))
    provenance: Mapped[str] = mapped_column(String(20), default="REAL:DataCo")


class Sku(Base):
    """Product catalog — extracted from DataCo (REAL prices)."""

    __tablename__ = "skus"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True)
    category: Mapped[str | None] = mapped_column(String(120))
    department: Mapped[str | None] = mapped_column(String(120))
    unit_price_usd: Mapped[float] = mapped_column(Float)
    provenance: Mapped[str] = mapped_column(String(20), default="REAL:DataCo")


class DatacoOrder(Base):
    """Staging import of DataCo order lines (REAL) — 180,519 rows, subset of columns.

    Kept raw-ish for traceability: shipments must always be traceable back to
    these rows (Phase 1 acceptance criterion).
    """

    __tablename__ = "dataco_orders"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(Integer, index=True)
    order_item_id: Mapped[int] = mapped_column(Integer)
    order_date: Mapped[dt.datetime | None] = mapped_column(DateTime)
    ship_date: Mapped[dt.datetime | None] = mapped_column(DateTime)
    ship_mode: Mapped[str | None] = mapped_column(String(40))
    delivery_status: Mapped[str | None] = mapped_column(String(40))
    late_risk: Mapped[int] = mapped_column(Integer, default=0)  # REAL but LEAKED (never a feature)
    days_scheduled: Mapped[int] = mapped_column(Integer)
    days_real: Mapped[int] = mapped_column(Integer)
    qty: Mapped[int] = mapped_column(Integer)
    sales: Mapped[float] = mapped_column(Float)
    item_price: Mapped[float] = mapped_column(Float)
    discount: Mapped[float] = mapped_column(Float, default=0)
    profit: Mapped[float] = mapped_column(Float)
    product_name: Mapped[str | None] = mapped_column(String(200), index=True)
    category: Mapped[str | None] = mapped_column(String(120))
    department: Mapped[str | None] = mapped_column(String(120))
    customer_id: Mapped[int] = mapped_column(Integer, index=True)
    customer_segment: Mapped[str | None] = mapped_column(String(40))
    order_city: Mapped[str | None] = mapped_column(String(120))
    order_country: Mapped[str | None] = mapped_column(String(120))
    order_region: Mapped[str | None] = mapped_column(String(120))
    market: Mapped[str | None] = mapped_column(String(60))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    order_status: Mapped[str | None] = mapped_column(String(40))

    __table_args__ = (UniqueConstraint("order_id", "order_item_id", name="uq_dataco_line"),
                      Index("ix_dataco_mode", "ship_mode"),)


class Shipment(Base):
    """One shipment per DataCo order (grouped lines) with planned/actual times (REAL)."""

    __tablename__ = "shipments"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ref: Mapped[str] = mapped_column(String(40), unique=True)  # NXF-<order_id>
    dataco_order_id: Mapped[int] = mapped_column(Integer, index=True)
    customer_id: Mapped[int] = mapped_column(Integer)  # FK customers.id (assigned at ingest)
    dest_city: Mapped[str | None] = mapped_column(String(120))
    dest_country: Mapped[str | None] = mapped_column(String(120))
    dest_region: Mapped[str | None] = mapped_column(String(120))
    market: Mapped[str | None] = mapped_column(String(60))
    dest_lat: Mapped[float | None] = mapped_column(Float)
    dest_lon: Mapped[float | None] = mapped_column(Float)
    freight_mode: Mapped[str] = mapped_column(String(10))  # OCEAN | AIR | ROAD (rule below)
    status: Mapped[str] = mapped_column(String(20), default="DELIVERED")
    value_usd: Mapped[float] = mapped_column(Float)
    order_date: Mapped[dt.datetime | None] = mapped_column(DateTime)
    planned_ship_date: Mapped[dt.datetime | None] = mapped_column(DateTime)  # REAL ship_date
    sla_due_at: Mapped[dt.datetime | None] = mapped_column(DateTime)  # order_date + days_scheduled
    actual_delivery: Mapped[dt.datetime | None] = mapped_column(DateTime)  # ship_date + days_real
    was_late: Mapped[bool] = mapped_column(Boolean, default=False)  # REAL late_risk (target, not feature)
    provenance: Mapped[str] = mapped_column(String(20), default="REAL:DataCo")


class ShipmentLine(Base):
    __tablename__ = "shipment_lines"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    shipment_id: Mapped[int] = mapped_column(Integer, index=True)
    sku_id: Mapped[int] = mapped_column(Integer)
    qty: Mapped[int] = mapped_column(Integer)
    unit_price: Mapped[float] = mapped_column(Float)
    line_value: Mapped[float] = mapped_column(Float)
    provenance: Mapped[str] = mapped_column(String(20), default="REAL:DataCo")


class Leg(Base):
    """Phase 1: one main leg per shipment. Multi-leg + lanes arrive in Phase 2."""

    __tablename__ = "legs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    shipment_id: Mapped[int] = mapped_column(Integer, index=True)
    seq: Mapped[int] = mapped_column(Integer, default=1)
    mode: Mapped[str] = mapped_column(String(10))
    origin: Mapped[str] = mapped_column(String(120))  # market DC (planning rule)
    destination: Mapped[str | None] = mapped_column(String(120))
    planned_dep: Mapped[dt.datetime | None] = mapped_column(DateTime)
    planned_arr: Mapped[dt.datetime | None] = mapped_column(DateTime)
    actual_dep: Mapped[dt.datetime | None] = mapped_column(DateTime)
    actual_arr: Mapped[dt.datetime | None] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(20), default="COMPLETED")
    provenance: Mapped[str] = mapped_column(String(20), default="REAL:DataCo")


class EventLog(Base):
    """Append-only operational event log (blueprint §5 event sourcing)."""

    __tablename__ = "event_log"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(30))
    entity_id: Mapped[int] = mapped_column(Integer, index=True)
    event_type: Mapped[str] = mapped_column(String(60))
    ts: Mapped[dt.datetime] = mapped_column(DateTime, default=UTC_NOW)
    payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    provenance: Mapped[str] = mapped_column(String(20), default="DERIVED")


class SopRule(Base):
    """SOPs as versioned data (AGENTS.md §10). Seed values from the team guide."""

    __tablename__ = "sop_rules"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(40))
    version: Mapped[str] = mapped_column(String(10), default="0.1-draft")
    category: Mapped[str] = mapped_column(String(40))  # demurrage | sla | finance | environment | compliance
    severity: Mapped[str] = mapped_column(String(10), default="WARN")  # INFO|WARN|CRITICAL
    condition: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    action_template: Mapped[str | None] = mapped_column(String(500))
    authority_role: Mapped[str | None] = mapped_column(String(40))
    reference_doc: Mapped[str] = mapped_column(String(200),
                                              default="Business_SOP_Research_Guide_TeamMember4.pdf")
    effective_from: Mapped[dt.date | None] = mapped_column(DateTime)
    effective_to: Mapped[dt.date | None] = mapped_column(DateTime, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    __table_args__ = (UniqueConstraint("code", "version", name="uq_sop_code_version"),)


class CalibratedParam(Base):
    """Every calibrated value MUST cite its published source (Phase 1 acceptance)."""

    __tablename__ = "calibrated_params"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String(120), unique=True)
    value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    unit: Mapped[str | None] = mapped_column(String(40))
    source_citation: Mapped[str] = mapped_column(String(300))
    source_file: Mapped[str | None] = mapped_column(String(200))
    notes: Mapped[str | None] = mapped_column(String(500))
    calibrated_at: Mapped[dt.datetime] = mapped_column(DateTime, default=UTC_NOW)


class PortDwellPrior(Base):
    """Median time in port by economy × vessel type — UNCTAD (REAL calibration source)."""

    __tablename__ = "port_dwell_priors"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    economy: Mapped[str] = mapped_column(String(120), index=True)
    vessel_type: Mapped[str] = mapped_column(String(120))
    median_time_in_port_days: Mapped[float] = mapped_column(Float)
    period: Mapped[str] = mapped_column(String(20))
    source: Mapped[str] = mapped_column(String(120), default="UNCTAD Port Performance")

    __table_args__ = (UniqueConstraint("economy", "vessel_type", "period", name="uq_dwell"),)


class DisruptionRecord(Base):
    """Historic port disruptions — Verschuur et al., Transportation Research Part D (REAL)."""

    __tablename__ = "disruption_records"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    event: Mapped[str] = mapped_column(String(120))
    port_name: Mapped[str] = mapped_column(String(160))
    country: Mapped[str | None] = mapped_column(String(120))
    year: Mapped[int | None] = mapped_column(Integer)
    event_date: Mapped[dt.datetime | None] = mapped_column(DateTime)
    days_reduction: Mapped[int | None] = mapped_column(Integer)
    days_shutdown: Mapped[int | None] = mapped_column(Integer)
    days_recovery: Mapped[int | None] = mapped_column(Integer)
    total_affected_days: Mapped[int | None] = mapped_column(Integer)
    severity: Mapped[int | None] = mapped_column(Integer)  # 0-3 (paper's classes)
    source: Mapped[str] = mapped_column(String(200),
                                        default="Verschuur et al. 2020, Port Disruption Database")

    __table_args__ = (UniqueConstraint("event", "port_name", name="uq_disruption"),)


class Port(Base):
    """Ports — REAL coordinates from NGA World Port Index (Pub 150)."""

    __tablename__ = "ports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    wpi_number: Mapped[int | None] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    country_code: Mapped[str | None] = mapped_column(String(10))
    locode: Mapped[str | None] = mapped_column(String(10))
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    harbor_size: Mapped[str | None] = mapped_column(String(30))
    source: Mapped[str] = mapped_column(String(80), default="NGA World Port Index (Pub 150)")


class Airport(Base):
    """Airports — REAL data from Our Airports (public domain)."""

    __tablename__ = "airports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    iata: Mapped[str] = mapped_column(String(5), unique=True)
    icao: Mapped[str | None] = mapped_column(String(8))
    name: Mapped[str] = mapped_column(String(160))
    country: Mapped[str | None] = mapped_column(String(80))
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(40), default="Our Airports (public domain)")


class Lane(Base):
    """Lanes with real geometry: ocean via searoute marnet, air via great-circle."""

    __tablename__ = "lanes"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lane_key: Mapped[str] = mapped_column(String(80), unique=True)
    mode: Mapped[str] = mapped_column(String(10))  # OCEAN | AIR | ROAD
    origin_name: Mapped[str] = mapped_column(String(120))
    dest_name: Mapped[str] = mapped_column(String(120))
    origin_lat: Mapped[float] = mapped_column(Float)
    origin_lon: Mapped[float] = mapped_column(Float)
    dest_lat: Mapped[float] = mapped_column(Float)
    dest_lon: Mapped[float] = mapped_column(Float)
    distance_km: Mapped[float] = mapped_column(Float)
    geojson: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    provenance: Mapped[str] = mapped_column(String(40))
    source_citation: Mapped[str] = mapped_column(String(200))


class Vessel(Base):
    """Live vessel cache from AIS (populated by the Phase-2 telemetry service)."""

    __tablename__ = "vessels"
    mmsi: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str | None] = mapped_column(String(120))
    vessel_class: Mapped[str | None] = mapped_column(String(60))
    lat: Mapped[float | None] = mapped_column(Float)
    lon: Mapped[float | None] = mapped_column(Float)
    speed_kn: Mapped[float | None] = mapped_column(Float)
    heading: Mapped[float | None] = mapped_column(Float)
    destination: Mapped[str | None] = mapped_column(String(120))
    last_seen: Mapped[dt.datetime | None] = mapped_column(DateTime)
    feed: Mapped[str] = mapped_column(String(20), default="AIS")


class Aircraft(Base):
    __tablename__ = "aircraft"
    icao24: Mapped[str] = mapped_column(String(10), primary_key=True)
    callsign: Mapped[str | None] = mapped_column(String(12))
    lat: Mapped[float | None] = mapped_column(Float)
    lon: Mapped[float | None] = mapped_column(Float)
    alt_m: Mapped[float | None] = mapped_column(Float)
    speed_ms: Mapped[float | None] = mapped_column(Float)
    last_seen: Mapped[dt.datetime | None] = mapped_column(DateTime)
    feed: Mapped[str] = mapped_column(String(20), default="ADS-B")


class PositionReport(Base):
    """Append-only position stream (REAL telemetry when FEED_MODE=live)."""

    __tablename__ = "position_reports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    entity_type: Mapped[str] = mapped_column(String(10))  # vessel | aircraft | truck
    entity_id: Mapped[str] = mapped_column(String(20), index=True)
    ts: Mapped[dt.datetime] = mapped_column(DateTime, default=UTC_NOW, index=True)
    lat: Mapped[float] = mapped_column(Float)
    lon: Mapped[float] = mapped_column(Float)
    speed: Mapped[float | None] = mapped_column(Float)
    heading: Mapped[float | None] = mapped_column(Float)
    provenance: Mapped[str] = mapped_column(String(20), default="REAL:AIS")


class Alert(Base):
    """SOP-rule violation / risk alert with full lifecycle (blueprint §9.2)."""

    __tablename__ = "alerts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    shipment_id: Mapped[int] = mapped_column(Integer, index=True)
    rule_code: Mapped[str] = mapped_column(String(40))
    rule_version: Mapped[str] = mapped_column(String(10), default="0.1-draft")
    severity: Mapped[str] = mapped_column(String(10), default="WARN")  # INFO|WARN|CRITICAL
    status: Mapped[str] = mapped_column(String(20), default="PENDING_APPROVAL")
    detected_at: Mapped[dt.datetime] = mapped_column(DateTime, default=UTC_NOW)
    context: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    provenance: Mapped[str] = mapped_column(String(40), default="DERIVED:replay-window")

    __table_args__ = (UniqueConstraint("shipment_id", "rule_code", name="uq_alert_shipment_rule"),)


class DecisionOption(Base):
    """Ranked mitigation option priced from calibrated tariffs (Phase 4 refines)."""

    __tablename__ = "decision_options"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    alert_id: Mapped[int] = mapped_column(Integer, index=True)
    option_type: Mapped[str] = mapped_column(String(30))   # HOLD|REROUTE_PORT|PARTIAL_AIR
    label: Mapped[str] = mapped_column(String(160))
    cost_usd: Mapped[float] = mapped_column(Float)
    days_saved: Mapped[float | None] = mapped_column(Float, nullable=True)
    p_on_time: Mapped[float | None] = mapped_column(Float, nullable=True)
    co2_delta_kg: Mapped[float | None] = mapped_column(Float, nullable=True)
    expected_total_cost_usd: Mapped[float | None] = mapped_column(Float, nullable=True)
    detail: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class Decision(Base):
    """Immutable audit trail: who decided, what, why, under which SOP version."""

    __tablename__ = "decisions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    alert_id: Mapped[int] = mapped_column(Integer, index=True)
    option_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    action: Mapped[str] = mapped_column(String(10))  # APPROVED|REJECTED|MODIFIED
    decided_by: Mapped[str] = mapped_column(String(120))
    decided_at: Mapped[dt.datetime] = mapped_column(DateTime, default=UTC_NOW)
    reason: Mapped[str] = mapped_column(String(400))
