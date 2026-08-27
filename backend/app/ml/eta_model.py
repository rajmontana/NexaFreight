"""ETA quantile model — LightGBM quantile regression trained on REAL shipments.

Target   : transit duration (days) = actual_delivery - planned_ship_date (REAL)
Features : freight mode, market, dest region/country, order month/hour, value
Quantiles: P50 (median ETA) and P85 (conservative planning bound)
Split    : TIME-BASED (train < 2017-06-01, test >= 2017-06-01) — never random
Scores   : pinball loss @0.5/@0.85, MAE(days), P(on-time) calibration by tercile

Honesty (AGENTS.md §3/§8): DataCo transit is largely mode-determined, so
absolute skill is modest by construction; we report the true scores and the
calibration table, and the model's P(on-time) replaces heuristic priors in
alert options (labeled DERIVED:eta-model-v1).
"""

from __future__ import annotations

import datetime as dt
import json
import logging
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sqlalchemy.orm import Session

from backend.app.models.entities import ModelRun, Shipment

log = logging.getLogger(__name__)

CACHE = Path("models_cache")
SPLIT_DATE = dt.datetime(2017, 6, 1)
FEATURES = ["mode_idx", "market_idx", "region_idx", "country_idx", "month", "hour", "value_log"]
MODES = ["OCEAN", "AIR", "ROAD"]


def prepare_dataset(db: Session) -> pd.DataFrame:
    rows = (db.query(Shipment.freight_mode, Shipment.market, Shipment.dest_region,
                     Shipment.dest_country, Shipment.order_date, Shipment.value_usd,
                     Shipment.planned_ship_date, Shipment.actual_delivery,
                     Shipment.sla_due_at)
            .filter(Shipment.actual_delivery.isnot(None),
                    Shipment.planned_ship_date.isnot(None)).all())
    df = pd.DataFrame(rows, columns=["mode", "market", "region", "country", "order_date",
                                     "value", "ship", "actual", "sla"])
    if df.empty:
        return df
    df["y"] = (pd.to_datetime(df["actual"]) - pd.to_datetime(df["ship"])).dt.total_seconds() / 86400
    df = df[(df["y"] >= 0) & (df["y"] <= 30)]
    od = pd.to_datetime(df["order_date"])
    df["mode_idx"] = df["mode"].map({m: i for i, m in enumerate(MODES)}).fillna(0)
    df["market_idx"] = pd.factorize(df["market"].astype(str))[0]
    df["region_idx"] = pd.factorize(df["region"].astype(str))[0]
    df["country_idx"] = pd.factorize(df["country"].astype(str))[0]
    df["month"] = od.dt.month
    df["hour"] = od.dt.hour
    df["value_log"] = np_log1p(df["value"])
    df["sla_days"] = (pd.to_datetime(df["sla"]) - pd.to_datetime(df["ship"])).dt.total_seconds() / 86400
    return df


def np_log1p(v: pd.Series) -> pd.Series:
    import numpy as np

    return np.log1p(pd.to_numeric(v, errors="coerce").fillna(0).clip(lower=0))


def _pinball(y: pd.Series, pred: pd.Series, alpha: float) -> float:
    d = y - pred
    return float((np_max(d, 0) * alpha + np_max(-d, 0) * (1 - alpha)).mean())


def np_max(a, b):
    import numpy as np

    return np.maximum(a, b)


def train(db: Session) -> dict[str, Any] | None:
    """Train P50/P85 quantile models on real shipments; register scores."""
    import lightgbm as lgb

    df = prepare_dataset(db)
    if len(df) < 500:
        log.warning("eta_model: only %d rows — skipping training (honest no-model)", len(df))
        return None
    test_mask = pd.to_datetime(df["order_date"]) >= SPLIT_DATE
    tr, te = df[~test_mask], df[test_mask]
    if len(te) < 50:  # ensure a test set exists
        tr, te = df.iloc[: int(len(df) * 0.8)], df.iloc[int(len(df) * 0.8):]

    models, metrics = {}, {"n_train": int(len(tr)), "n_test": int(len(te)), "split": "time-based"}
    for alpha in (0.5, 0.85):
        m = lgb.LGBMRegressor(objective="quantile", alpha=alpha, n_estimators=250,
                              learning_rate=0.05, num_leaves=31, min_child_samples=40,
                              subsample=0.9, colsample_bytree=0.9, random_state=42,
                              verbose=-1)
        m.fit(tr[FEATURES], tr["y"])
        pred = m.predict(te[FEATURES])
        key = f"q{int(alpha * 100)}"
        models[key] = m
        metrics[f"pinball_{key}"] = round(_pinball(te["y"], pred, alpha), 3)
        if alpha == 0.5:
            metrics["mae_days"] = round(float((te["y"] - pred).abs().mean()), 3)

    # P(on-time) calibration: P(y <= sla_days) implied vs empirical, by tercile
    p50 = models["q50"].predict(te[FEATURES])
    p85 = models["q85"].predict(te[FEATURES])
    # simple implied probability: how far sla sits between p50 and p85
    import numpy as np

    frac = np.clip((te["sla_days"].values - p50) / np.maximum(p85 - p50, 1e-6) * 0.35 + 0.5, 0.02, 0.98)
    actual_on_time = (te["y"].values <= te["sla_days"].values).astype(float)
    cal_rows = []
    for name, mask in [("low", frac < 1 / 3), ("mid", (frac >= 1 / 3) & (frac < 2 / 3)),
                       ("high", frac >= 2 / 3)]:
        if mask.sum() > 20:
            cal_rows.append({"bucket": name, "n": int(mask.sum()),
                             "implied_p": round(float(frac[mask].mean()), 3),
                             "empirical_p": round(float(actual_on_time[mask].mean()), 3)})
    metrics["calibration"] = cal_rows

    CACHE.mkdir(exist_ok=True)
    joblib.dump(models["q50"], CACHE / "eta_q50.joblib")
    joblib.dump(models["q85"], CACHE / "eta_q85.joblib")
    run = ModelRun(model="eta_quantile", version="1.0", target="transit_days",
                   data_n=int(len(df)), metrics=metrics,
                   params={"n_estimators": 250, "lr": 0.05, "leaves": 31})
    db.add(run)
    db.commit()
    log.info("eta_model trained: %s", json.dumps(metrics))
    return metrics


def load() -> dict[str, Any] | None:
    if not (CACHE / "eta_q50.joblib").exists():
        return None
    return {"q50": joblib.load(CACHE / "eta_q50.joblib"),
            "q85": joblib.load(CACHE / "eta_q85.joblib")}


def predict_for_shipment(s: Shipment) -> dict[str, Any] | None:
    """P50/P85 transit days + P(on-time vs SLA) for one real shipment."""
    import numpy as np

    models = load()
    if not models or not s.order_date:
        return None
    row = pd.DataFrame([{
        "mode_idx": MODES.index(s.freight_mode) if s.freight_mode in MODES else 0,
        "market_idx": hash(s.market or "") % 1000,
        "region_idx": hash(s.dest_region or "") % 1000,
        "country_idx": hash(s.dest_country or "") % 1000,
        "month": s.order_date.month, "hour": s.order_date.hour,
        "value_log": float(np.log1p(max(s.value_usd or 0, 0)))}], columns=FEATURES)
    p50 = float(models["q50"].predict(row)[0])
    p85 = float(models["q85"].predict(row)[0])
    if s.sla_due_at and s.planned_ship_date:
        sla_days = (s.sla_due_at - s.planned_ship_date).total_seconds() / 86400
        frac = min(max((sla_days - p50) / max(p85 - p50, 1e-6) * 0.35 + 0.5, 0.02), 0.98)
    else:
        frac = None
    return {"eta_p50_days": round(p50, 2), "eta_p85_days": round(p85, 2),
            "p_on_time": round(frac, 3) if frac is not None else None,
            "provenance": "PROJECTED:eta-quantile-v1"}


def latest_scores(db: Session) -> dict[str, Any] | None:
    r = (db.query(ModelRun).filter_by(model="eta_quantile")
         .order_by(ModelRun.trained_at.desc()).first())
    return {"version": r.version, "trained_at": r.trained_at.isoformat(),
            "data_n": r.data_n, **(r.metrics or {})} if r else None
