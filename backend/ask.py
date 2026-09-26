import sys
import asyncio

sys.path.insert(0, "src")

from nexafreight.database import get_session_factory
from nexafreight.services.copilot import answer_shipment_question
from nexafreight.models import User, Shipment
from sqlalchemy import select

async def run():
    session_factory = get_session_factory()
    questions = [
        "Calculate the financial penalty for a delivery delayed by 18 hours based on standard FMCG SLA terms.",
        "Determine the liable party for a 6-hour detention charge incurred at a third-party fulfillment center.",
        "List the necessary variables to compute demurrage fees for a container held 4 days past the free time limit.",
        "Calculate the optimal volume utilization for a standard 53-foot trailer loaded with 24 FMCG pallets.",
        "Identify the routing constraints for transporting temperature-controlled SKUs across state lines.",
        "Compute the projected transit time considering a driver's hours-of-service limitations.",
        "Extract carrier on-time performance metrics from the raw data provided and format as a markdown table.",
        "Cross-reference the provided bill of lading against standard FMCG compliance requirements and list discrepancies.",
        "Summarize the daily freight manifest and flag all shipments at risk of breaching delivery SLAs."
    ]
    async with session_factory() as session:
        user = (await session.execute(select(User).limit(1))).scalar_one_or_none()
        shipment = (await session.execute(select(Shipment).limit(1))).scalar_one_or_none()
        
        for q in questions:
            res = await answer_shipment_question(session, shipment=shipment, question=q, user=user)
            print(f"Q: {q}")
            print(f"A: [{res['source']}] {res['answer']}\n")

if __name__ == "__main__":
    asyncio.run(run())
