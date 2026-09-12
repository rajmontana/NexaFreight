"""Disruption endpoints (Definitive Plan — Phase 9).

List, detail, and report (POST /disruptions). POST immediately assesses the
disruption's impact and raises its alert — the automation loop.
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from nexafreight.database import get_db_session
from nexafreight.dependencies import get_current_user
from nexafreight.enums import DisruptionStatus, DisruptionType
from nexafreight.exceptions import ResourceNotFoundError, ValidationError
from nexafreight.models import Disruption, Shipment, User
from nexafreight.schemas.ops import (
    DisruptionCreate,
    DisruptionOut,
    DisruptionsResponse,
)
from nexafreight.services.alert_engine import process_disruption

router = APIRouter()


def _disruption_out(d: Disruption) -> DisruptionOut:
    return DisruptionOut(
        id=d.id,
        shipment_id=d.shipment_id,
        leg_id=d.leg_id,
        disruption_type=str(d.disruption_type),
        status=str(d.status),
        description=d.description,
        detected_at=d.detected_at,
        resolved_at=d.resolved_at,
    )


@router.get("", response_model=DisruptionsResponse)
@router.get("/", response_model=DisruptionsResponse)
async def list_disruptions(
    status: str | None = Query(None),
    disruption_type: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_db_session),
    _current_user: User = Depends(get_current_user),
) -> DisruptionsResponse:
    """List disruptions (optional status/type filters)."""
    stmt = select(Disruption).order_by(Disruption.detected_at.desc()).limit(limit)
    if status:
        stmt = stmt.where(Disruption.status == status)
    if disruption_type:
        stmt = stmt.where(Disruption.disruption_type == disruption_type)
    result = await session.execute(stmt)
    return DisruptionsResponse(disruptions=[_disruption_out(d) for d in result.scalars().all()])


@router.get("/{disruption_id}", response_model=DisruptionOut)
async def get_disruption(
    disruption_id: str,
    session: AsyncSession = Depends(get_db_session),
    _current_user: User = Depends(get_current_user),
) -> DisruptionOut:
    """Fetch one disruption."""
    disruption = await session.get(Disruption, disruption_id)
    if disruption is None:
        raise ResourceNotFoundError("Disruption", disruption_id)
    return _disruption_out(disruption)


@router.post("", status_code=201)
@router.post("/", status_code=201)
async def report_disruption(
    body: DisruptionCreate,
    session: AsyncSession = Depends(get_db_session),
    _current_user: User = Depends(get_current_user),
) -> dict:
    """Report a disruption → auto-detect → impact analysis → alert (Plan Phase 6)."""
    # Validate type up-front (422, not 500)
    try:
        dtype = DisruptionType(body.disruption_type)
    except ValueError:
        raise ValidationError(
            f"invalid disruption_type {body.disruption_type!r} — "
            f"expected one of {[str(v) for v in DisruptionType]}"
        ) from None

    shipment = await session.get(Shipment, body.shipment_id)
    if shipment is None:
        raise ResourceNotFoundError("Shipment", body.shipment_id)

    disruption = Disruption(
        shipment_id=body.shipment_id,
        disruption_type=dtype,
        status=DisruptionStatus.ACTIVE,
        description=body.description or f"Manual report: {dtype}",
        detected_at=datetime.now(UTC),
    )
    session.add(disruption)
    await session.flush()

    alert = await process_disruption(
        session,
        disruption,
        estimated_delay_hours=(body.delay_hours if body.delay_hours is not None else 24.0),
    )
    await session.commit()

    return {
        "disruption_id": disruption.id,
        "severity": str(alert.severity) if alert else None,
        "alert_id": alert.id if alert else None,
        "provenance": "DERIVED",
    }
