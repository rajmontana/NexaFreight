#!/usr/bin/env python3
r"""upgrade_analytics_n1 — wave 5F performance fix (self-verifying, idempotent).

Fixes the 4 root causes behind "frontend stuck loading / NO DATA":

  1. analytics.py N+1: per-shipment session.refresh loops in _build_aggregates,
     sla_board and esg_rail -> replaced with selectinload eager loading
     (measured: 904 statements/cycle -> 10 on the demo world; on the full DB
     this was ~187k statements per 25 minutes).
  2. /api/shipments page 1 buried under 15,638 HISTORICAL (2015-2018 DataCo)
     rows -> list_shipments now applies the same active-world filter the
     analytics endpoints use, so page 1 = the live 2026 fleet.
  3. esg_rail had NO world filter at all (worst offender: it scanned every
     shipment in the database) -> now active-world filtered + eager legs.
  4. sla_board lazy-loads orders+legs+disruptions per shipment -> eager.

Whole-function replacement, self-verifying (marker counts, post-checks,
py_compile). Idempotent: safe to run twice. Run from the backend directory:

    python upgrade_analytics_n1.py
"""
import py_compile
from pathlib import Path

ANALYTICS = Path("src") / "nexafreight" / "api" / "routes" / "analytics.py"
SHIPMENTS = Path("src") / "nexafreight" / "api" / "routes" / "shipments.py"

A_IMP_ANCHOR = "from sqlalchemy.ext.asyncio import AsyncSession\n"
A_IMP_LINE = "from sqlalchemy.orm import selectinload\n"
A_DONE = "from sqlalchemy.orm import selectinload"

BUILD_START = 'async def _build_aggregates('
BUILD_END = '\nasync def _scorecard_payload('
SLA_START = 'async def sla_board('
SLA_END = '\n@router.get("/esg"'
ESG_START = 'async def esg_rail('
LIST_START = 'async def list_shipments('
LIST_END = '\n# ============================================================================\n# T-022: Detail Endpoints'

NEW_BUILD = 'async def _build_aggregates(\n    session: AsyncSession, *, now: datetime\n) -> list[ShipmentFinancialAggregate]:\n    """Fetch shipments and roll up aggregates for window math."""\n    result = await session.execute(\n        select(Shipment)\n        .options(selectinload(Shipment.legs), selectinload(Shipment.orders))\n        .where(_active_world_filter())\n    )\n    shipments = list(result.scalars().all())\n\n    decided_ids: set[str] = set()\n    dres = await session.execute(select(Decision))\n    for d in dres.scalars().all():\n        decided_ids.add(d.shipment_id)\n\n    aggregates: list[ShipmentFinancialAggregate] = []\n    for shipment in shipments:\n        freight, carbon = _shipment_freight_carbon(shipment)\n        sla_est, dem_est, realized = _pending_exposure(shipment, now=now)\n        realized_total = realized + freight\n        revenue = sum(o.revenue for o in shipment.orders)\n        shipping = sum(o.shipping_cost for o in shipment.orders)\n        decided = shipment.id in decided_ids\n        aggregates.append(\n            ShipmentFinancialAggregate(\n                shipment_id=shipment.id,\n                mode=str(shipment.primary_transport_mode),\n                status=str(shipment.status),\n                revenue_usd=revenue,\n                shipping_cost_usd=shipping,\n                decided=decided,\n                realized_cost_usd=realized_total if decided else 0.0,\n                pending_sla_est_usd=(sla_est if not decided else 0.0),\n                pending_demurrage_est_usd=(dem_est if not decided else 0.0),\n                deadlines=[o.sla_deadline for o in shipment.orders],\n                provenance=str(shipment.provenance),\n            )\n        )\n    return aggregates\n\n\n# ---------------------------------------------------------------------------\n# Endpoints\n# ---------------------------------------------------------------------------\n\n'

NEW_SLA = 'async def sla_board(\n    session: AsyncSession = Depends(get_db_session),\n    _user: User = Depends(get_current_user),\n) -> AnalyticsSlaResponse:\n    """Per-shipment SLA risk rows (in transit, or any non-empty shipment)."""\n    now = datetime.now(UTC)\n    shipments = list(\n        (\n            await session.execute(\n                select(Shipment)\n                .options(\n                    selectinload(Shipment.orders),\n                    selectinload(Shipment.legs),\n                    selectinload(Shipment.disruptions),\n                )\n                .where(_active_world_filter())\n            )\n        ).scalars().all()\n    )\n    rows: list[AnalyticsSlaRow] = []\n    for s in shipments:\n        if not s.orders:\n            continue\n        eta = latest_planned_arrival(s)\n        worst_order = min(s.orders, key=lambda o: o.sla_deadline)\n        deadline = worst_order.sla_deadline\n        if deadline.tzinfo is None:\n            deadline = deadline.replace(tzinfo=UTC)\n        days_to_deadline = None\n        delay_days = 0.0\n        if eta is not None:\n            if eta.tzinfo is None:\n                eta = eta.replace(tzinfo=UTC)\n            days_to_deadline = round((deadline - max(eta, now)).total_seconds() / 86400.0, 2)\n            if eta > deadline:\n                delay_days = round((eta - deadline).total_seconds() / 86400.0, 2)\n        disrupted = any(\n            str(d.status) == DisruptionStatus.ACTIVE for d in s.disruptions\n        )\n        desc = next(\n            (d.description for d in s.disruptions if str(d.status) == DisruptionStatus.ACTIVE),\n            None,\n        )\n        rows.append(\n            AnalyticsSlaRow(\n                shipment_id=s.id,\n                sla_status=str(worst_order.sla_status),\n                days_to_deadline=days_to_deadline,\n                disrupted=disrupted,\n                disruption_description=desc,\n                delay_days=delay_days,\n            )\n        )\n    return AnalyticsSlaResponse(rows=rows, provenance="DERIVED")\n\n'

NEW_ESG = 'async def esg_rail(\n    session: AsyncSession = Depends(get_db_session),\n    _user: User = Depends(get_current_user),\n) -> AnalyticsEsgResponse:\n    """CO2 per shipment + vs-air comparison."""\n    shipments = list(\n        (\n            await session.execute(\n                select(Shipment)\n                .options(selectinload(Shipment.legs))\n                .where(_active_world_filter())\n            )\n        ).scalars().all()\n    )\n    rows: list[AnalyticsEsgRow] = []\n    breakdown: dict[str, int] = {}\n    for s in shipments:\n        weight_t = max(1, s.container_count) * TONNES_PER_CONTAINER\n        from nexafreight.enums import LegStatus\n\n        live_legs = [l for l in s.legs if str(l.status) != LegStatus.REPLACED]\n        km = sum(l.distance_km or 0.0 for l in live_legs)\n        mode = str(s.primary_transport_mode)\n        breakdown[mode] = breakdown.get(mode, 0) + 1\n\n        co2_kg = None\n        if all(l.co2_kg is not None for l in live_legs) and live_legs:\n            co2_kg = sum(l.co2_kg or 0.0 for l in live_legs)\n        else:\n            co2_kg = CO2_G_PER_T_KM.get(mode, CO2_G_PER_T_KM["SEA"]) * km * weight_t / 1000.0\n\n        per_container = co2_kg / max(1, s.container_count)\n\n        air_kg = CO2_G_PER_T_KM["AIR"] * km * weight_t / 1000.0\n        vs_air_saving = None\n        if air_kg > 0:\n            vs_air_saving = (1.0 - co2_kg / air_kg) * 100.0\n\n        mode_freight = calculate_freight_cost(km, weight_t, mode)\n        air_freight = calculate_freight_cost(km, weight_t, "AIR")\n        vs_air_freight_delta = None\n        if air_freight > 0:\n            vs_air_freight_delta = (mode_freight - air_freight) / air_freight * 100.0\n\n        rows.append(\n            AnalyticsEsgRow(\n                shipment_id=s.id,\n                mode=mode,\n                kg_co2=round(co2_kg, 1),\n                kg_co2e_per_container=round(per_container, 1),\n                vs_air_co2_saving_pct=(round(vs_air_saving, 1) if vs_air_saving is not None else None),\n                vs_air_freight_delta_pct=(\n                    round(vs_air_freight_delta, 1) if vs_air_freight_delta is not None else None\n                ),\n            )\n        )\n    return AnalyticsEsgResponse(rows=rows, route_breakdown=breakdown, provenance="DERIVED")\n'

S_IMP_ANCHOR = "from nexafreight.database import get_db_session\n"
S_IMP_LINE = "from nexafreight.api.routes.analytics import _active_world_filter\n"
S_DONE = "filters = [_active_world_filter()]"

NEW_LIST = 'async def list_shipments(\n    status: ShipmentStatus | None = Query(None, description="Filter by status"),\n    mode: TransportMode | None = Query(None, alias="mode", description="Filter by transport mode"),\n    alert: bool | None = Query(None, description="Only shipments with active alerts"),\n    page: int = Query(1, ge=1, description="Page number"),\n    size: int = Query(20, ge=1, le=100, description="Page size (max 100)"),\n    db: AsyncSession = Depends(get_db_session),\n    current_user: User = Depends(get_current_user),\n) -> PaginatedResponse[ShipmentListItem]:\n    """List shipments with optional filters and pagination.\n\n    Returns a paginated list of shipments visible to the authenticated user.\n    Supports filtering by status, transport mode, and presence of active alerts.\n\n    Query Parameters:\n        status: Filter to shipments with this exact status\n        mode: Filter to shipments using this primary transport mode\n        alert: If true, only shipments with at least one active alert\n        page: Page number (1-indexed, default 1)\n        size: Items per page (default 20, max 100)\n\n    Returns:\n        Paginated response with shipment list items and metadata\n\n    Authentication:\n        Requires any authenticated user (no specific role restriction for read-only list)\n\n    Performance:\n        - Uses composite index (status, primary_transport_mode) when both filters present\n        - Eager-loads origin/destination locations to avoid N+1 queries\n        - Alert filter uses EXISTS subquery to avoid row duplication\n    """\n\n    # Build base query with eager loading for locations (avoid N+1)\n    query = select(Shipment).options(\n        joinedload(Shipment.origin),\n        joinedload(Shipment.destination),\n    )\n\n    # Apply filters (AND logic)\n    # Active-world guard: the manifest is an OPERATIONS view. The 2015-2018\n    # HISTORICAL parcel era (DataCo ingest) has no legs/geometry and would\n    # otherwise bury the live fleet pages deep (full DB: ~15.6k rows).\n    filters = [_active_world_filter()]\n    if status is not None:\n        filters.append(Shipment.status == status)\n    if mode is not None:\n        filters.append(Shipment.primary_transport_mode == mode)\n    if alert is True:\n        # EXISTS subquery: only shipments with at least one active alert\n        # Avoids row duplication if shipment has multiple alerts\n        alert_exists = exists(\n            select(1)\n            .select_from(Alert)\n            .where(\n                and_(\n                    Alert.shipment_id == Shipment.id,\n                    Alert.status.in_(["OPEN", "ACKNOWLEDGED"]),  # Active alert statuses\n                )\n            )\n        )\n        filters.append(alert_exists)\n\n    if filters:\n        query = query.where(and_(*filters))\n\n    # Default ordering: most urgent SLA first (nulls last), then by created_at desc\n    query = query.order_by(\n        Shipment.strictest_sla_deadline.asc().nullslast(),\n        Shipment.created_at.desc(),\n    )\n\n    # Get total count (before pagination)\n    count_query = select(func.count()).select_from(Shipment)\n    if filters:\n        count_query = count_query.where(and_(*filters))\n    total_result = await db.execute(count_query)\n    total = total_result.scalar() or 0\n\n    # Apply pagination\n    offset = (page - 1) * size\n    query = query.limit(size).offset(offset)\n\n    # Execute paginated query\n    result = await db.execute(query)\n    shipments = result.scalars().unique().all()\n\n    # Convert to response items\n    items = []\n    for shipment in shipments:\n        # Get latest leg for naive ETA placeholder\n        # PLACEHOLDER LOGIC: Uses planned_arrival from latest leg by sequence_number.\n        # ML-based ETA prediction (T-040/T-043) will replace this later.\n        leg_result = await db.execute(\n            select(Leg.planned_arrival)\n            .where(Leg.shipment_id == shipment.id)\n            .order_by(Leg.sequence_number.desc())\n            .limit(1)\n        )\n        latest_leg_eta = leg_result.scalar_one_or_none()\n\n        items.append(\n            ShipmentListItem(\n                id=shipment.id,\n                origin=shipment.origin.locode,  # Eager-loaded, no N+1\n                destination=shipment.destination.locode,  # Eager-loaded, no N+1\n                mode=shipment.primary_transport_mode,\n                status=shipment.status,\n                strictest_sla_deadline=shipment.strictest_sla_deadline,\n                revised_eta=latest_leg_eta,  # Placeholder until T-040/T-043\n            )\n        )\n\n    # Calculate total pages\n    total_pages = (total + size - 1) // size if total > 0 else 0\n\n    return PaginatedResponse(\n        items=items,\n        total=total,\n        page=page,\n        size=size,\n        total_pages=total_pages,\n    )\n\n'


def insert_after(src: str, anchor: str, line: str, name: str) -> str:
    n = src.count(anchor)
    if n != 1:
        raise SystemExit(f"FAIL: {name}: anchor found {n}x - unexpected file")
    return src.replace(anchor, anchor + line, 1)


def swap(src: str, start: str, end: str | None, new: str, name: str) -> str:
    n = src.count(start)
    if n != 1:
        raise SystemExit(f"FAIL: {name}: found {n}x '{start}' - unexpected file")
    s = src.index(start)
    if end is None:
        e = len(src)
    else:
        e = src.find(end, s)
        if e < 0:
            raise SystemExit(f"FAIL: {name}: end marker not found")
    had = src[s:e].count("session.refresh(")
    print(f"  {name}: replacing {e - s} chars (session.refresh loops removed: {had})")
    return src[:s] + new + src[e:]


def fix(path: Path, done_marker: str, jobs, post: list[str], label: str) -> None:
    if not path.exists():
        raise SystemExit(f"FAIL: {path} not found - run from the backend directory")
    src = path.read_text(encoding="utf-8")
    if done_marker in src:
        print(f"OK: {label} already upgraded - skipping")
        return
    for job in jobs:
        if job[0] == "insert":
            _, anchor, line, name = job
            src = insert_after(src, anchor, line, name)
            print(f"  {name}: import inserted")
        else:
            _, start, end, new, name = job
            src = swap(src, start, end, new, name)
    for marker in post:
        if marker not in src:
            raise SystemExit(f"FAIL: {label}: post-check missing {marker!r}")
    path.write_text(src, encoding="utf-8", newline="")
    py_compile.compile(str(path), doraise=True)
    print(f"UPGRADED: {label} + compiled OK")


def main() -> int:
    print("== analytics.py ==")
    fix(
        ANALYTICS,
        A_DONE,
        [
            ("insert", A_IMP_ANCHOR, A_IMP_LINE, "selectinload import"),
            ("swap", BUILD_START, BUILD_END, NEW_BUILD, "_build_aggregates"),
            ("swap", SLA_START, SLA_END, NEW_SLA, "sla_board"),
            ("swap", ESG_START, None, NEW_ESG, "esg_rail"),
        ],
        [A_DONE, "selectinload(Shipment.disruptions)", "selectinload(Shipment.legs), selectinload(Shipment.orders)"],
        "analytics.py",
    )
    print("== shipments.py ==")
    fix(
        SHIPMENTS,
        S_DONE,
        [
            ("insert", S_IMP_ANCHOR, S_IMP_LINE, "_active_world_filter import"),
            ("swap", LIST_START, LIST_END, NEW_LIST, "list_shipments"),
        ],
        [S_DONE, "from nexafreight.api.routes.analytics import _active_world_filter"],
        "shipments.py",
    )
    print("\nDONE. Restart the backend (Ctrl+C, then start uvicorn again) to pick up the fix.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
