import asyncio, os
import sys
sys.path.insert(0, 'src')
from nexafreight.database import get_session_factory
from nexafreight.workers.disruption_detector import check_shipments

async def m():
    async with get_session_factory()() as s:
        print(await check_shipments(s))

asyncio.run(m())
