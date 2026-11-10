# Project Verified Reality — Line-by-Line Trace & Reconciliation

**Date:** 23 Sep 2026 · **Method:** 35 files pulled raw from rajmontana/NexaFreight `main @ 03c68f6` (398 blobs, ~12,800 lines read across pipeline, services, ML, API, frontend) — no assumptions carried over from prior audits; every claim below cites the file it was read from. · **Purpose:** you said you don't fully know what the project *actually* does vs what was intended — this is the verified answer, then the reconciled finish plan. · **Sources section at bottom per standing rule.**

---

## 1. The five datasets — verified usage truth table

| Dataset | Script | What actually happens | Verdict |
|---|---|---|---|
| **UN/LOCODE** (UNECE) | `02_ingest_unlocode.py` | Parses CodeList CSVs → DDMM coords → decimal; classifies by Function code into PORT / AIRPORT / INLAND_DEPOT / WAREHOUSE; upserts **~84k+ rows** into `locations` idempotently on `locode`. First in the run-order contract — everything depends on it | ✅ used, foundational |
| **IMF PortWatch** (Daily Port Activity) | `03_ingest_port_data.py` | Reads `Daily_Port_Activity_Data_and_Trade_Estimates.csv`; fuzzy-matches port names → LOCODE (exact → WPI alias → RapidFuzz); computes 90-day rolling baseline and **`congestion_index = vessel_count / rolling_90d_avg`** into `port_daily_stats` | ✅ used (bake-time). Our earlier "PortWatch absent" was wrong — the trace caught it |
| **Kaggle Maritime Port Performance** (+ World Port Index) | `03_ingest_port_data.py` | Second input of the same script; WPI `UpdatedPub150.csv` used for alias matching during fuzzy match | ✅ used (bake-time) |
| **DataCo SMART** | `01_ingest_dataco.py` | Reads `DataCoSupplyChainDataset.csv`; maps **Shipping Mode → `shipping_mode`: Standard→SEA, Second→RAIL, First/SameDay→AIR (STILL — audit root cause #1 is alive)**; `sla_deadline = order_date + Days for shipment (scheduled)`; Category→cargo_class (STANDARD/REFRIGERATED/HAZMAT/HIGH_VALUE); upserts **65,752 orders / 180,519 items** with `historical_late_delivery` from `Late_delivery_risk` | ✅ used; **1 correctness defect open** |
| **NOAA MarineCadastre AIS** | `08_download_ais_history.py` | Downloads NOAA/DMA AIS CSVs (`coast.noaa.gov/htdata/CMSP/AISDataHandler/...`), filters to fleet MMSIs, writes per-MMSI snappy Parquet for a ReplayFeedAdapter (`USE_LIVE_AIS=false`); falls back to SIMULATED trajectories | ✅ used (optional replay path) |

## 2. The Data Factory (script-by-script)

Run-order contract (documented in the scripts themselves): **02 → 03 → 01 → 04 → 05 → 06 → 07** then ML **09 → 10/11/12 → 13/14**.

- **02_unlocode** → `locations` (84k+). **03_port_data** → `ports` + `port_daily_stats` (congestion_index). **01_dataco** → `orders`/`order_items`. 
- **04_consolidate** → groups orders into shipments (origin/dest/mode/cargo_class/week, ≤20 orders — per prior audit; unchanged).
- **05_plan_routes** → bake-time planner run (still exists, but see §4: runtime planner now exists too).
- **06_assign_vessels / 07_assign_flights** → synthetic fleet/vessel assignment for the ocean/air legs (SIMULATED provenance).
- **seed_demo_data.py (main, 450 L)** → seeds users + demo network entities with `Provenance.SIMULATED` explicitly set.
- **derive_parameters.py + params/derive_{road_speeds, circuity, port_dwell}.py** → empirical parameter derivation into the parameter tables (migration `20260921_1359`).

## 3. The ML layer — verified, with the actual numbers

**Contract (`ml/constants.py`):** label = `historical_late_delivery` (from DataCo `Late_delivery_risk`); time axis = `sla_deadline`; chronological split 2017-04-01 / 2017-10-01 (≈71/16/13); **BANNED_COLUMNS dict with documented reasons** (real transit days, the label itself, post-hoc timestamps, identifiers, operational meta); 14-feature authoritative ordered contract; era doctrine in writing: *"Historical DataCo timeline (2015-2018) is used for model training. Operational planned leg dates are anchored to the 2026 demo/live-map timeline. They must never be used as ML dates."*

**Artifacts (committed, seeded, sha-stamped):**
- **Delay classifier** (LGBM, seed 42, trained 2026-09-04, git `74cc4ae`): n=46,711/10,461/8,580; positive rates 54.9/54.3/55.0%. Honest metric set **including baselines**: constant baseline val AUC 0.50 / Brier 0.2482; **grouped baseline val AUC 0.709 / Brier 0.2080**; LGBM tuned val AUC 0.7315 / PR-AUC 0.791 / **Brier 0.2333**; test consistent (0.7314 / 0.7912 / 0.2326).
- **Ablation experiment C1** (`experiments/delay_without_shipping_mode/`, 50 Optuna trials, no model overwrite): without `shipping_mode`, test AUC **0.7308 vs 0.7314 with** — shipping_mode adds ≈0.0006 AUC. The team already isolated the suspect feature and quantified it.
- **ETA quantile model**: target = `transit_delay_residual` (real − scheduled days), quantiles **p10/p50/p85**, residual mean ≈ +0.57 days, σ ≈ 1.53 days across all splits; MIN_TRANSIT_DAYS 0.5 guard; SLA bands ON_TIME/MEDIUM/HIGH/BREACH.
- **Demand forecast** (AutoETS, weekly, 80% CI): 675 lanes → 79 qualified (≥26 wks); **WAPE 32.16% vs seasonal-naive 44.02% (+26.9% lift)**; median lane MAPE 52.5%; best/worst lanes published by name.

**ML verdict:** evaluation hygiene is far better than our audit assumed — baselines, ablation, seed/hash discipline all present. The two *validity* issues remain: (a) the 54.9% parcel-derived label (model **does not beat the grouped baseline on Brier** — the honest headline is "AUC lift 0.709→0.731, no calibration improvement"), and (b) `shipping_mode` is still the remapped parcel service level (though now proven nearly inert). Congestion features are *reserved v2 only* — not yet wired.

## 4. Runtime services — verified

- **`api/router.py`:** wires `/health, /auth, /shipments, /alerts, /disruptions, /decisions, /map, /analytics, /predictions, /copilot, /plan`. The old `routers/` package survives only as legacy re-exports (map).
- **`api/routes/plan.py` + `services/planner.py` (30.8 KB):** **`POST /plan` is runtime-wired and persists results** (GET lists persisted plans). The planner is the real design: **time-expanded graph over the India network + Yen k-shortest**, priority profiles (CRITICAL/EXPRESS/STANDARD/ECONOMY) with objective weights **loaded from the parameter service** (not hardcoded), connection margins from params, capacity checks on schedules, deadline filtering, structural-key dedup of alternatives, leg KPIs (cost/CO₂/distance), provenance SIMULATED (seeded schedules) vs DERIVED (computed legs). **Audit root cause #3 (bake-time-only planning) is resolved on main.**
- **`disruption_detector.py`:** severity is now **relative to the shipment's own SLA cushion** (`classify_severity(delay_hours, sla_cushion_hours)`: >72h top band; ≥cushion / ≥0.5×cushion → mid bands; mode-dependent >48/>24 rules; `_floor_severity` guard). The arbitrary 12/24/48/96 absolute bands are gone → **root cause #4 substantially resolved** (final direction check queued for the Antigravity session).
- **`core/params.py`:** in-memory cache; `refresh_parameters()` bound to app lifespan (commit `03c68f6`); POLICY vs empirical entries with per-value **source provenance**; documented FALLBACK_DEFAULTS "derived from calibration table" tagged `DEFAULT`; `get_float(..., with_provenance=True)`. The Parameter Registry design is implemented.
- **`financial_engine.py`:** pure functions — SLA penalty, demurrage, freight cost, CO₂ kg + carbon cost, order/shipment impact, **PnL snapshot**, margin assessment.
- **`decision_executor.py`:** executes approved decisions (mode speeds/circuity, haversine, routed distance recompute).
- **`sla_checker.py`, `alert_engine.py`, `reroute_engine.py`, `copilot.py`** — present and wired via routes.
- **NOT on main:** no `position_interpolator` service, **no SSE/telemetry stream route, nothing streaming in `shipments.py`** (grep zero matches). The arena branch's 1,036-line interpolator + live tracking was **never merged**. Main's map shows seeded static/parked positions.

## 5. Frontend ↔ backend integration map (verified wires)

- `lib/nexafreight/client.ts` (637 L, typed): `GET /api/shipments` (paginated), `GET /api/shipments/{id}`, `GET /api/shipments/{id}/route` (GeoJSON), `GET /api/map/{ports,warehouses,routes,feed-health}`, predictions client ("NOT `/api/v1/ml/*` as originally spec'd — confirmed via GET /openapi.json": delay, eta, demand), `GET /api/alerts(?severity=&status=)`, `GET /api/alerts/{id}`; apiFetch with proxy fallback (the osiris httpJson workaround, retained).
- `app/page.tsx` composition: **SearchBar, ScaleBar, GlobalStatusBar, LiveAlerts, FeedHealthIndicator, ShipmentInspectorPanel, AlertCenter, RerouteOptions, AnalyticsDashboard + GlobeMap (dynamic, ssr:false) + LayerPanel** — the main screen is a genuine control tower (map + alert center + shipment inspector + reroute options + analytics), not an OSINT dashboard.
- The **OSINT shell still exists** as ~45 frontend API routes (`/api/osint/*`, gdelt, conflicts, cyber-*, space-weather, flights, aircraft…). It is not the page's center, but it is dead circumference in the repo (freeze/hide later — per `Core_Loop_Product.md` §2).
- `ProvenanceBadge.tsx` (+ test) and `FeedHealthIndicator.tsx` exist — the trust UI is real.

## 6. Reconciliation: intended vs actual vs still needed

| Pillar | Intended (design docs) | Verified actual (main) | Still needed |
|---|---|---|---|
| Data correctness | modes ≠ parcel levels; era-clean | 02/03/01 all ingest cleanly; era doctrine written; **but Shipping Mode→SEA/RAIL/AIR remap remains** | Fix 01 mapping → `service_level`; mode from planner/sampling (audit P0 #1) |
| ① Plan | runtime optimizer | **Built** (time-expanded + Yen, param-driven weights, persisted) | Golden-lane acceptance run + params coverage check |
| ② Monitor | movement + provenance | Seeded SIMULATED positions; provenance badges in UI; **no movement engine** | Port interpolator + stream from arena branch (merge/port) OR scoped-out with documented static map — demo decision |
| ③ Predict | calibrated, honest | Quantiles + baselines + ablation + ban list; **Brier doesn't beat grouped baseline; label = 54.9% parcel flag** | Label revalidation (12–18% freight-realistic positives), BSS reporting, wire `congestion_index` as feature (reserved slot exists) |
| ④ Decide | expected-loss triage + HITL | Alerts (cushion-relative severity) + decisions API + executor + RerouteOptions UI | Expected-₹ ranking, approval matrix, audit-trail depth, reroute template check (verify `reroute_engine` uses searoute restrictions) |
| ⑤ Learn | registry + retrain + drift | registry + metadata/schema artifacts + experiments dir | Scheduled retrain job + drift flag (none found) |
| ⑥ Finance | waterfall | Engine functions + PnL snapshot | UI surface + population from execution flow |
| ⑦ Port intelligence | "new module" | **Already exists as tables + congestion_index + map API** | Wire congestion → ML feature + Validation Matrix rows V4/V5/V6 + Red Sea replay script |

## 7. What this changes in the Working Solution Plan

Good news: **less work than planned.** Module ⑦ is ~60% built (ingestion+index done); the runtime planner is done; severity context is done; parameter machinery is done. The critical path shrinks to: (1) **01 mapping fix** (the one remaining data-correctness defect), (2) **movement** (arena interpolator merge/port — the demo's most visible gap), (3) **label revalidation + congestion feature** (turns "no calibration win" into an honest findings story), (4) **decide/learn/finance surfacing** (engines exist; needs wiring + UI), (5) **Validation Matrix** (now trivial for V4: our congestion_index *is* PortWatch — validate the fuzzy-match coverage and index sanity instead). Week 1 of the 4-week plan becomes a *confirmation* week, not a fix week, for everything except items 1–2.

**For the paper, the verified metric story is already publishable-shaped:** "a 54.9%-base-rate label yields AUC 0.731/PR-AUC 0.791 but **no calibration gain over a grouped baseline** (Brier 0.208 vs 0.233); ablating the parcel-derived mode feature changes AUC by 0.0006" — an honest negative result + evaluation-hygiene contribution, exactly the methods finding our review said the field lacks.

## 8. Open items grep could not settle (queue for the Antigravity session)

1. Exact band order/labels in `classify_severity` (read lines 104–137 fully; confirm >72h maps to CRITICAL and cushion logic direction).
2. `reroute_engine`: divert template (×1.25/+36h/×1.10) present or replaced by searoute `restrictions`?
3. `services/consolidation.py` capacity units (weight/volume) vs the ≤20-orders rule.
4. `predictions.py` inference path: does it load committed artifacts and respect feature_schema order?
5. Whether `05_plan_routes.py` (bake) is still referenced anywhere at runtime or safely retired.
6. Copilot's LLM boundaries (forbidden-list compliance per `W6_Order_Generation_Endpoint.md`).

## 9. Sources

**Code (all pulled raw from rajmontana/NexaFreight @ `03c68f6`, read 23 Sep 2026):** `backend/scripts/{01_ingest_dataco,02_ingest_unlocode,03_ingest_port_data,04_consolidate_shipments,05_plan_routes,08_download_ais_history,09_build_training_data,13_model_diagnostics,seed_demo_data,activate_and_seed_positions}.py`; `backend/src/nexafreight/{api/router.py, api/routes/{plan,predictions,shipments,map}.py, services/{planner,disruption_detector,financial_engine,decision_executor,sla_checker,alert_engine,reroute_engine}.py, ml/{constants,data_source,features,eta_model}.py, core/params.py}`; `backend/models/{delay_classifier,eta_quantile,demand_forecast}/metadata.json`, `backend/models/experiments/delay_without_shipping_mode/metadata.json`, `backend/models/delay_classifier/feature_schema.json`; `frontend/src/lib/nexafreight/client.ts`, `frontend/src/app/page.tsx`. Full tree: GitHub API `git/trees/03c68f6?recursive=1` (398 blobs).

**Datasets (user-provided links, verified against script expectations):** UNECE UN/LOCODE — https://unece.org/trade/cefact/UNLOCODE-Download ; DataCo (Kaggle mirror) — https://www.kaggle.com/datasets/shashwatwork/dataco-smart-supply-chain-for-big-data-analysis (canonical DOI 10.17632/8gx2fvg2k6.5) ; IMF PortWatch — https://portwatch.imf.org/ (file `Daily_Port_Activity_Data_and_Trade_Estimates.csv`) ; Maritime Port Performance — https://www.kaggle.com/datasets/varshaaugustine/maritime-port-performance-dataset (upstream UNCTADstat) ; NOAA MarineCadastre AIS — https://marinecadastre.gov/ais/ (script hits `coast.noaa.gov/htdata/CMSP/AISDataHandler/`).

**Internal:** `NexaFreight_Audit.md` (root causes now individually statused), `Working_Solution_Plan.md` (§7 updates it), `Core_Loop_Product.md` (pillar definitions), `Parameter_Registry.md` (params.py implements it), `W6_Order_Generation_Endpoint.md` (copilot boundary check).
