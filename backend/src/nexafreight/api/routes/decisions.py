"""Decision endpoints (Definitive Plan — Phase 9, admin/operator-only).

Decision rows are the immutable paper trail of operator approvals.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from nexafreight.database import get_db_session
from nexafreight.dependencies import get_current_user
from nexafreight.enums import UserRole
from nexafreight.exceptions import ForbiddenError, ResourceNotFoundError
from nexafreight.models import Decision, User
from nexafreight.schemas.ops import DecisionOut, DecisionsResponse

router = APIRouter()


def _decision_out(d: Decision, actor_name: str | None = None) -> DecisionOut:
    return DecisionOut(
        id=d.id,
        alert_id=d.alert_id,
        shipment_id=d.shipment_id,
        action=str(d.action),
        chosen_option_key=d.chosen_option_key,
        financial_impact=d.financial_impact,
        route_version_before=d.route_version_before,
        route_version_after=d.route_version_after,
        approved_by=(actor_name or (str(d.approved_by) if d.approved_by else None)),
        approved_at=getattr(d, "created_at", None),
        provenance="DERIVED",
    )


def _require_privileged(user: User) -> None:
    """Decisions are operator/admin resources (audit-trail integrity)."""
    if str(user.role) not in (UserRole.ADMIN, UserRole.OPERATOR):
        raise ForbiddenError("Only ADMIN or OPERATOR roles can access decisions")


@router.get("", response_model=DecisionsResponse)
@router.get("/", response_model=DecisionsResponse)
async def list_decisions(
    limit: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> DecisionsResponse:
    """List recent decisions (newest first)."""
    _require_privileged(current_user)
    stmt = select(Decision).order_by(Decision.created_at.desc()).limit(limit)
    result = await session.execute(stmt)
    decisions = list(result.scalars().all())

    # Join approver names where resolvable for a compact audit view.
    names: dict[int, str] = {}
    for d in decisions:
        if d.approved_by is not None and d.approved_by not in names:
            from nexafreight.models import User as UserModel

            u = await session.get(UserModel, d.approved_by)
            if u is not None:
                names[d.approved_by] = u.full_name or u.email
    return DecisionsResponse(
        decisions=[_decision_out(d, names.get(d.approved_by or -1)) for d in decisions]
    )


@router.get("/{decision_id}", response_model=DecisionOut)
async def get_decision(
    decision_id: str,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> DecisionOut:
    """Fetch one decision."""
    _require_privileged(current_user)
    decision = await session.get(Decision, decision_id)
    if decision is None:
        raise ResourceNotFoundError("Decision", decision_id)
    actor = None
    if decision.approved_by is not None:
        from nexafreight.models import User as UserModel

        u = await session.get(UserModel, decision.approved_by)
        if u is not None:
            actor = u.full_name or u.email
    return _decision_out(decision, actor)
