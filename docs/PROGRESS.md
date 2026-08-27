# NexaFreight — Progress Report & Audit
**Updated:** 2026-08-26 (v2 — after blank-screen incident & integrity guards) · **Branch:** `arena/01a03c38-nexafreight` · **Live:** https://nexafreight-jfbc.onrender.com

---

## Phase status

| Phase | Scope | Status | Verified evidence |
|---|---|---|---|
| **0 — Foundation** | Repo hygiene, FastAPI package, config/auth core, CI, Docker, honest health | ✅ DONE | 32/32 tests, ruff clean, CI green on GitHub Actions, secret-scan in CI |
| **1 — Domain core & real data** | Schema (13 tables), DataCo ingestion, calibrated execution layer, SOP seed, users, event timelines | ✅ DONE | Real run: 180,519 lines → 118 SKUs, 20,652 customers, **65,752 shipments**, 263,008 events; every calibrated param cites its source; login/KPIs/shipments/timeline verified end-to-end |
| **2 — Geo + telemetry + portal** | Real ports (WPI 155), airports (7), 10 lanes with real geometry (searoute + great-circle), AIS/OpenSky service (live/replay/mock), ops-dark portal (login, dashboard+map, shipments+drawer) | ✅ DONE *(live feed pending)* | Lanes verified (JNPT→RTM 11,806 km); portal deployed & serving; telemetry honest-empty in mock; **live AIS activates when `FEED_MODE=live` on Render** |
| **3 — Alerts & HITL (core)** | Rule engine (replay window), priced options from SOP tariffs, Alert Inbox UI (split-pane triage), decisions with immutable audit + authority enforcement | ✅ CORE DONE *(ETA model + LLM copilot pending)* | 25 real alerts generated; manager approval logged; dispatcher 403 on $12.5k (authority matrix works); mandatory-reason + immutable-decision rules enforced (tests) |
| **4 — OR decision engine + Finance** | ETA-quantile probabilities, mode-mix optimizer, breakeven curves, financial dashboards | ⬜ NOT STARTED | — |
| **5 — Forecasting + ESG + analytics** | Demand models w/ backtests, GLEC CO₂e, IMO CII, carbon budgets, SPC cards | ⬜ NOT STARTED | — |

## Infrastructure status

| Component | State |
|---|---|
| CI (lint + tests + secret scan) | ✅ green on every push |
| Render free deploy | ✅ live (`nexafreight-jfbc.onrender.com`), manual-sync mode |
| Neon Postgres | ✅ connected (`DATABASE_URL`); data persists across deploys |
| Keep-alive ping | ⬜ user to create (cron-job.org → `/api/health` every 10 min) |
| Old SmartTrack service | ⬜ user to delete (frees hours + the `nexafreight.onrender.com` URL) |

## Data provenance summary (all REAL unless labeled)

| Data | Volume | Source |
|---|---|---|
| Order backbone | 180,519 lines / 65,752 shipments | DataCo (CC BY 4.0) — REAL |
| Ports / airports | 155 / 7 | NGA WPI Pub150 / Our Airports — REAL |
| Lane geometry | 10 lanes | searoute marnet / great-circle — DERIVED |
| Dwell priors | 623 | UNCTAD Port Performance — REAL |
| Disruption library | 217 records | Verschuur et al. (TR-D) — REAL |
| SOP rules & tariffs | 7 rules v0.1-draft | Team SOP guide (owner may revise — data, not code) |
| Alerts | 25 (replay window) | DERIVED:replay-window (labeled in UI) |

## Bug audit (2026-08-26) — 3 found, 3 fixed (`11a3499`)

1. **Air lanes invisible on map** — stored as raw `LineString`, UI expected `Feature` → silently skipped. Fixed: `/api/lanes` normalizes; verified all 10 lanes render inputs.
2. **"Disruption Library" panel stuck on loading** — endpoint never existed. Fixed: `/api/alerts/disruptions/library` + UI wiring (top: TC Debbie, Port Hay Point, 45 days).
3. **Congestion panel static** — wired to `/api/alerts/congestion/ports` with honest-empty in mock mode.

## Incident log (2026-08-26, continued)

- **Blank-screen incident:** platform snapshot corruption shipped stale/mismatched portal files inside commits (025c409); server 200s but SPA couldn't boot. **Fix:** canonical ES2017-safe portal rewrite (c1917ea) + `test_portal_integrity.py` in CI (esprima syntax + content markers) — corrupted portal files can never deploy again. Root cause documented; hash-verified pushes now standard.
- **Render Blueprint pinning:** "Deploy latest commit" deploys the last SYNCED commit — fixes require Blueprint → "Manual sync" first (owner procedure).

## Remaining roadmap & effort estimate

| Work | Sessions |
|---|---|
| Phase 3 completion: LightGBM ETA quantile model (trained on real data, calibration page) + Groq LLM copilot | 2–3 |
| Phase 4: OR decision engine (model-driven probabilities, MILP consolidation) + Financial dashboard (demurrage clocks, exposure, breakeven curves, expedite ROI) | 3–4 |
| Phase 5: demand forecasting w/ backtests, ESG engine (GLEC/CII/carbon price), analytics (carrier scorecards, SPC), mobile polish, demo script + pitch pack | 3–4 |
| Close-out: merge to main, deploy validation, README/docs final | 1 |
| **Total: ~9–12 focused sessions ≈ 1–2 weeks at current pace** (overall completion ~60–65% now) | |

## Known issues & risks (honest list)

1. **Old-project Neon password exists in git history** (original commit `1bb3914`, file `backend/test_neon_live.py` — predates this rebuild). Rotate that old Neon project's password or delete the project.
2. **Keys pasted in chat** (Groq/AISStream/HF/Neon) — rotate when convenient; they never touched the repo (CI secret-scan enforces).
3. Sandbox snapshot corruption hit 3× during development (`.git` reverted between sessions) — procedure now: verify remote sync at turn start; all work is pushed immediately.
4. `p_on_time` in options is `heuristic-v1` — Phase 4 replaces with ETA-quantile model output (labeled in UI).
5. Free-tier Render sleeps after 15 min idle (fix: cron-job ping) and shares 750 instance-hrs/month (delete old service).
6. Chokepoint (IMF 541MB) dataset not yet integrated — optional enrichment (Route A/B pending owner).
