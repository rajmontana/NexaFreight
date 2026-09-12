from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from nexafreight.database import get_db
from nexafreight.models.shipment import Shipment
from nexafreight.services.copilot import answer_shipment_question

router = APIRouter(prefix="/api/copilot", tags=["copilot"])

class AskRequest(BaseModel):
    shipment_id: str
    question: str

@router.post("/ask")
async def ask(req: AskRequest, db: AsyncSession = Depends(get_db)):
    shipment = await db.get(Shipment, req.shipment_id)
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")

    res = await answer_shipment_question(
        session=db,
        shipment=shipment,
        question=req.question
    )
    res["status"] = "ok"
    return res
