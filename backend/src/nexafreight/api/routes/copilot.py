"""AI copilot endpoint (Definitive Plan — Phase 9).

POST /copilot/ask — natural-language answers about a shipment; LLM errors
degrade to rules (never a 500).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from nexafreight.database import get_db_session
from nexafreight.dependencies import get_current_user
from nexafreight.exceptions import ResourceNotFoundError
from nexafreight.models import Shipment, User
from nexafreight.schemas.ops import CopilotAskRequest, CopilotAskResponse
from nexafreight.services.copilot import answer_shipment_question

router = APIRouter()


@router.post("/ask", response_model=CopilotAskResponse)
async def ask(
    body: CopilotAskRequest,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> CopilotAskResponse:
    """Ask the copilot a question about a shipment."""
    shipment = await session.get(Shipment, body.shipment_id)
    if shipment is None:
        raise ResourceNotFoundError("Shipment", body.shipment_id)

    result = await answer_shipment_question(
        session,
        shipment=shipment,
        question=body.question,
        user=current_user,
    )
    return CopilotAskResponse(
        answer=result["answer"],
        source=result["source"],
        provenance=result["provenance"],
    )
