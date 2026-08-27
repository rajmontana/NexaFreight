"""Weekly demand forecast — seasonal-index model with HONEST backtest.

Series : REAL weekly order counts from the 65,752 shipments (2015–2017)
Model  : trend (centered 52w MA) x multiplicative seasonal indices (52w)
Backtest: last 26 weeks; baseline = seasonal-naive (52-week lag)
Scores : MAE, MASE (model MAE / seasonal-naive MAE — <1 means real skill)
Registered in model_runs. If seasonal-naive wins, we SAY SO (AGENTS.md §8).
"""

from __future__ import annotations

import json
import logging

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session

from backend.app.models.entities import ModelRun, Shipment

log = logging.getLogger(__name__)


def weekly_series(db: Session) -> pd.Series:
    rows = db.query(Shipment.order_date).filter(Shipment.order_date.isnot(None)).all()
    if len(rows) < 104:
        return pd.Series(dtype=float)
    s = pd.Series(pd.to_datetime([r[0] for r in rows])).dt.to_period("W-SUN").astype(str)
    return s.value_counts().sort_index()


def _fit_indices(y: pd.Series, period: int = 52) -> tuple[float, pd.Series]:
    trend = y.rolling(period, center=True, min_periods=period // 2).mean()
    detrended = y / trend.replace(0, np.nan)
    idx = detrended.groupby(detrended.index % period).mean()
    idx = (idx / idx.mean()).fillna(1.0)          # normalize indices to mean 1
    base = float(trend.dropna().tail(13).mean())  # recent annual-average level
    return base, idx


def _forecast(y: pd.Series, horizon: int, period: int = 52) -> list[float]:
    base, idx = _fit_indices(y, period)
    out = []
    for h in range(1, horizon + 1):
        pos = (len(y) + h - 1) % period
        out.append(round(base * float(idx.iloc[pos % len(idx)]), 1))
    return out


def train(db: Session) -> dict | None:
    """Backtest on the last 26 weeks vs seasonal-naive; register scores."""
    y = weekly_series(db)
    if len(y) < 104:
        log.warning("demand_forecast: %d weeks only — skipping (honest)", len(y))
        return None
    y.index = pd.RangeIndex(len(y))
    h, period = 26, 52
    train, test = y.iloc[:-h], y.iloc[-h:]
    pred = np.array(_forecast(train, h, period), dtype=float)
    actual = test.values.astype(float)
    snaive = y.iloc[len(y) - h - period: len(y) - period].values.astype(float)
    mae_m = float(np.abs(pred - actual).mean())
    mae_sn = float(np.abs(snaive - actual).mean())
    metrics = {"weeks_total": int(len(y)), "backtest_weeks": h,
               "mae_model": round(mae_m, 1), "mae_seasonal_naive": round(mae_sn, 1),
               "mase": round(mae_m / max(mae_sn, 1e-6), 3),
               "verdict": "model beats seasonal-naive" if mae_m < mae_sn
                          else "seasonal-naive wins — reported honestly"}
    horizon12 = _forecast(y, 12, period)
    db.add(ModelRun(model="demand_forecast", version="1.0", target="weekly_orders",
                    data_n=int(y.sum()), metrics=metrics,
                    params={"method": "trend x seasonal-indices", "period_weeks": period,
                            "horizon": 12}))
    db.commit()
    log.info("demand_forecast: %s", json.dumps(metrics))
    return {**metrics, "horizon_12wk": horizon12,
            "recent_8wk": [round(float(v), 1) for v in y.tail(8).tolist()],
            "provenance": "PROJECTED:seasonal-v1 (REAL order history)"}
