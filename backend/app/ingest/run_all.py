"""Phase-1 bootstrap runner: real-data ingestion + calibration + SOP seed.

Usage (repo root):
    python -m backend.app.ingest.run_all            # full run against DATABASE_URL
Idempotent: each step clears and rebuilds its tables.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

from backend.app.core.db import SessionLocal
from backend.app.ingest import calibration, dataco, geo, sop_seed

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("nexafreight.ingest")

DATA = Path("data/raw")


def main() -> None:
    db = SessionLocal()
    try:
        # Idempotent boot: skip heavy re-ingestion if data already loaded
        # (set FORCE_INGEST=1 to rebuild from scratch).
        import os

        from backend.app.models.entities import Shipment as _Shipment
        if db.query(_Shipment).count() and os.environ.get("FORCE_INGEST", "0") != "1":
            log.info("data already loaded — skipping ingestion (FORCE_INGEST=1 to rebuild)")
            sop_seed.seed(db)
            return
        results: dict = {}
        csv = DATA / "DataCoSupplyChainDataset.csv"
        if csv.exists():
            results["dataco"] = dataco.run(csv, db)
        else:
            log.warning("DataCo CSV missing at %s — skipping (AGENTS.md §3: no substitutes)", csv)
        if (DATA / "UpdatedPub150.csv").exists():
            results["geo"] = geo.run(DATA, db)
        else:
            log.warning("geo sources missing — ports/lanes skipped (no substitutes)")
        results["calibration"] = calibration.run(DATA, db)
        results["sop_rules"] = sop_seed.seed(db)
        from backend.app.ml import eta_model
        results["eta_model"] = eta_model.train(db) or "skipped"
        from backend.app.services import alert_engine
        results["alerts"] = alert_engine.generate_alerts(db)
        log.info("INGEST COMPLETE:\n%s", json.dumps(results, indent=2, default=str))
    finally:
        db.close()


if __name__ == "__main__":
    main()
