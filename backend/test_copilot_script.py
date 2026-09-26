import sys
import asyncio
from sqlalchemy import select
from nexafreight.database import get_session_factory
from nexafreight.models import Shipment
from nexafreight.services.copilot import answer_shipment_question

async def test():
    factory = get_session_factory()
    async with factory() as db:
        res = await db.execute(select(Shipment).limit(1))
        shipment = res.scalar_one_or_none()
        if not shipment:
            print("shipment not found")
            return
        questions = [
            "What is the primary mode of transport for this shipment?",
            "If the SLA deadline is missed, what is the estimated financial exposure?",
            "Can you suggest a mitigation strategy to improve the delivery time?"
        ]
        
        for q in questions:
            print(f"\n--- Question: {q}")
            res_copilot = await answer_shipment_question(db, shipment=shipment, question=q)
            print(f"Source: {res_copilot.get('source')}")
            print(f"Answer: {res_copilot.get('answer')}")

if __name__ == "__main__":
    asyncio.run(test())
