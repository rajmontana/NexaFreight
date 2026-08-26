# data/raw/ — source datasets (git-ignored)

Place the original source files here. They are **never committed** to git
(AGENTS.md §2.3). Committed derivatives (small aggregates) live in
`data/processed/`, produced by `backend/app/ingest/` pipelines with documented
provenance.

## Expected files (Phase 1)

| File | Source | Provenance label | Role |
|---|---|---|---|
| `DataCoSupplyChainDataset.csv` | Kaggle / Mendeley (CC BY 4.0) | REAL | 180K order lines — order & demand backbone |
| `Daily_Port_Activity_Data_and_Trade_Estimates.csv` | Kaggle (IMF PortWatch) | REAL | chokepoint transit/trade volumes, disruption signatures |
| `Maritime_Port_Performance.csv` | UNCTAD port performance indicators | REAL | median time-in-port dwell priors by country × vessel type |
| `Port-disruption-database.xlsx` | Verschuur et al. (TR-D paper) | REAL | disruption duration/severity calibration |

Owner: git-push from your machine → `git checkout main -- data/raw/` is NOT needed;
just copy the files here and commit nothing (folder is ignored except this README).
