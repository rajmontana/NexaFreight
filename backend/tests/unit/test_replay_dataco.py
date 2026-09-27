import os
import sys
import pandas as pd
import pytest
import importlib.util
from datetime import datetime, timedelta, UTC
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "backend"))

from nexafreight.models import Base, Location, NetworkNode, Order, Shipment, Leg
from nexafreight.enums import Provenance

# Load script 27 dynamically
spec = importlib.util.spec_from_file_location("replay_dataco", str(Path(__file__).parent.parent.parent / "scripts" / "27_replay_dataco_corridors.py"))
replay_dataco = importlib.util.module_from_spec(spec)
sys.modules["replay_dataco"] = replay_dataco
spec.loader.exec_module(replay_dataco)

def test_corridor_mapping():
    df = pd.DataFrame({
        "Order Region": ["Western US", "Northern Europe", "Unknown Region"]
    })
    lanes, unmapped = replay_dataco.assign_corridors(df)
    
    assert len(lanes[("CNSHA", "USLAX")]) == 1
    assert lanes[("CNSHA", "USLAX")][0] == 0
    assert len(lanes[("USNYC", "NLRTM")]) == 1
    assert lanes[("USNYC", "NLRTM")][0] == 1
    assert len(unmapped) == 1
    assert unmapped[0] == 2

@pytest.mark.asyncio
async def test_replay_idempotent_citations(tmp_path):
    csv_file = tmp_path / "DataCoSupplyChain.csv"
    df = pd.DataFrame({
        "Order Id": [1, 2, 3],
        "Order Region": ["Western US", "Western US", "Western US"],
        "Order Item Total": [100.0, 200.0, 300.0],
        "Shipping Mode": ["Standard Class", "Standard Class", "Standard Class"],
        "Days for shipment (scheduled)": [4, 4, 4],
        "Days for shipping (real)": [2, 5, 4],
        "order date (DateOrders)": ["1/1/2016 0:00", "1/2/2016 0:00", "1/3/2016 0:00"]
    })
    df.to_csv(csv_file, index=False)
    
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with async_session() as session:
        from nexafreight.enums import LocationType, NodeType
        loc1 = Location(id=1, locode="CNSHA", name="Shanghai", country_code="CN", location_type=LocationType.PORT, latitude=31.2, longitude=121.5)
        loc2 = Location(id=2, locode="USLAX", name="LA", country_code="US", location_type=LocationType.PORT, latitude=33.9, longitude=-118.4)
        node1 = NetworkNode(id=1, locode="CNSHA", latitude=31.2, longitude=121.5, name="Shanghai", node_type=NodeType.PORT)
        node2 = NetworkNode(id=2, locode="USLAX", latitude=33.9, longitude=-118.4, name="LA", node_type=NodeType.PORT)
        session.add_all([loc1, loc2, node1, node2])
        await session.commit()
        
    class FakeLeg:
        def __init__(self):
            self.from_locode = "CNSHA"
            self.to_locode = "USLAX"
            self.mode = "SEA"
            self.departure_at = datetime.now(UTC) + timedelta(days=1)
            self.arrival_at = datetime.now(UTC) + timedelta(days=10)
            self.co2_kg = 100.0
            self.edge_id = None
            
    class FakeItinerary:
        def __init__(self):
            self.legs = [FakeLeg()]
            
    class FakePlanner:
        async def plan(self, session, shipment_id, o, d, query_time, deadline, persist):
            return [FakeItinerary()]
            
    original_get_planner = replay_dataco.get_planner
    replay_dataco.get_planner = lambda: FakePlanner()
    
    original_get_session_factory = replay_dataco.get_session_factory
    replay_dataco.get_session_factory = lambda url=None: async_session
    
    original_load_party_pools = replay_dataco.load_party_pools
    async def mock_load_party_pools(s): return None
    replay_dataco.load_party_pools = mock_load_party_pools
    
    original_assign_parties = replay_dataco.assign_parties
    replay_dataco.assign_parties = lambda o, p, r: None
    
    try:
        class Args:
            dataco = csv_file
            limit = 300
            top = 5
            days_back = 21
            seed = 42
            dry_run = False
            db_url = None
            
        args = Args()
        
        await replay_dataco.run(args)
        await replay_dataco.run(args)
        
        async with async_session() as session:
            orders = (await session.execute(select(Order).where(Order.order_number.like("DC-%")))).scalars().all()
            assert len(orders) == 3
            
            shipments = (await session.execute(select(Shipment))).scalars().all()
            assert len(shipments) == 3
            assert all(s.provenance == Provenance.DERIVED for s in shipments)
            
    finally:
        replay_dataco.get_planner = original_get_planner
        replay_dataco.get_session_factory = original_get_session_factory
        replay_dataco.load_party_pools = original_load_party_pools
        replay_dataco.assign_parties = original_assign_parties
