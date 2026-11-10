# NexaFreight Codebase Audit Report

**Date:** October 2026  
**Mode:** Strictly Read-Only (0 files modified, 0 files created in repo, 0 deletions)  
**Execution Target:** `NexaFreight-fresh` (Branch: `chore/ci-immutable-image-tags`, commit: `a2f3f16`)

---

## Phase 0: Architectural Map

```
                    ┌────────────────────────────────────────────────────────┐
                    │            Next.js 16.3.6 App Router (Port 3000)       │
                    │  5 Screens: / (Map), /alerts, /shipments, /insights,   │
                    │             /login, /validation                        │
                    │  Proxy Routes: 31 /api/* routes (legacy + copilot)    │
                    │  Client: client.ts (reads NEXT_PUBLIC_NEXA_API_URL)    │
                    └───────────────────────────┬────────────────────────────┘
                                                │ HTTP / SSE /api/map/positions/stream?token=...
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │               FastAPI Backend (Port 8000)              │
                    │  Entrypoint: main.py -> create_app() (Uvicorn 1 worker)│
                    │  Auth: HTTP Bearer header OR ?token= query parameter   │
                    │  DB Engine: database.py -> create_async_engine()       │
                    │    - SQLite (dev/test): WAL mode, FKs on, busy=5000ms  │
                    │    - Postgres (prod): pool_size=5, pre_ping=True,      │
                    │      statement_cache_size=0 (PgBouncer/Neon ready)     │
                    │  Lifespan Workers:                                     │
                    │    - AIS Listener: Memory PositionTracker (poll 5s)    │
                    │    - Interpolator: Memory dead-reckoning loop (1s)     │
                    │    - APScheduler: In-process async MemoryJobStore      │
                    │  AI Copilot: copilot.py (Fast-path rules -> Gemini)    │
                    └───────────────────────────┬────────────────────────────┘
                                                │
                                                ▼
                    ┌────────────────────────────────────────────────────────┐
                    │         PostgreSQL 16 (Prod) / SQLite (Dev/Test)       │
                    │  14 Tables, Alembic migrations (20260921..20260927)    │
                    │  AuditLog: Ordinary table (immutable by convention)    │
                    └────────────────────────────────────────────────────────┘
```

---

## 1. Verified Findings Table

| ID | Severity | Area | One-Line Description | Evidence (File:Line) | Reproduced? |
|---|---|---|---|---|---|
| **SEC-01** | **CRITICAL** | Security | Default credentials published in README; seeded across test/demo scripts | [README.md:244](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/README.md#L244), [seed_demo_data.py:70](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/scripts/seed_demo_data.py#L70), [seed_test_user.py:30](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/scripts/seed_test_user.py#L30) | **Y** — `grep "changeme123"` matched in 7 files |
| **SEC-02** | **CRITICAL** | Security / History | Default credentials committed permanently into Git history across 4 commits | Commit history: `ee69012`, `2bc9e6d`, `2a043df`, `a2f3f16` | **Y** — `git log -S "changeme123"` confirmed |
| **SEC-03** | **HIGH** | Security / Privacy | JWT passed in URL query string on SSE endpoint leaks into web server access logs and browser history | [dependencies.py:31,50-51](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/src/nexafreight/dependencies.py#L31), [useSSEPositions.ts:54-55](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/frontend/src/hooks/useSSEPositions.ts#L54-L55) | **Y** — `dependencies.py` extracts `token` from `Query()` for all routes |
| **SEC-04** | **HIGH** | Security / Auth | Zero object-level authorization: any authenticated `OPERATOR` or `ADMIN` can approve decisions and view all shipments regardless of assignment or organization | [decisions.py:40-41](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/src/nexafreight/api/routes/decisions.py#L40-L41), [alerts.py:184](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/src/nexafreight/api/routes/alerts.py#L184) | **Y** — Inspection of `_require_privileged` shows only role enum check |
| **SEC-05** | **HIGH** | Security / AI | Unescaped string interpolation into Gemini prompt enables prompt injection via user questions or database cargo fields | [copilot.py:241-244](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/src/nexafreight/services/copilot.py#L241-L244) | **Y** — `f"QUESTION: {question}\n"` concatenated directly into prompt string |
| **SEC-06** | **HIGH** | Security / DoS | Backend `/api/copilot/ask` endpoint has no rate limiting or cost cap; vulnerable to quota exhaustion | [api/routes/copilot.py:24-30](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/src/nexafreight/api/routes/copilot.py#L24-L30) | **Y** — Route handler has no rate limit dependency |
| **SEC-07** | **HIGH** | Security / Dependencies | 11 npm vulnerabilities (4 Critical, 4 High), including MapLibre GL XSS bypass, Next.js cache poisoning/RCE, and tinypool prototype pollution | `frontend/package.json` | **Y** — `npm audit` produced GHSA advisories |
| **SEC-08** | **MEDIUM** | Security / Privacy | Developer full name and local Windows filesystem paths committed into repository scripts and benchmark outputs | [run_full_walkthrough.py:14](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/scripts/run_full_walkthrough.py#L14), [verify_ui_flows.py:14](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/scripts/verify_ui_flows.py#L14), [delay_risk_benchmark.json:3](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/eval/artifacts/delay_risk_benchmark.json#L3) | **Y** — `grep "RAJ KUMAR MERUGU"` matched in 5 files |
| **SEC-09** | **MEDIUM** | Security / Audit | `AuditLog` table lacks database-level immutability enforcement; rows can be modified or deleted by anyone with SQL write access | [models/audit.py:17-58](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/src/nexafreight/models/audit.py#L17-L58) | **Y** — Standard SQLAlchemy model; no Postgres trigger or REVOKE rule |
| **SEC-10** | **LOW** | Security / Secret | `backend/src/nexafreight/config.py` enforces mandatory `jwt_secret` with no default, but `docker-compose.yml` does not provide `JWT_SECRET`, causing container crash unless `.env` exists | [docker-compose.yml:22-25](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/docker-compose.yml#L22-L25), [config.py:45](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/src/nexafreight/config.py#L45) | **Y** — Verified `JWT_SECRET` missing under `backend.environment` in compose |
| **DEP-01** | **HIGH** | Deployment / Config | Environment variable name mismatch: `Dockerfile.frontend` sets `NEXT_PUBLIC_API_URL`, but client code reads `NEXT_PUBLIC_NEXA_API_URL` | [Dockerfile.frontend:9](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/docker/Dockerfile.frontend#L9), [client.ts:43](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/frontend/src/lib/nexafreight/client.ts#L43) | **Y** — Code inspection confirms client ignores `NEXT_PUBLIC_API_URL` and falls back to `localhost:8000` |
| **DEP-02** | **MEDIUM** | Deployment / Container | Backend container runs as root user with no unprivileged `USER` directive | [Dockerfile.backend:2-23](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/docker/Dockerfile.backend#L2-L23) | **Y** — Dockerfile ends at line 22 without `USER` switch |
| **DEP-03** | **MEDIUM** | Deployment / Migrations | Alembic migrations run synchronously inside container startup `CMD` without lock or pre-deploy separation; `render.yaml` lacks `preDeployCommand` | [Dockerfile.backend:22](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/docker/Dockerfile.backend#L22), [render.yaml:1-15](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/render.yaml#L1-L15) | **Y** — `render.yaml` defines only `healthCheckPath: /healthz` |
| **DOC-01** | **HIGH** | Docs / Setup | README quickstart instructions fail: step 6 runs `seed_user.py` which seeds `@nexafreight.local` users with password `operator123`, but README claims credentials are `operator@nexafreight.dev / changeme123` | [README.md:208,243-244](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/README.md#L208), [seed_user.py:50-51](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/scripts/seed_user.py#L50-L51) | **Y** — Fresh setup following README step 6 creates user that does not match README credentials |
| **DOC-02** | **MEDIUM** | Docs / Integrity | README claims "Prophet Demand Forecasting", but implementation uses StatsForecast AutoETS | [README.md:36](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/README.md#L36), [12_train_demand_forecast.py:3](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/scripts/12_train_demand_forecast.py#L3), [demand_forecast/metadata.json:2](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/models/demand_forecast/metadata.json#L2) | **Y** — `model_name` is explicitly `"demand_forecast_autoets"` |
| **DOC-03** | **MEDIUM** | Docs / Badges | README test badge is a hardcoded static SVG shield (`1000+ Passing`) rather than a live CI test result badge | [README.md:12](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/README.md#L12) | **Y** — Hardcoded `img.shields.io/badge/Tests-1000%2B%20Passing-brightgreen.svg` |
| **DOC-04** | **LOW** | Docs / Clutter | Unused duplicate screenshot `diagram (1).png` (2.8 MB) committed in repository root | Root directory: `diagram (1).png` | **Y** — Confirmed file size 2,790,677 bytes |
| **ML-01** | **HIGH** | ML Integrity / Provenance | Reconstructed DataCo shipment legs are tagged with `REAL` provenance badge in database seeding, violating the 4-tier provenance specification | [20_build_demo_world.py:478](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/scripts/20_build_demo_world.py#L478) | **Y** — Legs from searoute/great-circle formulas on historical orders assigned `"REAL"` |
| **ML-02** | **HIGH** | ML Performance | Quantile ETA regressor is empirically worse than the naive baseline on all 3 quantiles in test set pinball loss | [eta_quantile/metadata.json:99-114](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/models/eta_quantile/metadata.json#L99-L114) | **Y** — `lift_pct`: p10 is -0.23%, p50 is -0.36%, p85 is -1.94% |
| **ML-03** | **MEDIUM** | ML Integrity | 10x order-of-magnitude discrepancy in sea CO2 emission factors: `core/params.py` sets `62.0`, while migration seed sets `6.5`, and `financial_engine.py` references `8.0` | [params.py:91](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/src/nexafreight/core/params.py#L91), [migration 3f8a2b1c9d4e:328](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/migrations/versions/20260921_2000_3f8a2b1c9d4e_add_multimodal_network.py#L328), [financial_engine.py:17](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/src/nexafreight/services/financial_engine.py#L17) | **Y** — Verified raw parameters in code |
| **ML-04** | **LOW** | ML Pipeline | Port congestion cold-start in `feature_contract.py` drops immediately to static `1.0` default when window has `< min_days`, ignoring `build_climatology` fallback helper | [feature_contract.py:151-153,170](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/src/nexafreight/ml/feature_contract.py#L151-L153) | **Y** — `index_asof` returns `self._default` directly without calling climatology |
| **ALG-01** | **MEDIUM** | Correctness / Planner | Yen k-shortest path algorithm can return Pareto-dominated itineraries across 4 dimensions; 5 test cases intentionally marked `xfail` | [test_planner_pareto.py:123-124](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/tests/unit/test_planner_pareto.py#L123-L124) | **Y** — Pytest run reported `846 passed, 5 xfailed` directly attributable to this issue |

---

## 2. Hypotheses Refuted by Code Evidence

The following items from previous reviews or audit plans were investigated and **proven false or already resolved** in the codebase:

1. **Refuted: "Database connection pool settings (`pool_size`, `max_overflow`, `statement_cache_size=0`) are missing and need to be added"**
   - **Proof:** In [backend/src/nexafreight/database.py:82-97](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/src/nexafreight/database.py#L82-L97), `create_engine()` ALREADY checks `if not is_sqlite:` before configuring `pool_size=5`, `max_overflow=10`, and `pool_pre_ping=True`. It also ALREADY inspects `if database_url.startswith("postgresql+asyncpg"):` and sets `{"statement_cache_size": 0, "prepared_statement_cache_size": 0}` for PgBouncer/Neon compatibility. Adding this was unnecessary because it was already implemented safely.
2. **Refuted: "GlobeMap is missing `ssr: false` dynamic imports, creating React 19 SSR hydration crash risks"**
   - **Proof:** In [frontend/src/app/page.tsx:26](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/frontend/src/app/page.tsx#L26), `GlobeMap` is imported via `const GlobeMap = dynamic(() => import('@/components/GlobeMap'), { ssr: false });`. A repository-wide grep for `GlobeMap` confirmed it is imported in **zero other files**. The hydration guard is already fully in place.
3. **Refuted: "Health endpoints `/healthz` and `/readyz` do not exist"**
   - **Proof:** In [backend/src/nexafreight/main.py:328-347](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/src/nexafreight/main.py#L328-L347), both endpoints are implemented directly: `/healthz` provides an instant liveness probe, and `/readyz` executes an async 2.0-second database connectivity check returning 200 or 503.
4. **Refuted: "CORS is set to `*` (wildcard)"**
   - **Proof:** In [backend/src/nexafreight/main.py:245](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/src/nexafreight/main.py#L245) and [config.py:51-54](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/src/nexafreight/config.py#L51-L54), CORS origins are explicitly restricted to `settings.allowed_origins`, defaulting strictly to `["http://localhost:3000", "http://127.0.0.1:3000"]`.
5. **Refuted: "Generative AI path can execute unauthorized database writes or reroute commits"**
   - **Proof:** In [backend/src/nexafreight/services/copilot.py:247-258](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/src/nexafreight/services/copilot.py#L247-L258) and [api/routes/copilot.py:64-68](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/src/nexafreight/api/routes/copilot.py#L64-L68), the LLM output is parsed solely into a `CopilotAskResponse` string. The only write operation is an append to `AuditLog`. It does not trigger reroutes, leg updates, or state mutations.
6. **Refuted: "SSE hook `useSSEPositions` has memory leaks from unbounded position arrays and unclosed connections"**
   - **Proof:** In [frontend/src/hooks/useSSEPositions.ts:141,178-185,233-243](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/frontend/src/hooks/useSSEPositions.ts#L141), positions are stored in a key-value dictionary `Record<string, PositionReport>` keyed by `asset_id` (upsert, not append). On component unmount, `useEffect` cleans up timers and invokes `es.close()`.
7. **Refuted: "Decision approvals can be double-clicked, executing twice"**
   - **Proof:** In [backend/src/nexafreight/services/decision_executor.py:254-258](file:///c:/Users/RAJ%20KUMAR%20MERUGU/Downloads/nexagithub/NexaFreight-fresh/backend/src/nexafreight/services/decision_executor.py#L254-L258), `execute_decision()` explicitly checks for an existing `Decision` row for `alert_id` and raises `ConflictError(HTTP 409)` if already executed.

---

## 3. Unverified / Needs Info

1. **`pip-audit` CVE Report:** 
   - `pip-audit` is not installed inside the backend virtual environment (`.venv`). Per Rule 1 (strict read-only), `pip install pip-audit` was not executed. Python dependency CVE auditing requires running `pip-audit` outside the repo or in a temporary container.
2. **Production Neon / PgBouncer Latency:**
   - Testing was verified locally on SQLite and integration tests on local Docker PostgreSQL. Behavior under serverless Neon connection throttling or multi-region latency was not directly benchmarked.

---

## 4. Suggested Fix Order (Ranked by Risk × Effort)

| Order | ID | Risk × Effort Rationale | Recommended 1-Line Fix Approach |
|---|---|---|---|
| **1** | **SEC-01** | High Risk / 5 min effort | Remove `changeme123` from README; update `seed_user.py` to prompt or generate secure credentials. |
| **2** | **DOC-01** | High Risk / 5 min effort | Reconcile `seed_user.py` credentials with README so new developers can log in on fresh clone. |
| **3** | **DEP-01** | High Risk / 5 min effort | Rename `NEXT_PUBLIC_API_URL` to `NEXT_PUBLIC_NEXA_API_URL` in `Dockerfile.frontend` to match client code. |
| **4** | **SEC-08** | Medium Risk / 10 min effort | Scrub developer name and Windows paths from `run_full_walkthrough.py`, `verify_ui_flows.py`, and `delay_risk_benchmark.json`. |
| **5** | **DOC-04** | Low Risk / 1 min effort | Delete `diagram (1).png` from repository root. |
| **6** | **ML-01** | High Risk / 15 min effort | Change `leg.provenance = "REAL"` to `"CALIBRATED"` for reconstructed DataCo legs in `20_build_demo_world.py`. |
| **7** | **SEC-03** | High Risk / 1 hr effort | Replace query-param JWT in `/positions/stream` with a short-lived ticket/cookie mechanism to avoid log leakage. |
| **8** | **SEC-05** | High Risk / 30 min effort | Structure Gemini prompt with delimited system/user message blocks and escape user input. |
| **9** | **SEC-06** | Medium Risk / 30 min effort | Add `slowapi` rate limiting (e.g., 10 req/min) to `/copilot/ask` endpoint. |
| **10** | **DEP-02** | Medium Risk / 5 min effort | Add unprivileged system user `RUN adduser --system nexa && USER nexa` to `Dockerfile.backend`. |
| **11** | **DEP-03** | Medium Risk / 15 min effort | Add `preDeployCommand: "alembic upgrade head"` to `render.yaml` and strip `alembic upgrade head` from image runtime `CMD`. |
| **12** | **DOC-02** | Low Risk / 5 min effort | Update README from "Prophet" to "StatsForecast AutoETS" to reflect actual model code. |
| **13** | **DOC-03** | Low Risk / 5 min effort | Replace static `1000+ Passing` badge in README with GitHub Actions workflow status badge. |
| **14** | **ML-03** | Medium Risk / 15 min effort | Reconcile sea CO2 emission factor to unified GLEC standard across `params.py`, migrations, and docstrings. |
| **15** | **SEC-07** | High Risk / 1 hr effort | Upgrade vulnerable npm packages (`next`, `maplibre-gl`, `sharp`, `zod`). |
| **16** | **ML-02** | High Risk / Research wave | Add documentation disclosing that Quantile ETA model requires retraining/calibration against non-trivial features. |
| **17** | **ALG-01** | Medium Risk / Future wave | Address Yen algorithm Pareto dominance in route planner (currently documented and gated via `xfail`). |

---

## 5. Top 5 Things I Am Least Sure About

1. **Why `co2.sea_g_per_tonne_km` was set to `62.0` in `params.py`:**
   - `62.0` is typically the GLEC factor for *diesel road trucks*, whereas maritime container ships are typically `8.0` to `15.0` gCO2/t-km. Whether this was an accidental copy-paste from road emissions or intentional needs domain verification.
2. **Whether `NEXT_PUBLIC_NEXA_API_URL` vs `NEXT_PUBLIC_API_URL` was intentional:**
   - Some docs refer to `NEXT_PUBLIC_API_URL`, while `client.ts` uses `NEXT_PUBLIC_NEXA_API_URL`. It is possible an older frontend client was migrated without updating `Dockerfile.frontend`.
3. **If `operator@nexafreight.dev / changeme123` was intended to be in `seed_user.py`:**
   - `seed_test_user.py` seeds this account, but `seed_user.py` (which the README explicitly tells developers to run) seeds `admin@nexafreight.local` instead. It's unclear whether `seed_user.py` is deprecated in favor of `seed_test_user.py`.
4. **Whether any production deployment actually uses the internal Umami analytics route:**
   - In `middleware.ts:21`, a hardcoded `http://umami-umami-1:3000/api/send` Docker DNS hostname is queried if `ENABLE_UMAMI=true`. It is unclear if this Umami instance is running anywhere in staging/production.
5. **Why `delay_classifier` has 5 Optuna iterations recorded in `metadata.json` despite the script default being 50:**
   - Line 119 of `delay_classifier/metadata.json` records `"best_iteration": 3` out of 50 trials, with an AUC lift of only +0.023 over naive grouped baseline. It is uncertain if hyperparameter tuning saturated or early-stopped.
