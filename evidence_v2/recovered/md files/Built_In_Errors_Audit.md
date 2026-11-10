# Built-In Errors Audit — Every Finding Behind "Unreal Outputs"

**Date:** 23 Sep 2026 · **Method:** full read of every output-producing file in <author-handle>/NexaFreight `main @ 03c68f6` (services, ML serving, API routes, pipeline scripts, seed, analytics, frontend client) + sandbox *execution* of suspect paths (not just reading — the two worst bugs were proven by running code). Supersedes the speculative parts of `NexaFreight_Audit.md`; items proven fixed are explicitly cleared. **Sources at bottom.**

---

## P0 — Critical: outputs that are silently not what they claim to be

### E1. The ML-based SLA sweep never actually runs (silent NameError → planned-ETA fallback)
**Where:** `backend/src/nexafreight/services/sla_checker.py:116` — `LegStatus.COMPLETED` is referenced but `LegStatus` is **not in the imports** (line 27 imports only `AlertStatus, OrderSlaStatus, ShipmentStatus`).
**Effect:** every call to `_predicted_p85()` raises `NameError`, which the function's own broad `except Exception` (line ~151) swallows with a warning log and returns `base_eta` (planned arrival). Consequence: `check_all_in_transit()` — the "continuous ML rescore" — **always writes SLA statuses derived from planned arrivals/alert ETAs, never from the trained model.** The dashboard's ON_TIME/AT_RISK/LATE board is a plan-vs-deadline computation wearing an ML label. *Proven by code trace; a one-line fix (`LegStatus` import) activates the model path — but see E2/E4 before celebrating.*

### E2. The ETA model was trained without SEA — the majority mode — and inference can't say so
**Where:** `backend/models/eta_quantile/model.joblib` → `category_levels["shipping_mode"] = ["AIR","RAIL"]` (verified by loading the artifact in this sandbox). SEA is **59.7% of ETA training rows** (verified against the real DataCo CSV) and ~59.8% of test rows.
**Mechanism:** `eta_model._encode_single/_encode_frame` map unseen levels to `MISSING_SENTINEL` — but `__MISSING__` was never a training category either, so LightGBM receives NaN and routes those rows down default branches learned *only from AIR/RAIL patterns*. For the modal Indian ocean lane (SEA), **every served ETA p10/p50/p85 is structurally wrong**, not merely noisy. Training-side bug: `11_train_eta_model.py` dropped/de-fact-excluded SEA when building `category_levels` (likely an align-on-non-null-mode artifact).

### E3. The financial scorecard aggregates five years of 2015–2018 parcel history into "today's" windows
**Where:** `backend/src/nexafreight/api/routes/analytics.py:186-190` (`select(Shipment)` — no era, date, or world filter) + the cumulative-window design (`deadline ≤ now + 1d/7d/30d`, documented at lines 6-11).
**Effect:** the `orders` table holds 65,752 DataCo orders (deadlines 2015–2018, global lanes, DataCo dollars) *and* the 2026 demo fleet. Since 2015 deadlines trivially satisfy `deadline ≤ now+1d`, **every historical shipment sits inside the "day" window forever.** The P&L scorecard, SLA board, and summary KPIs mix eras, geographies, and currencies — the exact era-leak our audit predicted, now confirmed at query level.

### E4. Two different demurrage models disagree inside the same product
**Where:** `alert_engine.estimate_demurrage` (used by reroute scoring) bills with `free_days=4` (`DEMURRAGE_FREE_DAYS`); `analytics._pending_exposure` bills with `free_days=0` (hardcoded at line ~179).
**Effect:** the same delay shows **different demurrage exposure** on the reroute options screen vs the financial scorecard. Undecidable "which number is real" — a direct unreal-output generator.

## P1 — Systematic: wrong values that flow everywhere

### E5. Shipping-Mode → transport-mode remap (still alive; now with measured impact)
**Where:** `backend/scripts/01_ingest_dataco.py` (`map_shipping_mode`: Standard→SEA, Second→RAIL, First/SameDay→AIR).
**Measured effect (this sandbox):** `shipping_mode` carries **87.4% of the delay classifier's gain**; ablating it changes AUC by 0.0006 (`models/experiments/…` metadata). So the label "mode" on every shipment, map layer, consolidation key, and finance row is a *parcel service level*, while the model itself barely uses it. Fix (service_level field + planner-derived mode) is unchanged from the audit, urgency unchanged.

### E6. Label = parcel `Late_delivery_risk` → 54.8% base rate, no calibration gain
**Where:** `01_ingest` (`historical_late_delivery = Late_delivery_risk`), `ml/constants.py` (`LABEL_COLUMN`), committed metadata (positive rates 54.9/54.3/55.0%).
**Measured effect (this sandbox):** tuned GBM Brier **0.2326 vs grouped baseline 0.2071** on test — the production model is *less calibrated than a 3-level lookup*. All delay probabilities are unverifiable as probabilities. Honest paths: (a) relabel to freight-realistic definition (real>scheduled) with revalidation, or (b) present as conditional-lookup with the baseline comparison published (it currently is not published in the UI).

### E7. Road-speed calibration contradicts Indian government measurements
**Where:** `docs/parameters.md` (`road.speed.national_highway 55`, `road.speed.expressway 75`, `default 65`) vs `core/params.py` FALLBACK_DEFAULTS (`55/70/55`).
**External evidence:** 2026 government study — trucks average **37–38 km/h on highways, 47–48 on expressways** (US/China 65–70); TERI 30–40 km/h; TCI–IIM ~20 km/h incl. stoppages.
**Effect:** every road leg ETA in the planner/bake world is optimistic by ~1.4–1.8×. Plus the doc↔fallback inconsistency means dev/prod can run different values. Root cause of derivation: `route_km / engine_duration + halt` excludes warehouse/loading dwell, which dominates Indian trucking.

### E8. Uniform 2× p90 dwell multiplier — a placeholder pretending to be a distribution
**Where:** `docs/parameters.md` — `port.dwell.p90_ext.* = exactly 2.0 × p50` for all 11 ports.
**Effect:** disruption delay formula (`min(ratio−1,3)×p50 + p90_ext if ratio>2.5` in `disruption_detector.estimate_delay_hours`) inherits a fake tail: Kolkata's real tail/median ratio ≠ Singapore's. Fix: derive per-port p90 from the PortWatch CSV (already ingested by script 03) or CPPI call-level data.

### E9. Air freight rate ~2× the published national anchor
**Where:** `financial_engine.py` `FREIGHT_RATE_PER_T_KM["AIR"] = 1.8` (≈₹150/tkm) vs DPIIT–NCAER ≈₹72/tkm.
**Effect:** every MODAL_SHIFT option's cost delta is inflated ~2× — the reroute recommender systematically under-recommends air. (Sea/road/rail rates: ⚠️ 1.2–1.6× high but order-correct; sea EF 6.5 g/tkm is below GLEC's 7.6–9.1 for the vessel classes actually modeled.)

### E10. Inference-time feature semantics drift from training semantics
**Where:** `sla_checker.py:132-146` builds features with: `product_price = first item unit_price **else order.revenue**` (training used item price — thousands-scale vs tens-scale); `order_profit = revenue − shipping_cost` (training used DataCo's actual profit column, a different distribution incl. negatives); `order_country/customer_country = country codes` ("IN","US") **while training categories are Spanish localized names** ("India", "EE. UU." — verified from the artifact's `category_levels`) → every served country feature becomes MISSING; `scheduled_days = full SLA window` (fine for ingested orders only).
**Measured effect:** country features ≈0.2% gain (sandbox: 0.5079 vs 0.5072 — negligible *today*), price/profit higher-gain numeric features carry scale-shifted values. The pattern — silent train/serve skew — is the finding; individual deltas currently small.

### E11. Demo world ≠ the India story
**Where:** `seed_demo_data.py` seeds live shipments on **CNSHA/DEHAM/SGSIN/JPTYO** lanes with a handful of locations and one hand-seeded alert.
**Effect:** the live map demos global-lane toy shipments while the calibration, ports, and paper narrative are India. Not "wrong" for a sandbox, but the visible demo contradicts the claimed scope — reviewers will catch it. (The arena branch's richer India world + movement engine was never merged — see P2/E15.)

## P2 — Hygiene & latent (fix in passing, lower urgency)

- **E12. `05_plan_routes.py` bake templates vs runtime planner:** historical DataCo shipments get template leg chains (road→handling→sea→handling→road), not optimizer plans. Fine if labeled SIMULATED/TEMPLATE; currently the two planning systems coexist without a provenance distinction at the analytics layer.
- **E13. Consolidation capacity-blind:** `consolidation.py` chunks ≤20 orders/group; `container_count = ceil(len/20)` — no weight/volume in the key or the container math (P2 of old audit, confirmed at lines 55-98).
- **E14. Hardcoded weight constant:** `decision_executor.py` `weight_t = max(1, container_count) * 14.0` — bypasses the parameter registry this same commit introduced; reroute_engine uses `TONNES_PER_CONTAINER` from disruption_detector (duplicate constant, dual maintenance).
- **E15. No movement engine on main:** no interpolator, no SSE/telemetry route; `shipments.py` has no streaming (grep-verified). Positions are seeded snapshots. The map animates nothing. (Arena branch @ `bacc582` has the 1,036-line interpolator — port it.)
- **E16. `forecasts.json` grid skew:** history rows Monday-stamped, forecast rows Sunday-stamped (+1 day) — cosmetic but every consumer must remember to shift.
- **E17. `compute_sla_risk` docstring vs code:** docstring promises a LOW band (≥1d) and "MEDIUM ≥12h"; code returns no LOW and uses 36h. One of them is stale.
- **E18. Inline param fallbacks:** `planner.py` `get_float(edge.cost_param, 0.065)` / `(edge.speed_param, 50.0)` — shadow defaults outside `FALLBACK_DEFAULTS`, undermining the single-source-of-truth claim.
- **E19. Corridor table never seeded:** `CorridorAlternative` is only read (reroute_engine:601) — no seed script populates it, so DIVERT always takes the generic searoute path; the "seeded corridor alternatives" feature is dormant.
- **E20. Broad exception swallowing as a pattern:** `sla_checker._predicted_p85` (hides E1), `03_ingest` fuzzy-match skips, alert JSON parse — each individually defensible, together they hide whole subsystem failures behind warnings.

## Verified-CLEAN (tested, not just read — for fairness)

1. **Committed model metrics reproduce exactly** in a clean environment (delay: AUC/PR/Brier to 4 dp; baselines too).
2. **`predictions.py` categorical serving is safe on LightGBM 4.7** — `astype("category")` without level alignment yields *identical* predictions to aligned encoding (verified: 0.5072 both ways). Fragile practice, not a bug today.
3. **Severity classification is correct** (>72h→CRITICAL; cushion-relative; breach floor) — old "inverted bands" issue resolved.
4. **ETA wrapper logic** — monotonic rearrangement, SLA band logic (P85≤SLA etc.), MIN_TRANSIT_DAYS guard: all correct.
5. **Reroute scoring math** — corridor/searoute deltas, total-impact = cost+carbon+SLA+demurrage, parameter-driven air block-time: coherent and provenance-labelled.
6. **Quantile coverage 79.8% vs 75% nominal** — conservative, acceptable.
7. **ERA doctrine is written and enforced in ML paths** (BANNED_COLUMNS, time-split on sla_deadline) — the leak is only in *analytics* (E3), not training.

## Priority fix order (what I'd do, in sequence)

| # | Fix | Effort | Unlocks |
|---|---|---|---|
| 1 | E1 `LegStatus` import (+ assert model path in a test) | 1 line | Real ML SLA sweep |
| 2 | E2 retrain ETA with SEA in `category_levels` (fix `11_train` level alignment) | ~1 h | Majority-mode ETAs |
| 3 | E3 era/world filter on `_build_aggregates` (order_date ≥ demo window, or world_id column) | ~1 h | Honest scorecard |
| 4 | E4 unify demurrage free-days via one parameter | 30 min | Consistent money |
| 5 | E7 road speeds re-derivation incl. dwell + sync doc/fallback | ½ day | Realistic road ETAs |
| 6 | E9 air rate → ₹72/tkm anchor (or documented premium) | 15 min | Realistic modal-shift recs |
| 7 | E8 per-port p90 from PortWatch CSV | ½ day | Real disruption tails |
| 8 | E6 label revalidation + publish baseline comparison | 1–2 d | Defensible probabilities |
| 9 | E5 service_level remap fix | 1 d | Clean semantics everywhere |
| 10 | E10 train/serve feature contract (shared encoder!) | ½ day | No silent skew |
| 11 | E15 port arena interpolator + SSE | 1–2 d | Moving map |
| 12 | E11 India demo world | ½ day | Coherent story |

## Sources

**Code (<author-handle>/NexaFreight `main @ 03c68f6`, raw pulls read in full or targeted):** `sla_checker.py`, `alert_engine.py`, `reroute_engine.py`, `disruption_detector.py`, `decision_executor.py`, `consolidation.py`, `eta_model.py`, `predictions.py`, `analytics.py`, `copilot.py`, `planner.py`, `route_planner.py`, `seed_demo_data.py`, `12_train_demand_forecast.py`, `03_ingest_port_data.py`, `04/05/06/07` scripts, `financial_engine.py`, `core/params.py`, `docs/parameters.md`, `ml/{constants,features,data_source}.py`, `01/09/10/11` scripts, `frontend/src/lib/nexafreight/client.ts`, `app/page.tsx`.
**Executed verifications (this sandbox):** artifact loads (delay + ETA `category_levels`), serving-style vs aligned categorical prediction equivalence (0.5072 = 0.5072), country-code→MISSING effect (0.5079 vs 0.5072), ETA-train SEA share 59.7% from real DataCo (Mendeley DOI 10.17632/8gx2fvg2k6.5).
**External anchors for E7/E8/E9:** Livemint govt study (37–38/47–48 km/h) livemint.com/industry/india-expressway-boom-freight-bottleneck…; TERI baseline teriin.org/sites/default/files/2024-06/TERI%20Baseline%20Report_LD.pdf; TCI–IIM cdn.tcil.in; DPIIT–NCAER [CTR §J #28]; GLEC v3.2 factors ecofreight.co/blog/glec-v3-2-explained + ECTA GLEC Module 5.
**Internal:** `Project_Verified_Reality.md` (trace basis), `Sandbox_Validation_Run.md` (execution basis), `External_Benchmark_Validation.md` (rows cross-referenced), `NexaFreight_Audit.md` (superseded where contradicted).
