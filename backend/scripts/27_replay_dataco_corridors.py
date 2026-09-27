"""DataCo corridor replay: real demand weighting -> DERIVED intl shipments.

ORDER FACTS are real (revenue, scheduled-vs-real days -> SLA outcome, region demand);
the ROUTE is the planner's recommendation (DERIVED); nothing claims live positions.
Idempotent by DC-<Order Id> citation. Deterministic under --seed.
"""
import argparse
import asyncio
import importlib.util
import logging
import random
import sys
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

import pandas as pd
from sqlalchemy import select

# Set up paths and import models/enums
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from nexafreight.adapters.routing._geometry import haversine_km
from nexafreight.services.consolidation import containers_for_total
from nexafreight.enums import CargoClass, LegStatus, OrderSlaStatus, Provenance, ShipmentStatus, TransportMode
from nexafreight.models.leg import Leg
from nexafreight.models.location import Location
from nexafreight.models.network import NetworkNode, NetworkEdge
from nexafreight.models.order import Order
from nexafreight.models.shipment import Shipment
from nexafreight.services.demo_parties import assign_parties, load_party_pools
from nexafreight.services.planner import get_planner
from nexafreight.core.clock import world_now
from nexafreight.database import get_session_factory

# Load script 21
spec = importlib.util.spec_from_file_location("drip_orders", str(Path(__file__).parent / "21_drip_orders.py"))
drip_orders = importlib.util.module_from_spec(spec)
spec.loader.exec_module(drip_orders)
_leg_geometry = drip_orders.WorldDripper._leg_geometry

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("replay_dataco")

CORRIDORS = [
    ("USNYC", "NLRTM", set(), {"Northern Europe", "Western Europe"}),
    ("CNSHA", "USLAX", set(), {"Western US", "Eastern US", "Canada"}),
    ("SGSIN", "JPTYO", set(), {"Eastern Asia"}),
    ("INJNP", "SGSIN", set(), {"Southeast Asia"}),
    ("AEBUE", "ZADUR", set(), {"Africa"}),
    ("BRSSZ", "AUSYD", set(), {"Oceania"}),
    ("DEHAM", "NLRTM", set(), {"Eastern Europe"}),
]

USECOLS = [
    "Order Id", "Order Region", "Order Item Total", "Shipping Mode",
    "Days for shipment (scheduled)", "Days for shipping (real)", "order date (DateOrders)"
]

def load_orders_frame(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, encoding="latin-1", usecols=USECOLS)
    df = df.dropna(subset=["Order Id", "Order Region"])
    df = df.drop_duplicates(subset=["Order Id"])
    df["order date (DateOrders)"] = pd.to_datetime(df["order date (DateOrders)"], errors="coerce")
    df = df.dropna(subset=["order date (DateOrders)"])
    return df

def assign_corridors(df: pd.DataFrame) -> tuple[dict[tuple[str, str], list[int]], list[int]]:
    lanes = { (c[0], c[1]): [] for c in CORRIDORS }
    unmapped = []
    
    regions = df["Order Region"].values
    for idx, region in enumerate(regions):
        mapped = False
        for origin, dest, _orig_regions, dest_regions in CORRIDORS:
            if region in dest_regions:
                lanes[(origin, dest)].append(idx)
                mapped = True
                break
        if not mapped:
            unmapped.append(idx)
            
    return lanes, unmapped

async def run(args):
    df = load_orders_frame(args.dataco)
    lanes, unmapped = assign_corridors(df)
    
    total_mapped = sum(len(v) for _, v in lanes.items())
    corridors_count = len([v for _, v in lanes.items() if v])
    print(f"REPORT > REPLAY: CSV unique orders={len(df)}, mapped={total_mapped} ({len(unmapped)} regions unmapped), corridors={corridors_count}")
    
    # Sort lanes by demand (descending length)
    top_lanes = sorted(lanes.items(), key=lambda item: len(item[1]), reverse=True)[:args.top]
    
    if args.dry_run:
        for (o, d), idxs in top_lanes:
            print(f"  {o}->{d}: {len(idxs)} orders")
        return
        
    rng = random.Random(args.seed)
    planner = get_planner()
    world = world_now()
    
    SessionLocal = get_session_factory()
    
    async with SessionLocal() as session:
        # Load caches
        loc_rows = (await session.execute(select(Location))).scalars().all()
        locode_to_location = {loc.locode: loc.id for loc in loc_rows}
        nodes = (await session.execute(select(NetworkNode))).scalars().all()
        node_coords = {n.locode: (n.latitude, n.longitude) for n in nodes}
        edge_geometry = {
            e.id: e.geometry_json
            for e in (await session.execute(select(NetworkEdge))).scalars().all()
            if e.geometry_json
        }
        party_pools = await load_party_pools(session)
        
        # Select existing citations to skip
        existing = set((await session.execute(
            select(Order.order_number).where(Order.order_number.like("DC-%"))
        )).scalars().all())
        
        shipments_created = 0
        delivered = 0
        in_transit = 0
        skipped = 0
        
        count = 0
        for (o, d), idxs in top_lanes:
            if count >= args.limit:
                break
            
            for i in idxs:
                if count >= args.limit:
                    break
                    
                row = df.iloc[i]
                order_id = str(int(row["Order Id"]))
                citation = f"DC-{order_id}"
                
                if citation in existing:
                    continue
                    
                order_date = world - timedelta(days=rng.randint(1, args.days_back))
                scheduled = int(row["Days for shipment (scheduled)"])
                real = int(row["Days for shipping (real)"])
                
                deadline = order_date + timedelta(days=scheduled)
                sla_status = OrderSlaStatus.ON_TIME if real <= scheduled else OrderSlaStatus.LATE
                route_deadline = order_date + timedelta(days=max(scheduled, 45))
                
                revenue = float(row["Order Item Total"])
                shipping_cost = revenue * rng.uniform(0.08, 0.25)
                weight = rng.uniform(8000, 18000)
                volume = rng.uniform(20, 55)
                
                shipment_id = str(uuid.uuid4())
                order = Order(
                    order_number=citation,
                    shipment_id=shipment_id,
                    order_date=order_date,
                    sla_deadline=deadline,
                    revenue=round(revenue, 2),
                    shipping_cost=round(shipping_cost, 2),
                    sla_status=sla_status,
                    cargo_class=CargoClass.STANDARD,
                    weight_kg=round(weight, 1),
                    volume_m3=round(volume, 2),
                    shipping_mode=TransportMode.SEA,
                )
                assign_parties(order, party_pools, rng)
                
                shipment = Shipment(
                    id=shipment_id,
                    provenance=Provenance.DERIVED,
                    status=ShipmentStatus.PLANNED,
                    container_count=containers_for_total(order.weight_kg, order.volume_m3, "SEA"),
                    route_version=1,
                    origin_id=locode_to_location.get(o),
                    destination_id=locode_to_location.get(d),
                    cargo_class=CargoClass.STANDARD,
                    primary_transport_mode=TransportMode.SEA,
                    strictest_sla_deadline=deadline,
                    planned_departure=order_date + timedelta(days=1),
                )
                
                session.add_all([order, shipment])
                await session.flush()
                
                # Try planning
                itins = await planner.plan(session, shipment_id, o, d, query_time=order_date, deadline=route_deadline, persist=True)
                if not itins:
                    await session.rollback()
                    # retry ONCE with persist=False
                    itins = await planner.plan(session, shipment_id, o, d, query_time=order_date, deadline=route_deadline, persist=False)
                    if not itins:
                        await session.rollback()
                        log.warning(f"no itinerary for {citation} {o}->{d} - skipped")
                        skipped += 1
                        continue
                
                itin = itins[0]
                legs = []
                for seq, kpi in enumerate(itin.legs, start=1):
                    o_coord = node_coords.get(kpi.from_locode)
                    d_coord = node_coords.get(kpi.to_locode)
                    km = haversine_km(*o_coord, *d_coord) if o_coord and d_coord else None
                    
                    if world >= kpi.arrival_at:
                        status = LegStatus.COMPLETED
                    elif world >= kpi.departure_at:
                        status = LegStatus.IN_PROGRESS
                    else:
                        status = LegStatus.PLANNED
                        
                    geom = _leg_geometry(TransportMode(kpi.mode), o_coord, d_coord, edge_geometry.get(kpi.edge_id))
                    
                    leg = Leg(
                        shipment_id=shipment_id,
                        sequence_number=seq,
                        transport_mode=TransportMode(kpi.mode),
                        status=status,
                        origin_id=locode_to_location.get(kpi.from_locode),
                        destination_id=locode_to_location.get(kpi.to_locode),
                        planned_departure=kpi.departure_at,
                        planned_arrival=kpi.arrival_at,
                        route_geometry_json=geom,
                        distance_km=round(km, 1) if km else None,
                        co2_kg=round(kpi.co2_kg, 1),
                        provenance=Provenance.DERIVED,
                        route_version=1,
                    )
                    session.add(leg)
                    legs.append(leg)
                
                if not legs:
                    await session.rollback()
                    skipped += 1
                    continue
                    
                shipment.primary_transport_mode = TransportMode(itin.legs[0].mode)
                order.shipping_mode = TransportMode(itin.legs[0].mode)
                
                if all(leg.status == LegStatus.COMPLETED for leg in legs):
                    shipment.status = ShipmentStatus.DELIVERED
                    delivered += 1
                    for leg in legs:
                        leg.actual_departure = leg.planned_departure
                        leg.actual_arrival = leg.planned_arrival
                elif any(leg.status == LegStatus.IN_PROGRESS for leg in legs):
                    shipment.status = ShipmentStatus.IN_TRANSIT
                    in_transit += 1
                else:
                    shipment.status = ShipmentStatus.PLANNED
                    
                await session.commit()
                shipments_created += 1
                count += 1
                
        print(f"REPORT > REPLAY DONE: shipments={shipments_created} (delivered={delivered}, in_transit={in_transit}), skipped={skipped}, provenance=DERIVED, citations=DC-<Order Id>")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataco", type=Path, default=Path("data/raw/dataco/DataCoSupplyChain.csv"))
    ap.add_argument("--limit", type=int, default=300)
    ap.add_argument("--top", type=int, default=5)
    ap.add_argument("--days-back", type=int, default=21)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--db-url", type=str, default=None)
    args = ap.parse_args()
    asyncio.run(run(args))
