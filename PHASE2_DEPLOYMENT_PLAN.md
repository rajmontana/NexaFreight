# PHASE 2 — DEPLOYMENT PLAN (revised after hosting research, Sep 26 2026)

Supersedes the "local Docker first" default. Encodes the hosting decision,
the revised topology, and the wave order. Companion charter files will
reference this document.

## Hosting decision (evidence-based)

| Target | Role | Why |
|---|---|---|
| **Oracle Cloud Always Free A1** — 2 OCPU / 12 GB ARM (limits reduced Jun 15 2026) | **Production spine** (Stage B) | Highest-capacity $0 infra; runs Postgres + backend + frontend + Caddy + future monitoring with headroom; always-on (SSE, listener, jobs). Mitigations: idle-reclaim -> heartbeat cron or PAYG $0; ARM -> images built in CI (below), never on the user's Windows box |
| **Render free tier** | **Shareable preview** (Stage A) | Zero-admin git-push Docker deploys, free TLS subdomain, x86. Accepted limits (documented, by design): ~512 MB/0.1 CPU, sleeps ~15 min -> cold starts, free Postgres expires 30 days (use Neon instead), no free background workers. It is the demo layer, NOT the ops layer |
| **Neon free Postgres** | Stage A database | Persistent (no 30-day expiry), serverless, free tier; keeps the Render demo stateful across redeploys/sleep |
| **GitHub Actions** | Build + scheduler | (a) `ubuntu-24.04-arm` runners are free for public repos -> native ARM images -> GHCR -> Oracle pulls; no QEMU on Windows. (b) Scheduled workflows (free) call an HMAC-signed `POST /internal/nightly` to run ingestion jobs — immune to host sleep on EITHER target; APScheduler stays for in-process housekeeping only |

## What both targets share (the actual engineering)

1. **SQLite -> Postgres 16**: `DATABASE_URL` via asyncpg (already in
   requirements.txt); Alembic chain verified against Postgres; JSON
   columns audited (`geometry_json` Text is portable; sqlite dialect
   checks reviewed).
2. **Docker images**: backend (python:3.11-slim + .venv mount or baked),
   frontend (Next `output: standalone` — already configured),
   Postgres 16, Caddy (auto-TLS on Oracle; Render provides its own).
3. **Compose**: `docker-compose.yml` (Oracle, full stack) +
   `render.yaml` blueprint (Stage A). Same images, different runtimes.
4. **Secrets policy**: nothing in git, nothing in chat. Oracle: host
   env + `.env` root-owned 600. Render/Neon: dashboard-set env. CI:
   GHCR via GITHUB_TOKEN only. HMAC nightly secret: 32-byte random,
   stored host-side, rotated quarterly.
5. **Ops gates (every deployment PR)**: deploy -> smoke
   (healthz, one shipment fetch, map tile, SSE open) -> **rollback
   drill** (previous image tag re-deployed, verified) -> human
   verdict. Antigravity NEVER declares a deployment healthy.
6. **Monitoring**: uptime via the GH Actions ping (existing scheduler),
   structured JSON logs already in place, `/healthz` + `/readyz`
   (DB ping) endpoints; Uptime-Kuma container on Oracle (wave 2+).

## Wave order (each = pre-flight -> authored charter -> PRs -> verify)

- **Wave 0 — debt (day-17, hosting-independent, STARTS FIRST):**
  GraphCache tests + benchmark-or-drop; copilot fabricated few-shot
  removal (facts-injection stays, behind the fast-path gate); AIS bbox
  subscription (singular `BoundingBox` — proven wire format);
  maplibre-6 retry note; vitest@5 + sharp as separate gated bumps.
- **Wave 1 — spine (this plan):** Postgres migration -> Dockerfiles ->
  CI (ARM build + GHCR) -> Stage A Render+Neon (shareable URL) ->
  Stage B Oracle Compose + Caddy -> rollback drill -> signed
  `/internal/nightly` + GH cron.
- **Wave 2 — real-time ops:** PortWatch ingestion (keyless; closes
  C9/C10), Open-Meteo delay factor, GDACS -> disruption triggers,
  Frankfurter FX — all as script-17-style jobs behind the nightly
  endpoint; provenance REAL; gates unchanged.
- **Wave 3 — financials & analytics:** Regulatory_Tax_Reference.md §8
  region-aware parameters (GST, SLA-norm relabel, insurance line, fuel
  index); DataCo leakage-safe benchmark; pinball/coverage metrics;
  demand-forecast MASE; copilot faithfulness harness; GLEC basis
  decision + golden tests.

## MASTER FLOW — what runs when (the ordering law)

Principle: LOCAL-VALIDATED things (models, parameters, CO2 basis,
faithfulness) are gated BEFORE deployment; DATA-ACQUISITION things
(PortWatch, weather, FX, AIS-live) are deployed AS production jobs
AFTER the spine exists. Wave-3 local halves may run in PARALLEL with
Wave 2 (they do not depend on deployment). After deployment, every
local harness becomes a production MONITOR (drift, faithfulness
spot-checks, rolling MASE) — evaluation is instrumentation, not a
one-time exam.

  STEP 1  [DONE]         Wave 0 debt charter (DAY17 prompts) -> PR #23
                         merged as 01ea5ae (2026-09-26)
  STEP 2  [IN FLIGHT]    Wave 1a: Postgres migration + Dockerfiles +
                         CI ARM build -> GHCR          (local gates only)
                         PR #24 open: rebuild/wave1a-deploy-spine
  STEP 3  [after 2]      USER: Render + Neon accounts (~10 min)
                         Wave 1b: render.yaml + deploy -> STAGE A URL
                         USER: 5-min smoke verdict in browser
  STEP 4  [after 3]      Wave 1c: Oracle A1 compose + Caddy + rollback
                         drill          (USER: Oracle signup, domain opt)
  STEP 5  [after 4]      Wave 2: signed /internal/nightly + GH cron ->
                         PortWatch, Open-Meteo, GDACS triggers, FX
                         (jobs live in production; provenance REAL)
  STEP 6  [parallel 2-5] Wave 3 LOCAL halves: DataCo leakage-safe
                         benchmark, pinball/coverage, MASE, faithfulness
                         harness, GLEC basis + golden tests,
                         Regulatory_Tax S8 parameters (all local-gated)
  STEP 7  [after 5+6]    Wave 3 PROD halves: harnesses become monitors;
                         deploy validated parameters; AIS bbox env flip
                         when upstream recovers; provenance SLO dashboard
  GATE LAW: every step ends with PR checks green + (where applicable)
  human smoke verdict; drill factors 1.710/1.744/1.244 printed at every
  merge; freeze-p2 never moves.

  STATUS 2026-09-26 (wave 1a CLOSED — PR #24 merged as c4c34f8):
  - Final CI at 71cf9c8: 5/5 GREEN — Backend Pytest & Lint,
    Frontend Typecheck & Vitest, Backend Postgres Integration (first
    green PG run), docker-builds amd64 (5m41s) + arm64 (4m43s),
    GHCR push + container smoke both archs.
  - Postgres hardening (commits 4e6d95d, 80f3241, verified on sandbox
    PostgreSQL 17 rig before every push): bool() bind for is_dfc,
    RETURNING id + scalar_one() instead of SQLite-only lastrowid,
    datetime objects not isoformat strings in edge_schedules seeds,
    sa.text("true") server_default on parties.is_active,
    session-scoped PG test schema + per-test TRUNCATE, DATABASE_URL
    stripped from SQLite-path test fixtures. Rig proof: chain->head,
    176+8sk on PG x3 deterministic, 747+2sk SQLite = no regression.
  - Docker fix (71cf9c8): ci.yml build contexts ./backend + ./frontend
    (Dockerfiles stay in docker/, resolved from workspace root).
  - Post-merge drill on main: 1.710 / 1.744 / 1.244 GREEN.
  - GHCR live: nexafreight-backend + nexafreight-frontend
    (latest-amd64, latest-arm64).
  - Deferred to day-18 micro-cleanup: repo-root diagram.png +
    duplicate "diagram (1).png" (~2.8 MB).

  WAVE 1B (step 3) IN FLIGHT 2026-09-26: user created Neon (project
  nexafreight @ AWS Singapore, PG 18, pooled string held privately)
  and Render accounts. Charter ANTIGRAVITY_PROMPT_WAVE1B.md issued
  (branch rebuild/wave1b-render-stage-a): render.yaml (backend from
  GHCR amd64 image, free, singapore, /healthz), Dockerfile PORT
  binding, config DATABASE_URL normalization (asyncpg scheme +
  ssl=require + both statement-cache disables for Neon PgBouncer).
  After merge: USER Render Dashboard > New > Blueprint > pick repo >
  paste Neon string at the DATABASE_URL prompt > Apply. Smoke verdict
  HUMAN: /healthz, /readyz (retry ~60s; Neon+instance cold start),
  /docs, /api/health/ on the onrender.com URL. Frontend on Render is
  DEFERRED (needs NEXT_PUBLIC_API_URL build-arg plumbing) - Stage A
  is backend-first; frontend wiring is a follow-up micro-wave.

  WAVE 1B (step 3) CLOSED 2026-09-26 — STAGE A IS LIVE:
  - PR #25 (render.yaml blueprint + Neon DATABASE_URL normalization +
    Dockerfile PORT binding) merged as 6853b03; PR #26 (asyncpg
    statement-cache disables moved to typed connect_args in
    database.py prod+test factories and migrations/env.py — URL
    string form crashed asyncpg at connect) merged as ac8b80c = main.
  - USER SMOKE VERDICT (human, 4-point): /healthz ok · /readyz ok ·
    /docs opened · Swagger GET /api/health/ = 200. PASS.
  - Live: nexafreight-backend on Render free (singapore) <- GHCR
    latest-amd64 <- Neon Postgres (pooled string, user-held).
  - Stage A rhythm notes: free instance sleeps ~15 min -> ~50 s cold
    start; image updates need Render "Manual deploy > Deploy latest
    reference/image" after each main-lineage image republish; URL is
    user-held (never pasted in chat).
  - KEEP-WARM (live 2026-09-26): cron-job.org pings /healthz every
    10 min -> Render never sleeps (750 free instance-hrs covers one
    24/7 service). MUST stay on /healthz (no DB touch) — pinging
    /readyz would keep Neon compute awake and burn the ~190 free
    compute-hrs in ~11 days. Neon stays on-demand (sub-second wake).
    URL secrecy class: the onrender.com URL is a PUBLIC endpoint
    (user pasted it in chat freely — fine). Secret-class items are
    ONLY: Neon connection string, NIGHTLY_SECRET (wave 2), JWTs.
  - Frontend on Render deferred (NEXT_PUBLIC_API_URL build-arg
    plumbing) — follow-up micro-wave when wanted.

  STEP 3  [DONE]         Wave 1b: render.yaml + Neon -> STAGE A LIVE
  STEP 4  [DEFERRED]     Wave 1c: Oracle A1 Stage B — FALLBACK LAW
                         INVOKED 2026-09-26 (user has no credit card
                         for Oracle KYC). Oracle = optional future
                         upgrade: when a card works (debit w/ intl
                         toggle, family card, or forex card), resume
                         here — arm64 GHCR tags keep publishing in
                         the meantime, nothing rewrites. Oracle notes
                         preserved: card = verification only (small
                         temp hold, released); home region PERMANENT,
                         recommend ap-mumbai-1; A1 capacity varies by
                         region — retries are normal.
  WAVE 2B CLOSED 2026-09-26 — NIGHTLY PIPELINE LIVE:
  - PR #28 merged (79027a6, +42/-0, nightly.yml byte-verified).
  - User wiring: NIGHTLY_SECRET (Render) = NEXA_NIGHTLY_SECRET
    (GitHub Actions); NEXA_NIGHTLY_URL = Render URL.
  - First run: workflow_dispatch, GREEN in 10 s (keep-warm working:
    no cold start). Real GDACS events in external_events (TC
    GONZALO-26/FAY-26/ODALYS-26/POLO-26/SURIGAE-26 + seismic, all
    GREEN on a calm day; ORANGE/RED will appear when they occur).
  - Schedule: 01:30 UTC daily + manual Run workflow button.
  - Gotcha logged: Actions tab has TWO workflows (CI + Nightly
    ingestion); first attempt ran nothing and Neon looked empty.
  - Legacy GH secrets unused by this flow: AISSTREAM_API_KEY
    (user rotated key), GROQ_API_KEY, HF_TOKEN, SEED_USER_PASSWORD.
  - REMAINING WAVE 2 OPTION: 2c PortWatch (locode-keyed congestion
    table) — deferrable; wave-2 goal (provenance REAL) achieved.

  STEP 6  [WAVE 3A CLOSED 2026-09-26]  PR #29 merged -> main 0eec763
                         (true merge, parents 79027a6+5c591ba; PR CI
                         green BEFORE merge this time - ritual held;
                         post-merge CI #94 on main green). Audited
                         commit 5c591ba: allowlist + Order-Id group
                         split + 4 models + F1/PR-AUC/ROC-AUC/Brier +
                         calibration + INFLATED tripwire (0.97) + JSON
                         artifact + --synthetic smoke. Synthetic gate:
                         BEST M2_logistic ROC-AUC 0.6773, VERDICT OK.
                         NEXT MANUAL INPUT (real-data run, one step):
                         download DataCo CSV (Kaggle "DataCo Smart
                         Supply Chain") -> backend\data\raw\dataco\
                         DataCoSupplyChain.csv, then
                         cd backend && python scripts\29_benchmark_delay_risk.py,
                         paste REPORT lines. Expect honest numbers WELL
                         BELOW the published 0.978-0.993 leakage band -
                         that is success. Then charter Wave 3b
                         (EVALUATION_REVIEW 2.1 pinball/coverage/MASE,
                         2.4 planner oracle).
  WAVE 3A FULLY CLOSED 2026-09-26: encoding fix + real-run artifact
                         merged via PR #30 -> main 910bfa0 (true merge,
                         parents 0eec763+49a0003; CI #95 green before
                         merge, audit passed: 1-line diff + artifact
                         blob verified against paste). Evidence frozen
                         in-repo: backend/eval/artifacts/
                         delay_risk_benchmark.json. Headline numbers:
                         M2_logistic ROC-AUC 0.7451 / PR-AUC 0.8382 /
                         Brier 0.1872; prevalence 0.5744; leakage gap
                         0.233 below published band; calibration ECE
                         1.04% (10 bins); bin10: 4314 test orders
                         predicted 99.99% late, actual 100% late.

  STEP 7  [IN FLIGHT]   WAVE 3B 2026-09-26: forecast instruments
                         charter issued (ANTIGRAVITY_PROMPT_WAVE3B.md,
                         branch rebuild/wave3b-forecast-instruments).
                         Scope: EVALUATION_REVIEW 2.1 completion -
                         per-level ETA coverage (P10/P50/P85),
                         RMSE-on-P50, demand MASE vs in-sample
                         seasonal-naive, eval/report.md frozen metrics.
                         Recon-verified: pinball_loss +
                         interval_coverage already exist
                         (ml/eta_model.py:80,:112); script 11 already
                         reports per-quantile pinball + interval
                         coverage; script 12 has seasonal-naive
                         forecaster (:311) but NO MASE. Charter = new
                         pure-func lib + 8 unit tests + additive
                         reporting in scripts 11/12 + 2 artifact JSONs
                         + eval/report.md. 3c = planner (2.4), 3d =
                         faithfulness (5) + GLEC (2.5).
  WAVE 3B CLOSED 2026-09-26: PR #31 -> main df46f44 (true merge,
                         parents 910bfa0+7ab202c; PR CI #97 green
                         before merge, post-merge CI #98 green).
                         Branch history: daf02f6 (coverage+RMSE+MASE+
                         report, 7 files) -> f28cb18 (fix-1 pooled
                         MASE) -> d6d7332 (demand models) -> 7ab202c
                         (ETA models). Audits: lib math hand-verified,
                         file lists exact vs charters; two deviations
                         caught+resolved (models initially unstaged;
                         D4 gap -> strict fix charter FIX1).
                         FROZEN RESULTS (real DataCo, sha16
                         fa6d022ed437155e): ETA per-level coverage
                         P10 0.0994 / P50 0.5287 / P85 0.8477
                         (targets 0.10/0.50/0.85); naive P10 0.3285
                         (dangerously over-optimistic); interval
                         74.83pct matches console to decimal; RMSE-P50
                         1.2974 (naive 1.2961, parity); demand MASE
                         median 0.7285, pooled 0.6985, lanes<=1: 63/79
                         (79.7pct) - AutoETS beats seasonal-naive.
                         Model SHAs pinned: eta b3954a466dbd8bc2,
                         demand 35cfd698ec45c6bd. Known finding:
                         same-seed retrain drift vs Sep runs
                         (env/library drift) - paper limitations
                         material. QUEUED BUG (fixed in 3c Task 0):
                         constants.py DATACO_CSV_PATH still points to
                         old DataCoSupplyChainDataset.csv name.

  STEP 8  [IN FLIGHT]   WAVE 3C 2026-09-26: planner validation
                         charter issued (ANTIGRAVITY_PROMPT_WAVE3C.md,
                         branch rebuild/wave3c-planner-validation).
                         EVALUATION_REVIEW 2.4: networkx oracle
                         cross-check (4 objectives), brute-force
                         Pareto non-dominance property, profile
                         invariants (CRITICAL<=STANDARD time, ECONOMY
                         <=CRITICAL cost), seed determinism, script 30
                         beat-naive benchmark + artifact + report
                         append. Task 0 ride-along: constants.py path
                         fix. HARD WALL: planner.py read-only; red
                         property test = FINDING, keep failing, stop.
                         Precondition: pre-flight on df46f44 (unit
                         baseline now 592+2sk expected).
  WAVE 3C CLOSED 2026-09-26: PR #32 -> main 6c085c2 (true merge,
                         parents df46f44+94a60ac; CI #99 green before
                         merge, #100 green after). Commit 2ad0c21
                         (8 files: oracle/pareto/invariants tests,
                         script 30 + artifact, report append,
                         constants.py + 01_ingest path fix) + 94a60ac
                         (FINDING-3C-1 strict-xfail). RESULTS:
                         networkx oracle match 4 objectives; profile
                         invariants + determinism PASS; beat-naive
                         40/40/40 VERDICT OK (mean composite 0.9364
                         all profiles - pool too easy for separation,
                         limitation noted); FINDING-3C-1: Yen can
                         return dominated itineraries - property test
                         strict-xfail in suite (auto-error on planner
                         fix = cannot be forgotten). Unit now 634+2sk
                         +5xf. Recon done: copilot injects SYSTEM
                         COMPUTED FACTS (copilot.py ~241) +
                         load_shipment_context public (~53) +
                         deterministic rules fallback; EF pins in
                         references.yaml (sea 8 GLEC-sourced) +
                         params.get_float(edge.co2_param) planner:303.

  STEP 9  [IN FLIGHT]   WAVE 3D+3E (FINAL eval wave) 2026-09-26:
                         combined charter issued
                         (ANTIGRAVITY_PROMPT_WAVE3DE.md, branch
                         rebuild/wave3de-faithfulness-glec). 3d:
                         deterministic copilot faithfulness harness
                         (eval/faithfulness.py pure funcs + script 31
                         over demo DB, regex-number grounding in
                         SYSTEM COMPUTED FACTS + shipment JSON,
                         zero judge; RAGAS = phase 3). 3e: CO2 basis
                         declaration (eval/co2_basis.md + references
                         .yaml basis fields), documented GLEC
                         deviations (road 62 vs 74 = -16.2pct, air
                         500 vs 600 floor = -16.7pct; sea/rail
                         in-band), 5 golden worked examples asserted
                         to DECLARED basis via _compute_leg_kpis
                         mocked-params pattern. Hard walls: copilot
                         + planner read-only. Fast Path: push -> PR
                         immediately. After this: eval program
                         COMPLETE (2.1 2.4 2.5 5 all delivered);
                         remaining = report refresh, branch
                         protection, paper.
  WAVE 3D+3E CLOSED 2026-09-26: PR #33 -> main 7abf9fb (true merge,
                         parents 6c085c2+dc66629; merged before PR CI
                         finished - 3rd ritual lapse (#27 #28 #33) -
                         but post-merge CI #102 green so content
                         verified). History: 37990c2 (harness+goldens,
                         6 files) -> 87c738a (GUARD: script 31 refuses
                         non-sqlite DATABASE_URL exit 2 - booby trap
                         caught in audit: dummy fixtures would have
                         polluted real DBs) -> dc66629 (frozen run).
                         RESULTS: faithfulness lib chartered-exact
                         (extract/normalize/is_grounded 0.5pct);
                         RULES path 75/75 100pct grounded, 0
                         hallucinated; LLM path SKIPPED (quota);
                         VERDICT MIXED (honest - rules path is
                         self-consistency, real LLM number pending
                         quota rerun of script 31); CO2 goldens 5/5
                         through real _compute_leg_kpis; basis
                         declared (road -16.2pct vs 74, air -16.7pct
                         vs floor, sea/rail in-band) in
                         eval/co2_basis.md + references.yaml basis
                         fields. Unit now 647+2sk+5xf.
                         *** EVALUATION PROGRAM COMPLETE:
                         2.1 (pinball/coverage/MASE) + 2.4 (oracle/
                         pareto/invariants/beat-naive) + 2.5 (basis/
                         goldens) + 5 (faithfulness) ALL DELIVERED.
                         Findings ledger: 3a leakage gap 0.233;
                         FINDING-3C-1 dominated itineraries
                         (strict-xfail tripwire); script-31 booby
                         trap (audited out); same-seed retrain drift.

  DATA-2 CLOSED 2026-09-27: PR #35 -> main 914df14 (PR CI #107 +
                         post-merge #108 green; protection-enforced).
                         History: 4d67e14 (loaders+migration+model+
                         alias map+tests) -> df38441 (rapidfuzz actually
                         pinned; 17 rerun) -> a13748f (evidence) ->
                         583cd57 (utf-16 null-byte strip from
                         requirements - byte-level audit catch) ->
                         eceaf18 (FIX-3: get_db_url monkeypatch - env
                         var name never matched script). RESULTS: 84k
                         global locodes, 581 ports, 173,981 CALIBRATED
                         port-daily rows, source column migration,
                         filtered climatology (906 calibrated input
                         rows locally, 4 ports p50/p90 empirical),
                         GLEC cross-check deviations listed (sea 7.5
                         rail 25 air 789 vs pins - relay decision
                         pending). PRODUCTION SEED DONE 2026-09-27
                         (user ran on Neon): 02 = 84295 locations
                         CALIBRATED; 03 = 578 ports, 173978 CALIBRATED
                         daily rows (493339 activity records, 37 WPI
                         aliases, 578/1620 matched); 17 local artifact
                         = 3 ports x 8 months (min-days 30 default +
                         network_nodes still demo-Indian corridor -
                         widens with DEMO-2). Log masking (FIX-4)
                         proven in prod paste. SQL PROOF DONE (user
                         screenshots 2026-09-27): locations=84295,
                         ports=578, port_daily_stats=173978 ALL
                         CALIBRATED - ZERO SIMULATED rows on Neon
                         (demo world never ran against prod =
                         cleanest possible state, BUG8 structurally
                         impossible on prod). REMAINING: nightly run
                         + live map eyeball.
                         Neon password ROTATED after 02-log-line leak
                         (pre-FIX-4; line now masks).
                         REALNESS ROADMAP (the bottleneck answer):
                         A) production seed (manual, today) -> conges-
                         tion CALIBRATED on prod; B) Demo World v2
                         charter: DataCo-replay international corrid-
                         ors (DERIVED+cited) + weather-from-DB (6 ->
                         all transit ports) + WPI aliases; C) ETA
                         retrain on v2 corridors; D) AIS bbox flip
                         micro-attempt; E) script 31 LLM rerun (quota);
                         F) GLEC re-pin decision (paper section).
                         Ceiling stays: live freight-rate feeds
                         (structural, $0 law).
  DEMO-2 RECON COMPLETE 2026-09-27 (sandbox clone, verified):
                         (1) topology lives in migration 3f8a2b1c9d4e
                         _NODES/_EDGES_RAW (both-dir edges, param-key
                         triple, haversine) -> intl graph = NEW
                         SIBLING MIGRATION; ZERO intl lanes today.
                         (2) BUG9 FOUND: runtime consumers
                         (disruption_detector L268, map L444) do NOT
                         filter port_daily_stats.source -> running
                         script 20 on Neon would re-contaminate
                         baselines; DEMO-2 adds source-aware
                         consumption (CALIBRATED w/ fallback).
                         (3) script 21 drip ALREADY geography-agnostic
                         (_pick_lane + real planner) -> intl shipments
                         flow free after migration; (4) 09 reads DB
                         (shipments+legs) -> retrain 09->11 zero
                         change; (5) citations fit Order.order_number
                         (DC-{srclid}-{lane}); (6) weather rewrite:
                         ports-table-driven (578) + 429 backoff ->
                         warn status. NODES LOCKED: USNYC USLAX DEHAM
                         NLRTM JPTYO CNSHA BRSSZ AUSYD ZADUR AEBUE
                         SGSIN (+Indian intact); EDGES: 9 SEA lanes +
                         US-transcon ROAD + DEHAM-NLRTM ROAD.
                         W1 BUILT (branch rebuild/demo2-international-
                         graph tip 995802b = 31cde8c migration
                         ca009891c5e2 down_rev 334acd8cb53d / 876054e
                         BUG9 two-step / 995802b weather db-driven +
                         crc32 rotation + 429 backoff; force-push
                         used but harmless). RELAY AUDIT: migration/
                         BUG9/weather VERIFIED (fresh-sqlite chain
                         clean; 11 nodes 26 edges exact). GATE 4c
                         FAILED: 0/8 intl shipments - CAUSE: script
                         21 line 96 lane pool startswith("IN")
                         (recon missed it too). FIX-1 charter issued
                         (open pool; printed-count gates MANDATORY).
                         PR NOT OPENED. After FIX-1: relay re-verifies,
                         then PR -> CI -> merge. W2: replay seeder ->
                         local E2E -> Neon rebuild -> ETA retrain.
                         W2 PROGRESS: relay BUILT script 27 in
                         sandbox (37 DERIVED, 0 legless, 37 searoute
                         legs, real SLA split, idempotent; 3 bugs
                         found+fixed: items()-counting, past-
                         deadline planning, per-order commit).
                         Antigravity rewrote from charter spec
                         (commit d1b89b7 branch
                         rebuild/demo2-dataco-replay); relay audit:
                         all 5 fix fingerprints present, relay-
                         sandbox E2E legless=0, 43 distinct
                         citations, suite 844 green on both
                         machines. MERGED #40 2026-09-27 16:01Z (main
                         5e58cf5, ALL 5 checks success incl docker
                         x2 - cleanest merge of campaign). REMAINING
                         W2 (Neon pass card): alembic on Neon (intl
                         migration ca009891c5e2 NOT yet applied
                         there - Neon alembic_version sits at
                         334acd8cb53d) -> stage REAL DataCo CSV ->
                         27 --limit on Neon -> SQL verify -> Render
                         deploy -> nightly -> map eyeball. ETA
                         retrain 09->11 local vs real-CSV replay.
                         THEN FRONTEND (parked; 5 answers owed).
                         ETA RETRAIN DONE 2026-09-27 23:29 (user,
                         local): chain 01(65752 orders+180519 items
                         real CSV) -> 02 -> 04(15638 HISTORICAL
                         shipments) -> 09(100.00% coverage; splits
                         46711/10461/8580 on 2015-2018 real dates)
                         -> 11(n=8109 test IDENTICAL to frozen 3B;
                         RMSE 1.2972 vs 1.2974; MAE 1.01d
                         identical; interval 74.8%; SHA 72d70b1a)
                         = REPRODUCTION PROOF of frozen metrics on
                         rebuilt world. pytest 846 passed (2 env-
                         skips un-skipped by fresh artifacts).
                         Hiccups: synthetic_dataco.csv fossil
                         caught by resolver (fixed via --input
                         explicit path); relay SQL pattern wiped
                         local scratch once (rebuilt by rerun;
                         lesson: check real ID ranges before
                         pattern surgery). New artifacts LOCAL
                         ONLY (uncommitted) - optional chore PR
                         later. BACKEND ERA CLOSED. NEXT:
                         FRONTEND (5 answers owed: vibe/colors/
                         layout/signature/stack) + Render deploy
                         of 5e58cf5 when next on Render.
                         MERGE INCIDENT 2026-09-27: PR #37 (7c3646b)
                         MERGED WITH RED CI (Backend Pytest+Lint +
                         PG Integration failing) then #38 REVERTED
                         it 7 min later - main content == f461f4d
                         + revert commit 8a5b87b. USER MUST RECHECK
                         branch protection (how did red merge pass?
                         verify 'do not allow bypassing' + required
                         checks). CI FAILURES ROOT-CAUSED + FIXED IN
                         RELAY SANDBOX: BUG A migration used ISO-
                         string created_at (asyncpg timestamptz
                         rejects) -> datetime.now(timezone.utc)
                         objects; BUG B downgrade IN :tuple bind
                         (text() never expands) -> per-locode loop;
                         BUG C tests seeded USNYC colliding with
                         migration data -> USTEST. PROVEN GREEN:
                         sqlite full pytest 842+2sk+5xf, PG fresh
                         upgrade + integration 176 passed, eval
                         GREEN, drill GREEN, demo intl 1. FIX-2
                         charter issued (2 files, 1 commit). NEXT:
                         FIX-2 -> new PR (old #37 closed) -> CI ->
                         merge #39.
                         PR #39 OPEN (head d9b9b78). FIX-2 push
                         ddf3374 verified IDENTICAL to sandbox-
                         proven files. BUT FIX-3 merge resolved
                         WRONG: 5 wave files took main's reverted
                         versions (21 IN-filter back, weather
                         _PORTS back, detector BUG9 gone) while
                         new test files survived -> CI pytest red
                         on d9b9b78 (PG integration green - unit
                         tests not in its suite). LESSON: never
                         let Antigravity resolve merge conflicts;
                         use restore-from-sha. RESOLVED: FIX-4 was
                         executed by Antigravity (push 9bc8e69) ->
                         CI ALL GREEN -> PR #39 MERGED 2026-09-27
                         13:27Z by user (aa86003). TREE PROOF:
                         aa86003 vs ddf3374 = 0 files differ
                         (byte-identical to sandbox-verified tip).
                         MERGE CHECKS GREEN (unlike #37 incident).
                         DEMO-2 WAVE 1 CLOSED. POST-MERGE: Render
                         deploy law pending (user); weather-rotation
                         starts on prod after deploy (~116 ports/
                         night, 5-night full cycle). WAVE 2 NEXT:
                         replay seeder sandbox-first (relay), Neon
                         world-rebuild decision, ETA retrain 09->11.
  NEXT (no charters):  0) FRONTEND REBUILD (user-driven; CO-DESIGNED
                         with relay - user rejected premade mockups;
                         5 design questions PENDING: vibe, colors,
                         layout, signature element, stack; Impeccable
                         optional as agent skill; hosting rides on
                         new UI). Then key rotation (pending).
                         Coder.qwen.ai evaluated: web tool = greenfield
                         sketchpad only, not a repo agent; Qwen Code
                         CLI = viable second in-repo agent if wanted. 3) AIS bbox flip
                         (upstream-blocked). 4) script 31 rerun when
                         Gemini quota allows. 5) Optional 2c
                         PortWatch + FINDING-3C-1 planner fix. 6)
                         Report + checklist refresh (post-rebuild).
                         7) Key rotation still pending. Nightly
                         schedule #3 note: GitHub cron did NOT fire
                         2026-09-27 01:30 UTC (delays common); watch
                         tomorrow - two consecutive misses =
                         investigate.
  REAL-DATA RUN DONE 2026-09-26: Kaggle CSV (latin-1; needed
                         encoding="latin1" fix in
                         eval/delay_benchmark.py:33 - FIX IS UNCOMMITTED
                         on user machine, must go through branch+PR+audit
                         before 3b). RESULTS (verdict OK, exit 0):
                         prevalence 0.5744 (M0 F1 0.7297 all-late);
                         M2_logistic ROC-AUC 0.7451 / F1 0.6779 /
                         PR-AUC 0.8382; M3_lgbm 0.7449/0.6809/0.8321
                         (lgbm adds nothing -> logistic is right final
                         model). Gap below leakage-band floor 0.978 =
                         0.2329 -> published 0.978-0.993 DEMONSTRATED as
                         leakage inflation. Pending: artifact JSON
                         (calibration+Brier+split counts) to close the
                         wave; encoding-fix commit via standard flow.
  WAVE 2A BUILT 2026-09-26: branch rebuild/wave2a-nightly-jobs,
  commit 3d86506 (single commit, own short message). Audit PASSED:
  16 files (10 charter + 2 necessary table-list test edits + T5
  fix correcting MY charter mock inconsistency: 6 ports = 6 breach
  rows), migration b2c3d4e5f6a7 exact, sa.func.now() SQLite fix
  legitimate, router at root (no /api prefix), auth ladder exact,
  NO junk despite git-add-. VIOLATION: bare `git add .` used AGAIN
  (banned; audit caught nothing this time — rule stays, charters
  must lead with it). No REPORT lines printed. Gates claimed
  576+2sk / 184 / drill green. Awaiting PR -> CI -> merge.
  KEEP-WARM: cron-job.org pings user's /healthz every 10 min (live).

  PR #27 MERGED UNVERIFIED 2026-09-26 (user merged before CI ran —
  no branch protection; merge beat the checks). FULL-REPO
  VERIFICATION executed post-merge from sandbox rig at main
  6ebd0b6 (tree e6b00a6 = audited branch tree, byte-identical):
  SQLite 576+2sk unit · 184 integration · PG17 alembic chain ->
  b2c3d4e5f6a7 + 176+8sk on PG · drill 1.710/1.744/1.244 · eval
  gate GREEN · tsc 0 errors · vitest 243/243 · npm build OOM in
  sandbox (resource limit; verified by CI instead) · no hardcoded
  secrets · no isoformat DB binds. Post-merge CI on main: 5/5
  success. VERDICT: main is healthy; wave 2a content EXACTLY as
  audited. LESSON: wait for checks before merging; branch
  protection (required checks) recommended when user is ready.

  WAVE-1B NOTES (for charter authoring):
  - Neon project created by user: nexafreight @ AWS Singapore,
    Free plan, PG 18, default branch "production" (Neon new default
    naming). User holds the connection string; NEVER pasted in chat.
  - Neon pooled endpoint (host contains ".pooler.") = PgBouncer in
    transaction mode -> asyncpg prepared statements are INCOMPATIBLE.
    render.yaml DATABASE_URL must be:
      postgresql+asyncpg://neondb_owner:<pw>@ep-...pooler....neon.tech/<db>?sslmode=require&prepared_statement_cache_size=0
    (scheme converted from postgresql:// to postgresql+asyncpg://,
    plus prepared_statement_cache_size=0 per SQLAlchemy asyncpg
    dialect docs).
  - Render free: user sets DATABASE_URL as dashboard env var
    (sync: false in render.yaml). Never in git.
  - Neon PG18 accepted: DDL is vanilla SQLAlchemy; gates run PG16/17.

## Decisions left open (reversible)

- Domain name: later OK — Render gives a free subdomain now; Caddy
  needs one on Oracle when Stage B goes live (~$2-10/yr).
- If Oracle signup friction blocks Stage B: Stage A + Neon carries the
  demo indefinitely; spine defers, nothing rewrites.
