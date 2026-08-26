"""DataCo ingestion — REAL order backbone (blueprint §4.3–4.4).

Streaming implementation (bounded memory, container-friendly):
  Pass 1: chunked CSV read -> staging rows + master aggregates (skus, customers)
  Pass 2: stream staging ordered by order_id -> shipments / legs / lines
Planning rules are DETERMINISTIC (no randomness):
  Freight-mode rule   : Same Day -> ROAD, First Class -> AIR,
                        Second Class -> ROAD, Standard Class -> OCEAN
  Origin-facility rule: one regional DC per DataCo market (calibrated_params)
`Late_delivery_risk` is stored but marked LEAKED (never a model feature).
"""

from __future__ import annotations

import datetime as dt
import logging
from collections.abc import Iterator
from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session

from backend.app.models.entities import (
    Customer,
    DatacoOrder,
    EventLog,
    Leg,
    Shipment,
    ShipmentLine,
    Sku,
)

log = logging.getLogger(__name__)

FREIGHT_MODE_RULE = {
    "Same Day": "ROAD",
    "First Class": "AIR",
    "Second Class": "ROAD",
    "Standard Class": "OCEAN",
}

ORIGIN_BY_MARKET = {  # planning rule — recorded in calibrated_params (CALIBRATED)
    "Pacific Asia": "Singapore Regional DC",
    "Europe": "Rotterdam European DC",
    "LATAM": "Santos Regional DC",
    "USCA": "Los Angeles National DC",
    "Africa": "Durban Regional DC",
}

_COLMAP = {  # DataCo column -> staging column
    "Order Id": "order_id", "Order Item Id": "order_item_id",
    "order date (DateOrders)": "order_date", "shipping date (DateOrders)": "ship_date",
    "Shipping Mode": "ship_mode", "Delivery Status": "delivery_status",
    "Late_delivery_risk": "late_risk", "Days for shipment (scheduled)": "days_scheduled",
    "Days for shipping (real)": "days_real", "Order Item Quantity": "qty",
    "Sales": "sales", "Order Item Product Price": "item_price",
    "Order Item Discount": "discount", "Order Profit Per Order": "profit",
    "Product Name": "product_name", "Category Name": "category",
    "Department Name": "department", "Customer Id": "customer_id",
    "Customer Segment": "customer_segment", "Order City": "order_city",
    "Order Country": "order_country", "Order Region": "order_region",
    "Market": "market", "Latitude": "latitude", "Longitude": "longitude",
    "Order Status": "order_status",
}

STAGE_COLS = [c for c in _COLMAP.values()]
CUST_COLS = ["customer_id", "customer_segment", "order_city", "order_country",
             "order_region", "market"]


def _prep_chunk(df: pd.DataFrame) -> pd.DataFrame:
    df = df.rename(columns=_COLMAP)
    for c in ("order_date", "ship_date"):
        df[c] = pd.to_datetime(df[c], format="mixed", errors="coerce", dayfirst=False)
    for c in ("qty", "late_risk", "days_scheduled", "days_real", "order_id",
              "order_item_id", "customer_id"):
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0).astype(int)
    return df


def _stage_and_collect(csv_path: Path, db: Session, chunk_rows: int = 25_000) -> dict:
    """Pass 1: staging insert per chunk; collect tiny master aggregates."""
    db.query(DatacoOrder).delete()
    db.commit()
    staged = 0
    sku_prices: dict[str, list] = {}
    sku_meta: dict[str, tuple] = {}
    cust: dict[int, dict] = {}
    for chunk in pd.read_csv(csv_path, encoding="latin1", chunksize=chunk_rows):
        c = _prep_chunk(chunk)
        db.bulk_insert_mappings(DatacoOrder, c[STAGE_COLS].to_dict("records"))
        db.commit()
        staged += len(c)
        for r in c[["product_name", "category", "department", "item_price"]].drop_duplicates(
                subset=["product_name", "item_price"]).itertuples(index=False):
            sku_prices.setdefault(r.product_name, []).append(float(r.item_price))
            sku_meta.setdefault(r.product_name, (r.category, r.department))
        for r in c[CUST_COLS].drop_duplicates(subset=["customer_id"]).itertuples(index=False):
            cust[int(r.customer_id)] = {"segment": r.customer_segment, "city": r.order_city,
                                        "country": r.order_country, "region": r.order_region,
                                        "market": r.market}
    return {"staged": staged, "sku_prices": sku_prices, "sku_meta": sku_meta, "cust": cust}


def _insert_master(db: Session, agg: dict) -> tuple[dict, dict]:
    db.query(Sku).delete()
    db.query(Customer).delete()
    db.bulk_insert_mappings(Sku, [
        {"name": name, "category": agg["sku_meta"][name][0], "department": agg["sku_meta"][name][1],
         "unit_price_usd": float(pd.Series(prices).median())}
        for name, prices in agg["sku_prices"].items()])
    db.bulk_insert_mappings(Customer, [
        {"dataco_customer_id": cid, **v} for cid, v in agg["cust"].items()])
    db.commit()
    sku_map = {s.name: s.id for s in db.query(Sku.id, Sku.name)}
    cust_map = {c.dataco_customer_id: c.id
                for c in db.query(Customer.id, Customer.dataco_customer_id)}
    return sku_map, cust_map


def _order_groups(db: Session) -> Iterator[list]:
    """Pass 2: stream staging rows ordered by (order_id, item), yielding complete order groups."""
    rows = (db.query(DatacoOrder)
            .order_by(DatacoOrder.order_id, DatacoOrder.order_item_id)
            .yield_per(1000))
    group: list = []
    current: int | None = None
    for r in rows:
        d = {c: getattr(r, c) for c in STAGE_COLS}
        if current is not None and d["order_id"] != current:
            yield group
            group = []
        group.append(d)
        current = d["order_id"]
    if group:
        yield group


def _build_shipments_streaming(db: Session, sku_map: dict, cust_map: dict,
                               orders_per_flush: int = 2000) -> int:
    db.query(Leg).delete()
    db.query(ShipmentLine).delete()
    db.query(Shipment).delete()
    db.commit()

    ship_rows: list[dict] = []
    line_rows: list[dict] = []
    leg_rows: list[dict] = []
    n_ship = 0

    def flush():
        nonlocal n_ship
        if not ship_rows:
            return
        db.bulk_insert_mappings(Shipment, ship_rows)
        db.flush()
        ref_to_id = dict(db.query(Shipment.ref, Shipment.id)
                         .filter(Shipment.ref.in_([s["ref"] for s in ship_rows])).all())
        for lr in line_rows:
            lr["shipment_id"] = ref_to_id[lr.pop("ref_ship")]
        for lg, sr in zip(leg_rows, ship_rows, strict=True):
            lg["shipment_id"] = ref_to_id[sr["ref"]]
        db.bulk_insert_mappings(ShipmentLine, line_rows)
        db.bulk_insert_mappings(Leg, leg_rows)
        db.commit()
        n_ship += len(ship_rows)
        ship_rows.clear()
        line_rows.clear()
        leg_rows.clear()

    pending = 0
    for group in _order_groups(db):
        first = group[0]
        market = first.get("market")
        mode = FREIGHT_MODE_RULE.get(first.get("ship_mode"), "OCEAN")
        order_date, ship_date = first.get("order_date"), first.get("ship_date")
        sched, real = int(first.get("days_scheduled") or 0), int(first.get("days_real") or 0)
        sla_due = order_date + dt.timedelta(days=sched) if order_date else None
        actual = ship_date + dt.timedelta(days=real) if ship_date else None
        ref = f"NXF-{int(first['order_id'])}"
        ship_rows.append({
            "ref": ref, "dataco_order_id": int(first["order_id"]),
            "customer_id": cust_map.get(int(first.get("customer_id") or 0), 1),
            "dest_city": first.get("order_city"), "dest_country": first.get("order_country"),
            "dest_region": first.get("order_region"), "market": market,
            "dest_lat": first.get("latitude"), "dest_lon": first.get("longitude"),
            "freight_mode": mode, "status": "DELIVERED",
            "value_usd": float(sum(x["sales"] or 0 for x in group)),
            "order_date": order_date, "planned_ship_date": ship_date,
            "sla_due_at": sla_due, "actual_delivery": actual,
            "was_late": bool(first.get("late_risk") == 1),
        })
        leg_rows.append({"seq": 1, "mode": mode, "origin": ORIGIN_BY_MARKET.get(market, "Los Angeles National DC"),
                         "destination": first.get("order_country"), "provenance": "REAL:DataCo"})
        for ln in group:
            line_rows.append({"ref_ship": ref, "sku_id": sku_map.get(ln.get("product_name"), 1),
                              "qty": int(ln.get("qty") or 0),
                              "unit_price": float(ln.get("item_price") or 0),
                              "line_value": float(ln.get("sales") or 0)})
        pending += 1
        if pending >= orders_per_flush:
            flush()
            pending = 0
    flush()
    log.info("built %d shipments (streaming)", n_ship)
    return n_ship


def generate_events(db: Session, chunk: int = 10000) -> int:
    """Milestone timelines from REAL timestamps; streamed to bound memory."""
    db.query(EventLog).filter(EventLog.entity_type == "shipment").delete()
    db.commit()
    rows: list[dict] = []
    n = 0
    for s in db.query(Shipment).yield_per(2000):
        base = {"entity_type": "shipment", "entity_id": s.id, "provenance": "REAL:DataCo"}
        if s.order_date:
            rows.append({**base, "event_type": "ORDER_PLACED", "ts": s.order_date,
                         "payload": {"ref": s.ref}})
        if s.sla_due_at:
            rows.append({**base, "event_type": "SLA_DUE", "ts": s.sla_due_at,
                         "payload": {"ref": s.ref, "committed": True}})
        if s.planned_ship_date:
            rows.append({**base, "event_type": "SHIPPED", "ts": s.planned_ship_date,
                         "payload": {"ref": s.ref, "mode": s.freight_mode}})
        if s.actual_delivery:
            rows.append({**base, "event_type": "DELIVERED", "ts": s.actual_delivery,
                         "payload": {"ref": s.ref, "on_time": not s.was_late}})
        if len(rows) >= chunk:
            db.bulk_insert_mappings(EventLog, rows)
            db.commit()
            n += len(rows)
            rows.clear()
    if rows:
        db.bulk_insert_mappings(EventLog, rows)
        db.commit()
        n += len(rows)
    log.info("generated %d shipment events", n)
    return n


def run(csv_path: Path, db: Session) -> dict:
    agg = _stage_and_collect(csv_path, db)
    sku_map, cust_map = _insert_master(db, agg)
    n_ship = _build_shipments_streaming(db, sku_map, cust_map)
    n_events = generate_events(db)
    return {"lines_staged": agg["staged"], "skus": len(sku_map), "customers": len(cust_map),
            "shipments": n_ship, "events": n_events}
