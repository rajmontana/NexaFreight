"""DataCo ingestion — REAL order backbone (blueprint §4.3–4.4).

Stages the raw 180,519-line CSV into `dataco_orders`, extracts master data
(SKUs, customers), and derives shipments/lines/legs with DETERMINISTIC planning
rules (no randomness):

  Freight-mode rule   : Same Day → ROAD, First Class → AIR,
                        Second Class → ROAD, Standard Class → OCEAN
  Origin-facility rule: one regional DC per DataCo market (see calibration)
  SLA due             : order_date + days_scheduled   (REAL fields)
  Actual delivery     : ship_date + days_real          (REAL fields)

`Late_delivery_risk` is stored for analysis but marked LEAKED — it is a
deterministic function of Delivery Status (verified: 98,977/98,977) and may
never be used as a model feature (AGENTS.md §10).
"""

from __future__ import annotations

import datetime as dt
import logging
from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session

from backend.app.models.entities import Customer, DatacoOrder, Leg, Shipment, ShipmentLine, Sku

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


def load_dataframe(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path, encoding="latin1")
    df = df.rename(columns=_COLMAP)
    for c in ("order_date", "ship_date"):
        df[c] = pd.to_datetime(df[c], format="mixed", errors="coerce", dayfirst=False)
    for c in ("qty", "late_risk", "days_scheduled", "days_real", "order_id",
              "order_item_id", "customer_id"):
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0).astype(int)
    return df


def stage_orders(df: pd.DataFrame, db: Session, chunk: int = 5000) -> int:
    db.query(DatacoOrder).delete()
    cols = list(DatacoOrder.__table__.columns.keys())[1:]  # skip autoincrement id
    rows = df[cols].to_dict("records")
    for i in range(0, len(rows), chunk):
        db.bulk_insert_mappings(DatacoOrder, rows[i:i + chunk])
    db.commit()
    log.info("staged %d DataCo order lines", len(rows))
    return len(rows)


def build_master_data(df: pd.DataFrame, db: Session) -> tuple[int, int]:
    db.query(Sku).delete()
    db.query(Customer).delete()
    skus = (
        df.groupby("product_name")
        .agg(category=("category", "first"),
             department=("department", "first"),
             unit_price_usd=("item_price", "median")).reset_index()
        .rename(columns={"product_name": "name"})
    )
    db.bulk_insert_mappings(Sku, skus.to_dict("records"))

    cust = (df.groupby("customer_id")
            .agg(segment=("customer_segment", "first"),
                 city=("order_city", "first"),
                 country=("order_country", "first"),
                 region=("order_region", "first"),
                 market=("market", "first")).reset_index()
            .rename(columns={"customer_id": "dataco_customer_id"}))
    cust["dataco_customer_id"] = cust["dataco_customer_id"].astype(int)
    db.bulk_insert_mappings(Customer, cust.to_dict("records"))
    db.commit()

    # lookup maps
    sku_map = {s.name: s.id for s in db.query(Sku.id, Sku.name).all()}
    cust_map = {c.dataco_customer_id: c.id
                for c in db.query(Customer.id, Customer.dataco_customer_id).all()}
    return len(sku_map), len(cust_map) or 1, sku_map, cust_map  # type: ignore[return-value]


def build_shipments(df: pd.DataFrame, db: Session, sku_map: dict, cust_map: dict,
                    chunk: int = 5000) -> int:
    db.query(Leg).delete()
    db.query(ShipmentLine).delete()
    db.query(Shipment).delete()

    orders = df.sort_values("order_item_id").groupby("order_id", sort=True)
    ship_rows, line_rows, leg_rows = [], [], []
    for order_id, g in orders:
        first = g.iloc[0]
        market = first.get("market")
        mode = FREIGHT_MODE_RULE.get(first.get("ship_mode"), "OCEAN")
        order_date = first.get("order_date")
        ship_date = first.get("ship_date")
        sched = int(first.get("days_scheduled") or 0)
        real = int(first.get("days_real") or 0)
        sla_due = (order_date + dt.timedelta(days=sched)) if pd.notna(order_date) else None
        actual = (ship_date + dt.timedelta(days=real)) if pd.notna(ship_date) else None
        ship_rows.append({
            "ref": f"NXF-{int(order_id)}", "dataco_order_id": int(order_id),
            "customer_id": cust_map.get(int(first.get("customer_id") or 0), 1),
            "dest_city": first.get("order_city"), "dest_country": first.get("order_country"),
            "dest_region": first.get("order_region"), "market": market,
            "dest_lat": float(first["latitude"]) if pd.notna(first.get("latitude")) else None,
            "dest_lon": float(first["longitude"]) if pd.notna(first.get("longitude")) else None,
            "freight_mode": mode, "status": "DELIVERED",
            "value_usd": float(g["sales"].sum()),
            "order_date": None if pd.isna(order_date) else order_date.to_pydatetime(),
            "planned_ship_date": None if pd.isna(ship_date) else ship_date.to_pydatetime(),
            "sla_due_at": sla_due.to_pydatetime() if hasattr(sla_due, "to_pydatetime") else sla_due,
            "actual_delivery": actual.to_pydatetime() if hasattr(actual, "to_pydatetime") else actual,
            "was_late": bool(first.get("late_risk") == 1),
        })
        leg_rows.append({
            "seq": 1, "mode": mode, "origin": ORIGIN_BY_MARKET.get(market, "Los Angeles National DC"),
            "destination": first.get("order_country"), "provenance": "REAL:DataCo",
        })
        for _, ln in g.iterrows():
            line_rows.append({
                "ref_ship": f"NXF-{int(order_id)}",
                "sku_id": sku_map.get(ln.get("product_name"), 1),
                "qty": int(ln.get("qty") or 0),
                "unit_price": float(ln.get("item_price") or 0),
                "line_value": float(ln.get("sales") or 0),
            })

    for i in range(0, len(ship_rows), chunk):
        db.bulk_insert_mappings(Shipment, ship_rows[i:i + chunk])
    db.commit()
    ref_to_id = {s.ref: s.id for s in db.query(Shipment.id, Shipment.ref).all()}
    for lr in line_rows:
        lr["shipment_id"] = ref_to_id[lr.pop("ref_ship")]
    for j, lg in enumerate(leg_rows):
        lg["shipment_id"] = ref_to_id[ship_rows[j]["ref"]]
    for i in range(0, len(line_rows), chunk):
        db.bulk_insert_mappings(ShipmentLine, line_rows[i:i + chunk])
    for i in range(0, len(leg_rows), chunk):
        db.bulk_insert_mappings(Leg, leg_rows[i:i + chunk])
    db.commit()
    n = db.query(Shipment).count()
    log.info("built %d shipments, %d lines, %d legs", n, len(line_rows), len(leg_rows))
    return n


def run(csv_path: Path, db: Session) -> dict:
    df = load_dataframe(csv_path)
    staged = stage_orders(df, db)
    n_sku, n_cust, sku_map, cust_map = build_master_data(df, db)
    n_ship = build_shipments(df, db, sku_map, cust_map)
    return {"lines_staged": staged, "skus": n_sku, "customers": n_cust, "shipments": n_ship}
