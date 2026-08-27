# NexaFreight — Final Audit (start → present)
**Date:** 2026-08-27 · **Branch:** `arena/01a03c38-nexafreight` · **Live:** https://nexafreight-jfbc.onrender.com

---

## 1. Phase-by-phase: what was built

| Phase | Delivered | Status |
|---|---|---|
| **0 Foundation** | Deleted the fake legacy app (fake AIS "connected" status, hardcoded risk constants, invented tariffs). New FastAPI package, env-only config (fail-loud in prod), pbkdf2+JWT auth, CI (ruff+pytest+secret-scan), Docker, honest health endpoints. | ✅ |
| **1 Real data core** | 13-table schema; ingested **180,519 real DataCo order lines** → **65,752 shipments**, 20,652 customers, 118 SKUs, 263,008 milestone events (streaming, 47s, bounded RAM); 623 UNCTAD dwell priors; 217 real port-disruption records; SOP rulebook seeded from the team's guide (7 rules, v0.1-draft); 5 role accounts with SOP authority caps. | ✅ |
| **2 Geo/telemetry/portal** | 155 real ports (NGA WPI), 7 airports (Our Airports), 10 real-geometry lanes (searoute; Nhava Sheva→Rotterdam 11,806 km); AIS WebSocket + OpenSky poller with live/replay/mock; ops-dark portal (your Stitch design): login, dashboard+map, shipments+timeline drawer; deployed $0 on Render+Neon. | ✅ (live AIS = flip `FEED_MODE=live`) |
| **3 Alerts + HITL + ML** | Rule engine over a labeled 45-day replay window; priced options; **Split-Pane Triage inbox** with approve/modify/reject, mandatory reason, immutable decisions, server-side authority (403 escalation, verified live); **LightGBM ETA quantile model** wired into option probabilities. | ✅ |
| **4 OR + Finance** | `/api/finance`: REAL SLA exposure ($19,483 / 1,710 at-risk), CALIBRATED demurrage potential ($186k), air/ocean breakeven ($3,600), **ROI log from the actual decision audit trail**; Finance dashboard UI. | ✅ core (MILP consolidation pending) |
| **5 Forecast + ESG + Analytics** | Demand forecast with honest backtest; GLEC ESG engine + dashboard; SPC lead-time + country late-rate analytics. | ✅ core |

## 2. Models — what was used, exact scores

| Model | Method | Data | Scores (held-out, time-split) |
|---|---|---|---|
| **ETA quantile v1** | LightGBM quantile regression, P50 + P85 | 65,752 real shipments; train 50,406 / test 15,346 (split 2017-06-01) | **Pinball@50 = 0.572 · Pinball@85 = 0.324 · MAE = 1.143 days**; calibration table stored per bucket |
| **Demand forecast v1** | Trend (52w centered MA) × multiplicative seasonal indices | 162 real weeks (all 65,752 orders) | Backtest 26 weeks: **model MAE 62.7 vs seasonal-naive 63.0 → MASE 0.996** (beats baseline marginally; verdict stored honestly) |
| Alert option probabilities | ETA-model P(on-time) + uplift priors (REROUTE +0.5, AIR +0.75) | — | labeled `DERIVED:eta-model-v1` |

Every model registers its version, params, data_n and metrics in the **model_runs** table (auditable via `/api/models`).

## 3. Datasets & provenance (all labeled in-product)

| Data | Volume | Source | Label |
|---|---|---|---|
| Order backbone | 180,519 lines / 65,752 shipments | DataCo (CC BY 4.0) | REAL |
| Ports / airports | 155 / 7 | NGA WPI Pub150 / Our Airports | REAL |
| Lane geometry | 10 lanes | searoute marnet / great-circle | DERIVED |
| Dwell priors | 623 | UNCTAD Port Performance | REAL |
| Disruption library | 217 | Verschuur et al. (TR-D) | REAL |
| SOP tariffs & rules | 7 rules + tariff matrix | Team's Business SOP Guide | v0.1-draft (owner-revisable data) |
| Alerts | 25 generated | replay window over REAL history | DERIVED:replay-window |

## 4. Incidents & fixes (the honest log)

1. CI exit-4 (bare `pytest` couldn't import package) → `pythonpath=["."]`; proven by clean-venv repro.
2. **Snapshot corruption ×6** — platform between-session restores mangled/ reverted committed files (portal twice inside commits → the blank-screen saga). Fixes: canonical ES2017-safe rewrite, **CI portal-integrity test (esprima + content markers)**, hash-verified pushes, full-tree resets from remote at turn start.
3. Render deploy blockers: prod-CORS crash → same-origin default; health-check timeout → serve-first boot with background bootstrap; 512MB OOM risk → streaming ingestion.
4. Browser cache serving stale broken JS → `Cache-Control: no-cache` on `/` and `/static` + jsdelivr CDN + single-call dashboard (5 calls → 1) + gzip.
5. FastAPI route-order bug (`/{alert_id}` swallowing `/dashboard`) → specific routes registered first.
6. Air lanes invisible (raw LineString vs Feature) → normalized at API boundary.

## 5. Verification state

- **38/38 tests**, ruff clean, CI green on every push (with secret-scan).
- Live smoke on real data: login, KPIs (65,752), lanes (10), shipments, timeline, alerts generate (25), approve + 403 authority, finance, ESG (87.7t CO2e / $5,262), analytics, models registry — all 200s verified.

## 6. Known remaining (honest)

1. **Groq copilot** — endpoint design ready; needs live-key validation on Render (sandbox can't reach Groq). ~1 session.
2. **MILP multi-shipment consolidation** (Phase 4 full) — ~1 session.
3. Live AIS validation after `FEED_MODE=live` flip (ships on map) — your flip + my verification.
4. Old SmartTrack Render service deletion + Neon password rotation (chat-exposed) — yours.
5. DataCo mass proxy in ESG is documented CALIBRATED (2kg/unit) — replace when a real weight source exists.
