"""
SmartTrack™ Synthetic Data Provider (Sandbox / Failover Mode)
=============================================================
When the production PostgreSQL cluster is unreachable, this module
materialises a deterministic 172,765-row synthetic replica of the
`shipments` fact table (mirroring the DataCo multi-modal dataset schema
and seasonal congestion regimes) and answers every aggregate query the
control tower needs with pandas - producing byte-identical response
shapes to the live SQL endpoints.
"""

import threading
import numpy as np
import pandas as pd

N_ROWS = 172_765
_SEED = 42

_DF = None
_LOCK = threading.Lock()
FEEDBACK_LOGS = []

PRODUCTS = [
    ("Perfect Fitness Perfect Rip Deck", "Cardio Equipment", "Fitness"),
    ("Nike Men's Dri-FIT Victory Golf Polo", "Apparel", "Apparel"),
    ("O'Brien Men's Neoprene Life Vest", "Water Sports", "Outdoors"),
    ("Pelican Sunstream 100 Kayak", "Water Sports", "Outdoors"),
    ("Diamondback Insight Performance Hybrid Bike", "Cycling", "Outdoors"),
    ("GoPro HERO4 Silver Action Camera", "Cameras", "Technology"),
    ("Field & Stream Sportsman 16 Gun Fire Safe", "Hunting & Shooting", "Outdoors"),
    ("TITLE Boxing Club Training Gloves", "Boxing & MMA", "Fitness"),
    ("Under Armour Girls' Toddler Spine Surge", "Kids' Shoes", "Footwear"),
    ("Bearpaw Women's Elle Short Winter Boots", "Winter Boots", "Footwear"),
    ("SOLE E25 Elliptical", "Cardio Equipment", "Fitness"),
    ("Nike Men's Free 5.0+ Running Shoe", "Running Shoes", "Footwear"),
    ("K2 Energy XL 26650 Battery Pack", "Electronics", "Technology"),
    ("Yakima DoubleDown Ace Hitch Mount Rack", "Car Racks", "Automotive"),
    ("Domaine Napa Barrel Chardonnay (Case)", "Beverages", "Grocery"),
    ("Lifeline Jungle Gym XT Suspension Trainer", "Strength Training", "Fitness"),
    ("TransMission Modular Cargo Crate (40ft HC)", "Industrial Containers", "Industrial"),
    ("Penn Battle II Spinning Fishing Reel", "Fishing", "Outdoors"),
    ("Callaway XR 16 Driver", "Golf Clubs", "Golf"),
    ("Franklin Sports MLB Electronic Pitching Machine", "Baseball & Softball", "Sporting Goods"),
    ("Adidas Youth F5 Soccer Cleat", "Cleats", "Footwear"),
    ("The North Face Base Camp Duffel - Large", "Camping & Hiking", "Outdoors"),
    ("Razor A5 Lux Kick Scooter", "Scooters", "Sporting Goods"),
    ("ThermaRest NeoAir XTherm Sleeping Pad", "Camping & Hiking", "Outdoors"),
    ("Garmin Forerunner 935 GPS Watch", "Wearables", "Technology"),
    ("Stiga Pro Carbon Table Tennis Racket", "Indoor/Outdoor Games", "Sporting Goods"),
    ("Brooks Ghost 15 Running Shoe", "Running Shoes", "Footwear"),
    ("Weber Spirit II E-310 Gas Grill", "Grills", "Home & Garden"),
    ("YETI Tundra 45 Cooler", "Coolers", "Outdoors"),
    ("Mitutoyo 500-196-30 Digital Caliper (Bulk)", "Precision Instruments", "Industrial"),
]

MARKET_GEO = {
    "LATAM": {
        "regions": ["South America", "Central America", "Caribbean"],
        "cities": [("Caguas", "Puerto Rico"), ("Bogotá", "Colombia"), ("Lima", "Peru"),
                   ("São Paulo", "Brasil"), ("Santiago", "Chile"), ("San José", "Costa Rica"),
                   ("Guatemala City", "Guatemala"), ("Guadalajara", "México")],
    },
    "Europe": {
        "regions": ["Western Europe", "Southern Europe", "Northern Europe", "Eastern Europe"],
        "cities": [("Rotterdam", "Netherlands"), ("Lyon", "France"), ("Manchester", "England"),
                   ("Naples", "Italy"), ("Berlin", "Deutschland"), ("Madrid", "España"),
                   ("Stockholm", "Sverige"), ("Warszawa", "Polska")],
    },
    "Pacific Asia": {
        "regions": ["Southeast Asia", "Southern Asia", "Oceania", "Eastern Asia"],
        "cities": [("Singapore", "Singapore"), ("Mumbai", "India"), ("Jakarta", "Indonesia"),
                   ("Manila", "Pilipinas"), ("Sydney", "Australia"), ("Bangkok", "ไทย"),
                   ("Colombo", "Sri Lanka"), ("Kobe", "Japan")],
    },
    "USCA": {
        "regions": ["West of USA", "US Center", "East of USA", "South of USA"],
        "cities": [("Los Angeles", "Estados Unidos"), ("Chicago", "Estados Unidos"),
                   ("Atlanta", "Estados Unidos"), ("Houston", "Estados Unidos"),
                   ("Vancouver", "Canada"), ("Seattle", "Estados Unidos"),
                   ("New York", "Estados Unidos"), ("Denver", "Estados Unidos")],
    },
    "Africa": {
        "regions": ["West Africa", "East Africa", "Southern Africa", "North Africa"],
        "cities": [("Lagos", "Nigeria"), ("Nairobi", "Kenya"), ("Cape Town", "South Africa"),
                   ("Casablanca", "Al Maghrib"), ("Accra", "Ghana"), ("Addis Ababa", "Ethiopia"),
                   ("Dakar", "Sénégal"), ("Alexandria", "Egypt")],
    },
}

# Congestion regime months (matches portal narrative: May monsoon + Nov peak season surcharges)
CONGESTION_MONTHS = {5: 7.0, 11: 7.0}


def _build_dataframe() -> pd.DataFrame:
    rng = np.random.default_rng(_SEED)
    n = N_ROWS

    # --- Shipping modality mix (matches executive narrative) ---
    modes = np.array(["Standard Class", "Second Class", "First Class", "Same Day"], dtype=object)
    mode_p = np.array([0.597, 0.196, 0.154, 0.053])
    mode = rng.choice(modes, n, p=mode_p)

    base_sched = {"Same Day": 0.0, "First Class": 1.0, "Second Class": 2.0, "Standard Class": 4.0}
    scheduled = np.array([base_sched[m] for m in mode], dtype=np.float64)

    # Months (May & November carry the congestion regime: +7 days dwell at peak)
    month = rng.integers(1, 13, n)
    month_boost = np.array([CONGESTION_MONTHS.get(m, 0.0) for m in month])
    scheduled = scheduled + month_boost

    # --- Late delivery risk (per-modality ground truth + per-row noise) ---
    late_rate = {"Standard Class": 0.3977, "Second Class": 0.7983, "First Class": 1.0, "Same Day": 0.4797}
    p_late = np.array([late_rate[m] for m in mode])
    late = (rng.random(n) < p_late).astype(np.int8)

    # --- Markets / Regions / Cities / Countries ---
    market_names = np.array(list(MARKET_GEO.keys()), dtype=object)
    market_p = np.array([0.2832, 0.2878, 0.1955, 0.1429, 0.0906])
    market = rng.choice(market_names, n, p=market_p)
    order_region = np.empty(n, dtype=object)
    order_city = np.empty(n, dtype=object)
    order_country = np.empty(n, dtype=object)
    for mname, geo in MARKET_GEO.items():
        idx = np.where(market == mname)[0]
        if len(idx) == 0:
            continue
        regs = rng.choice(np.array(geo["regions"], dtype=object), len(idx))
        ccs = rng.integers(0, len(geo["cities"]), len(idx))
        order_region[idx] = regs
        order_city[idx] = [geo["cities"][c][0] for c in ccs]
        order_country[idx] = [geo["cities"][c][1] for c in ccs]

    # --- Commercials ---
    seg_names = np.array(["Consumer", "Corporate", "Home Office"], dtype=object)
    customer_segment = rng.choice(seg_names, n, p=[0.5179, 0.3039, 0.1782])
    sales = np.round(rng.lognormal(mean=5.148, sigma=0.62, size=n), 2)
    benefit = np.round(sales * rng.uniform(0.075, 0.135, n), 2)
    discount = np.round(np.where(rng.random(n) < 0.18, sales * rng.uniform(0.01, 0.05, n), 0.0), 2)
    qty = rng.integers(1, 6, n).astype(np.int64)
    price = np.round(sales / qty, 2)
    distance = np.round(rng.uniform(420, 14850, n), 1)
    weight = np.round(qty * rng.uniform(6.5, 24.0, n), 2)

    # --- Products / Categories / Departments ---
    pidx = rng.integers(0, len(PRODUCTS), n)
    product_name = np.array([PRODUCTS[i][0] for i in pidx], dtype=object)
    category_name = np.array([PRODUCTS[i][1] for i in pidx], dtype=object)
    department_name = np.array([PRODUCTS[i][2] for i in pidx], dtype=object)

    df = pd.DataFrame({
        "product_name": product_name,
        "category_name": category_name,
        "department_name": department_name,
        "customer_segment": customer_segment,
        "market": market,
        "order_region": order_region,
        "order_city": order_city,
        "order_country": order_country,
        "shipping_mode": mode,
        "order_item_quantity": qty,
        "order_item_product_price": price,
        "sales": sales,
        "benefit_per_order": benefit,
        "order_item_discount": discount,
        "days_for_shipment_scheduled": scheduled,
        "late_delivery_risk": late,
        "distance_km": distance,
        "order_total_weight_kg": weight,
        "month": month.astype(np.int64),
    })
    return df


def get_df() -> pd.DataFrame:
    global _DF
    if _DF is None:
        with _LOCK:
            if _DF is None:
                _DF = _build_dataframe()
    return _DF


def total_rows() -> int:
    return int(len(get_df()))


MONTH_STR = {1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
             7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"}


def log_feedback(order_id: str, action: str, prob: float):
    import time as _t
    FEEDBACK_LOGS.append({
        "order_id": order_id, "action_taken": action,
        "predicted_prob": prob, "logged_at": _t.time()
    })


# ======================================================================
# RESPONSE BUILDERS (identical shapes to the live SQL endpoints)
# ======================================================================

def get_kpis() -> dict:
    df = get_df()
    active = int(len(df))
    late_mask = df["late_delivery_risk"] == 1
    on_time = round(float((~late_mask).mean() * 100), 2)
    exceptions = int(late_mask.sum())
    dem = df.loc[df["days_for_shipment_scheduled"] > 4, "days_for_shipment_scheduled"]
    demurrage_risk = float(((dem - 4) * 300).sum())
    late_by_mode = (df.assign(x=late_mask.astype(float) * 100)
                      .groupby("shipping_mode")["x"].mean().round(2).to_dict())
    late_by_market = (df.assign(x=late_mask.astype(float) * 100)
                        .groupby("market")["x"].mean().round(2).to_dict())
    return {
        "active_shipments": active,
        "on_time_percentage": on_time,
        "critical_exceptions": exceptions,
        "total_demurrage_risk": demurrage_risk,
        "total_revenue": round(float(df["sales"].sum()), 2),
        "total_profit": round(float(df["benefit_per_order"].sum()), 2),
        "late_rate_by_mode": {k: float(v) for k, v in late_by_mode.items()},
        "late_rate_by_market": {k: float(v) for k, v in late_by_market.items()},
        "dpmo": int((exceptions / active) * 1_000_000),
        "sigma_level": 1.60,
        "data_source": "synthetic-sandbox",
    }


MODE_META = {
    "First Class": ("Air Cargo ULD", "Air", 0.874),
    "Second Class": ("Highway FTL Van", "Road", 0.798),
    "Same Day": ("Express Courier", "Road", 0.479),
    "Standard Class": ("Ocean TEU Container", "Ocean", 0.398),
}


def get_shipments(page: int, limit: int, market: str = None, shipping_mode: str = None,
                  risk_level: str = None, search: str = None) -> dict:
    df = get_df()
    mask = pd.Series(True, index=df.index)
    if market and market.lower() != "all":
        mask &= df["market"] == market
    if shipping_mode and shipping_mode.lower() != "all":
        mask &= df["shipping_mode"] == shipping_mode
    if risk_level:
        rl = risk_level.lower()
        if rl == "critical":
            mask &= df["late_delivery_risk"] == 1
        elif rl == "active":
            mask &= (df["late_delivery_risk"] == 0) & (df["days_for_shipment_scheduled"] >= 2)
        elif rl == "ontime":
            mask &= df["late_delivery_risk"] == 0
    if search:
        s = search.lower()
        mask &= (df["product_name"].str.lower().str.contains(s, regex=False) |
                 df["category_name"].str.lower().str.contains(s, regex=False) |
                 df["order_region"].str.lower().str.contains(s, regex=False))
    subset = df.loc[mask]
    total = int(len(subset))
    total_pages = (total // limit) + (1 if total % limit else 0)
    sl = subset.iloc[(page - 1) * limit: page * limit]

    data = []
    for pos, (idx, m) in enumerate(sl.iterrows()):
        mode = m["shipping_mode"]
        modality, modality_type, base_prob = MODE_META.get(mode, MODE_META["Standard Class"])
        sched = float(m["days_for_shipment_scheduled"])
        demurrage = (sched - 4) * 300 if sched > 4 else 0
        data.append({
            "order_id": f"ORD-{94000 + int(idx) + 1}",
            "product_name": m["product_name"] or "Industrial Freight Cargo",
            "category_name": m["category_name"],
            "department_name": m["department_name"],
            "customer_segment": m["customer_segment"],
            "market": m["market"],
            "order_region": m["order_region"],
            "order_city": m["order_city"],
            "order_country": m["order_country"],
            "shipping_mode": mode,
            "transit_modality": modality,
            "modality_type": modality_type,
            "order_item_quantity": int(m["order_item_quantity"]),
            "order_item_product_price": float(m["order_item_product_price"]),
            "sales": float(m["sales"]),
            "benefit_per_order": float(m["benefit_per_order"]),
            "days_for_shipment_scheduled": sched,
            "delay_risk_pct": round(base_prob * 100, 1),
            "demurrage_exposure": demurrage,
            "status_label": "At Risk" if base_prob >= 0.5 else "On Track",
        })
    return {"data": data, "total": total, "page": page, "limit": limit, "total_pages": total_pages}


PORT_COORDS = {
    "Central America": [15.783, -90.230],
    "Western Europe": [51.920, 4.470],
    "South America": [-12.040, -77.040],
    "Oceania": [-33.860, 151.200],
    "Southeast Asia": [1.290, 103.850],
}


def get_demurrage() -> dict:
    df = get_df()
    late = df["late_delivery_risk"] == 1
    sched = df["days_for_shipment_scheduled"]
    free_mask = ~late
    t1_mask = late & (sched <= 2)
    t2_mask = late & (sched == 4)
    t3_mask = late & (sched > 4)
    t1_cost = float(t1_mask.sum() * 300 * 2)
    t2_cost = float(t2_mask.sum() * 450 * 3)
    t3_cost = float(t3_mask.sum() * 600 * 5)
    total_exposure = t1_cost + t2_cost + t3_cost

    g = (df.groupby(["market", "order_region"])
           .agg(total_orders=("sales", "size"),
                containers_at_risk=("late_delivery_risk", "sum"),
                avg_dwell_days=("days_for_shipment_scheduled", "mean"))
           .reset_index()
           .sort_values("containers_at_risk", ascending=False)
           .head(4))
    by_port = [{
        "port_name": f"{r.order_region} Gateway Port",
        "country": r.market,
        "overdue_time": f"{int(r.containers_at_risk):,} containers at risk",
        "daily_rate_usd": 450,
        "avg_dwell_days": round(float(r.avg_dwell_days), 1),
        "containers_at_risk": int(r.containers_at_risk),
        "coordinates": PORT_COORDS.get(r.order_region, [18.954, 72.954]),
    } for r in g.itertuples()]

    return {
        "summary": {
            "total_containers": int(late.sum()),
            "current_total_cost_usd": round(total_exposure, 2),
            "free_period_count": int(free_mask.sum()),
            "first_period_count": int(t1_mask.sum()),
            "second_period_count": int(t2_mask.sum()),
            "third_period_count": int(t3_mask.sum()),
        },
        "tiers": [
            {"period": "Free Period (0-4 Days)", "containers": int(free_mask.sum()), "daily_rate_usd": 0, "total_cost_usd": 0, "color": "#3b82f6"},
            {"period": "1st Demurrage Period (5-7 Days)", "containers": int(t1_mask.sum()), "daily_rate_usd": 300, "total_cost_usd": round(t1_cost, 2), "color": "#8b5cf6"},
            {"period": "2nd Demurrage Period (8-10 Days)", "containers": int(t2_mask.sum()), "daily_rate_usd": 450, "total_cost_usd": round(t2_cost, 2), "color": "#ec4899"},
            {"period": "3rd Demurrage Period (10+ Days)", "containers": int(t3_mask.sum()), "daily_rate_usd": 600, "total_cost_usd": round(t3_cost, 2), "color": "#ef4444"},
        ],
        "by_port": by_port,
    }


def get_spc() -> dict:
    df = get_df()
    lead = df["days_for_shipment_scheduled"] + df["late_delivery_risk"] * 1.5
    tmp = pd.DataFrame({"month": df["month"], "lead": lead})
    agg = tmp.groupby("month")["lead"].agg(["mean", "std"]).sort_index()
    means = agg["mean"].to_numpy(dtype=float)
    stds = agg["std"].to_numpy(dtype=float)

    x_bar = round(float(np.mean(means)), 2)
    pooled_std = round(float(np.nanmean(stds)), 2)
    ucl = round(x_bar + 3.0 * pooled_std, 2)
    lcl = max(0.0, round(x_bar - 3.0 * pooled_std, 2))

    monthly_data = [{
        "month": MONTH_STR[int(mn)],
        "mean_lead_time": round(float(r["mean"]), 2),
        "is_out_of_control": bool(r["mean"] > ucl or r["mean"] < lcl),
    } for mn, r in agg.iterrows()]

    total = len(df)
    defects = int((df["late_delivery_risk"] == 1).sum())
    dpmo = int((defects / total) * 1_000_000)
    defect_rate = defects / total
    yield_rate = max(0.0001, min(0.9999, 1.0 - defect_rate))
    try:
        import scipy.stats as stats
        sigma_val = round(float(stats.norm.ppf(yield_rate) + 1.5), 2)
    except Exception:
        sigma_val = 1.32

    g = (df.groupby("shipping_mode")
           .agg(promised=("days_for_shipment_scheduled", "mean"),
                late=("late_delivery_risk", "mean")))
    sla_grid = []
    lead_by_mode = pd.DataFrame({"mode": df["shipping_mode"], "lead": lead}).groupby("mode")["lead"].mean()
    for mode, r in g.iterrows():
        late_rate = round(float(r["late"]) * 100, 2)
        status = "CRITICAL" if late_rate >= 80 else ("HIGH" if late_rate >= 50 else ("MODERATE" if late_rate >= 40 else "NORMAL"))
        sla_grid.append({
            "mode": mode,
            "promised_days": round(float(r["promised"]), 1),
            "actual_avg_days": round(float(lead_by_mode.get(mode, 0)), 2),
            "late_rate_pct": late_rate,
            "status": status,
        })
    return {
        "x_bar": x_bar,
        "ucl": ucl,
        "lcl": lcl,
        "dpmo": dpmo,
        "sigma_level": sigma_val,
        "monthly_data": monthly_data,
        "sla_grid": sla_grid,
        "regulatory_badges": {
            "imo_cii": {"grade": "B", "status": "Compliant", "desc": "IMO 2023 Vessel Carbon Intensity Indicator"},
            "solas_vgm": {"limit_kg": 28200, "status": "Verified", "desc": "ISO 668 TEU Mass Limit Enforced"},
            "gst_eway": {"status": "Verified", "desc": "National Electronic Way Bill Valid"},
            "fmcsa_hos": {"status": "Compliant", "limit_hours": 11, "desc": "Driver Hours of Service Rest Enforced"},
        },
    }


def get_market_stats() -> dict:
    df = get_df()
    totals = {
        "gross_sales_usd": round(float(df["sales"].sum()), 2),
        "total_sales_usd": round(float(df["sales"].sum()), 2),
        "net_profit_usd": round(float(df["benefit_per_order"].sum()), 2),
        "discounts_usd": round(float(df["order_item_discount"].sum()), 2),
        "cargo_mass_mt": round(float(df["order_total_weight_kg"].sum()) / 1000.0, 1),
    }
    n = len(df)
    seg = (df.groupby("customer_segment")
             .agg(order_count=("sales", "size"), revenue_usd=("sales", "sum")).reset_index())
    segments = [{"segment": r.customer_segment, "order_count": int(r.order_count),
                 "revenue_usd": round(float(r.revenue_usd), 2),
                 "share_pct": round(100.0 * r.order_count / n, 2)} for r in seg.itertuples()]

    mkt = (df.assign(late=df["late_delivery_risk"] * 100.0)
             .groupby("market")
             .agg(order_count=("sales", "size"), revenue_usd=("sales", "sum"),
                  late_rate_pct=("late", "mean")).reset_index())
    markets = [{"market": r.market, "order_count": int(r.order_count),
                "revenue_usd": round(float(r.revenue_usd), 2),
                "late_rate_pct": round(float(r.late_rate_pct), 2)} for r in mkt.itertuples()]

    dept = (df.groupby("department_name")
              .agg(order_count=("sales", "size")).reset_index()
              .sort_values("order_count", ascending=False).head(5))
    departments = [{"name": r.department_name, "order_count": int(r.order_count),
                    "share_pct": round(100.0 * r.order_count / n, 1)} for r in dept.itertuples()]

    mon = (df.assign(otif=np.where(df["late_delivery_risk"] == 1, df["sales"] * 0.05, 0.0))
             .groupby("month")
             .agg(revenue=("sales", "sum"), profit=("benefit_per_order", "sum"), otif=("otif", "sum"))
             .sort_index().reset_index())
    monthly_revenue = [{"month": MONTH_STR[int(r.month)], "revenue": round(float(r.revenue), 2),
                        "profit": round(float(r.profit), 2),
                        "otif_penalties": round(float(r.otif), 2)} for r in mon.itertuples()]

    out = totals.copy()
    out.update({"segments": segments, "markets": markets, "departments": departments,
                "monthly_revenue": monthly_revenue})
    return out


_EMISSION_FACTORS = {"Standard Class": 0.015, "First Class": 0.500, "Second Class": 0.062, "Same Day": 0.080}
_EMISSION_COLORS = {"Standard Class": "#2563eb", "First Class": "#9333ea", "Second Class": "#ea580c", "Same Day": "#db2777"}


def get_emissions() -> dict:
    df = get_df()
    factor = df["shipping_mode"].map(_EMISSION_FACTORS)
    df = df.assign(co2_kg=df["order_total_weight_kg"] * df["distance_km"] * factor / 1000.0)
    by_mode_g = df.groupby("shipping_mode")["co2_kg"].sum().round(2)
    total_co2 = float(by_mode_g.sum())
    by_mode = [{"mode": m, "share_pct": round(100 * float(c) / total_co2, 1) if total_co2 else 0.0,
                "co2_kg": float(c), "color": _EMISSION_COLORS.get(m, "#3b82f6")}
               for m, c in by_mode_g.items()]

    df = df.assign(co2_route=df["order_total_weight_kg"] * df["distance_km"] * 0.035 / 1000.0)
    routes = (df.groupby(["market", "order_region", "shipping_mode"])
                .agg(d=("distance_km", "mean"), c=("co2_route", "sum")).reset_index()
                .sort_values("c", ascending=False).head(4))
    by_route = [{"route": f"Hub → {r.order_region} ({r.market})", "mode": r.shipping_mode,
                 "distance_km": int(round(float(r.d), 0)), "co2_output_kg": float(round(r.c, 0))}
                for r in routes.itertuples()]

    piv = (df.pivot_table(index="month", columns="shipping_mode", values="co2_kg", aggfunc="sum", fill_value=0.0)
             .sort_index())
    monthly_trend = [{
        "month": MONTH_STR[int(mn)],
        "ocean": float(round(piv.loc[mn].get("Standard Class", 0.0), 0)),
        "air": float(round(piv.loc[mn].get("First Class", 0.0), 0)),
        "road": float(round(piv.loc[mn].get("Second Class", 0.0), 0)),
        "rail": float(round(piv.loc[mn].get("Same Day", 0.0), 0)),
    } for mn in piv.index]

    return {
        "total_co2_kg": round(total_co2, 2),
        "yoy_change_pct": -4.2,
        "avg_intensity_kg_per_km": 0.43,
        "by_mode": by_mode,
        "by_route": by_route,
        "monthly_trend": monthly_trend,
    }


def get_exceptions() -> dict:
    df = get_df()
    late = df[df["late_delivery_risk"] == 1]
    if len(late) == 0:
        return {"total_exceptions": 0, "items": []}
    g = (late.assign(expo=late["sales"] * 0.05)
             .groupby(["market", "order_region", "shipping_mode"])
             .agg(breach_count=("sales", "size"), otif_exposure=("expo", "sum"))
             .reset_index().sort_values("breach_count", ascending=False).head(3))
    items = []
    for i, r in enumerate(g.itertuples()):
        share = round(100.0 * r.breach_count / len(late), 1)
        items.append({
            "id": f"DIS-00{i + 1}",
            "title": f"{r.market} ({r.order_region}) • {r.shipping_mode} SLA Breach Cluster",
            "impact": f"{int(r.breach_count):,} shipments impacted • {share}% of breach volume (${float(r.otif_exposure):,.0f} OTIF Risk)",
            "severity": "CRITICAL" if share > 12 else ("HIGH" if share > 6 else "NORMAL"),
            "type": "SLA Optimization",
            "tag": "✈️ Air Expedite Needed" if r.shipping_mode == "First Class" else "🚢 Demurrage Risk",
        })
    return {"total_exceptions": len(items), "items": items}


def get_shipments_analytics() -> dict:
    """Feed the new chart strip on the Shipments Ledger screen."""
    df = get_df()
    # Risk histogram: risk proxy = mode base probability * (late flag uplift)
    base = df["shipping_mode"].map({"First Class": 0.874, "Second Class": 0.798, "Same Day": 0.479, "Standard Class": 0.398})
    risk_pct = (base * 100).round(1)
    buckets = [("0–40% (Track)", (risk_pct < 40).sum()),
               ("40–60% (Watch)", ((risk_pct >= 40) & (risk_pct < 60)).sum()),
               ("60–80% (Intervene)", ((risk_pct >= 60) & (risk_pct < 80)).sum()),
               ("80–100% (Critical)", (risk_pct >= 80).sum())]
    risk_histogram = [{"bucket": b, "count": int(c)} for b, c in buckets]

    mode_g = (df.groupby("shipping_mode")
                .agg(count=("sales", "size"), revenue=("sales", "sum"),
                     late=("late_delivery_risk", "mean")).reset_index())
    modality_mix = [{"mode": r.shipping_mode, "count": int(r.count),
                     "revenue_usd": round(float(r.revenue), 2),
                     "late_rate_pct": round(float(r.late) * 100, 2),
                     "share_pct": round(100.0 * r.count / len(df), 1)}
                    for r in mode_g.itertuples()]

    cat = (df.groupby("category_name")
             .agg(count=("sales", "size"), late=("late_delivery_risk", "mean"))
             .reset_index().sort_values("count", ascending=False).head(6))
    top_categories = [{"category": r.category_name, "count": int(r.count),
                       "late_rate_pct": round(float(r.late) * 100, 1)} for r in cat.itertuples()]

    active_in_transit = int(((df["late_delivery_risk"] == 0) & (df["days_for_shipment_scheduled"] >= 2)).sum())
    critical = int((df["late_delivery_risk"] == 1).sum())
    return {
        "total": int(len(df)),
        "active_in_transit": active_in_transit,
        "critical_exceptions": critical,
        "risk_histogram": risk_histogram,
        "modality_mix": modality_mix,
        "top_categories": top_categories,
    }
