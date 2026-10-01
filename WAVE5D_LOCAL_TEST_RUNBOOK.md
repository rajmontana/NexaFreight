# NexaFreight — Wave 5D Local Test & Deploy Runbook

Patch: `chartroom_5d_mega.patch` (36 paths: 17 changed + 19 deleted) · Base: `def1457` · Branch: `feat/wave5b-ledger-dossier`

Every step below is copy-paste for **PowerShell on Windows**. Do them in order.
Law: every number tells you what it is — check the provenance chip next to each figure.

---

## Phase 0 — Deployment-readiness verdict (read first)

| Layer | Status |
|---|---|
| Code (5C + 5D) | ✅ Complete — sandbox-built, 344/344 tests, 0 console errors |
| War/political removal | ✅ UI + 19 API routes deleted, verified 404 |
| Known 500s (`financials`, `plan`) | ✅ Fixed and verified 200 |
| Demand/forecast ML surface | ✅ Live on /insights (MOD-407) |
| **Deploy gate** | ⏳ Yours to run: this runbook → CI green on PR #44 → merge → Render manual deploy |

**You are clear to deploy once Phases A–G pass on your machine.** Nothing else is blocking.

Data provenance truth table (what "real" means here):

| Data | Provenance | Where you see it |
|---|---|---|
| GDACS hazards, Open-Meteo weather, OpenSky flights, news RSS, earthquakes | **REAL LIVE** (no key needed) | Map toggles: Weather, Flights, News |
| AIS ship positions | **REAL LIVE** only with a free `AIS_API_KEY` (aisstream.io); otherwise absent | Maritime layer |
| Demand forecast (79 lanes), delay classifier, ETA quantile | **REAL TRAINED** — Prophet/ML artifacts trained on the DataCo international dataset | /insights MOD-407, dossier strip |
| 100 shipments, P&L, SLA, congestion, ports/routes | **CALIBRATED DEMO** (SQLite, worldwide ports, realistic params) | Everything |
| Vessel positions between ports | **SIMULATED** (interpolator, tagged on-map) | Map dots |

---

## Phase A — Apply the patch (2 min)

```powershell
cd C:\path\to\NexaFreight-fresh          # your clone root
git status                                # must be clean, branch feat/wave5b-ledger-dossier
git apply --check chartroom_5d_mega.patch # MUST be silent (whitespace warnings = fine)
git apply chartroom_5d_mega.patch
git status --short                        # expect ~36 paths (M/A/D)
```

If `--check` errors: you are not on `def1457` — run `git log --oneline -1` and confirm the tip is `def1457 feat(art): apply chartroom illustration layer patch`.

---

## Phase B — Backend bring-up (5 min)

```powershell
cd backend
python -m venv .venv                      # skip if you already have one
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

Copy-Item <your-demo-db>.db <your-demo-db>.backup.db   # BACK UP first — Phase B.1 rewrites leg/status data

$env:JWT_SECRET   = "nightly-render-secret-key-2026-super-long"
$env:ENVIRONMENT  = "development"
$env:DATABASE_URL = "sqlite+aiosqlite:///C:\path\to\your-demo.db"   # absolute path, forward slashes ok
$env:PYTHONPATH   = "src"
```

### B.1 — The reality pass (REQUIRED once — this is the "map out of sync" fix)

```powershell
python scripts\20_build_demo_world.py
```

Expected log tail: `Legs dressed for reality: N geometries filled; shipments {'IN_TRANSIT': ~25, 'PLANNED': ~49, 'DELIVERED': ~25}` and `Congestion story: ... ports, ... stat rows`.
(The script now also seeds ports + congestion worldwide, fills `legs.route_geometry_json`, and grades leg/shipment status against the clock. Idempotent — safe to re-run.)

### B.2 — Start the API

```powershell
python -m uvicorn nexafreight.main:app --host 0.0.0.0 --port 8000
```

Watch the log for: `Demand forecast model loaded (version=1.0.0, lanes=79)` — that's your ML answering.

### B.3 — Backend smoke tests (new PowerShell window, same env vars)

Use `curl.exe`, **not** `curl` (PowerShell aliases curl to Invoke-WebRequest).

```powershell
# 1. public health (no auth)
curl.exe -s http://localhost:8000/api/health/validation

# 2. login → token
curl.exe -s -X POST http://localhost:8000/api/auth/login -H "Content-Type: application/json" -d '{\"email\":\"operator@nexafreight.dev\",\"password\":\"changeme123\"}'
# copy the access_token value, then:
$env:TOKEN = "<paste-token>"

# 3. map feeds (these were EMPTY before 5D — now must be >0)
curl.exe -s http://localhost:8000/api/map/ports      -H "Authorization: Bearer $env:TOKEN"
curl.exe -s http://localhost:8000/api/map/routes     -H "Authorization: Bearer $env:TOKEN"

# 4. the two former 500s — both must be 200
curl.exe -s -o NUL -w "%{http_code}" http://localhost:8000/api/shipments/<some-shipment-id>/financials -H "Authorization: Bearer $env:TOKEN"
curl.exe -s -o NUL -w "%{http_code}" -X POST http://localhost:8000/api/plan -H "Authorization: Bearer $env:TOKEN" -H "Content-Type: application/json" -d '{\"shipment_id\":\"<some-shipment-id>\"}'

# 5. ML demand forecast (real Prophet artifact)
curl.exe -s "http://localhost:8000/api/demand/forecast?category=Electronics&region=South%20Asia&horizon_days=90" -H "Authorization: Bearer $env:TOKEN"
```

To list **your** trained lanes (they come from your model artifact, not from any docs):

```powershell
python -c "import joblib; idx=joblib.load('models/demand_forecast/model.joblib')['lane_index']; print('\n'.join(sorted(idx)))"
```

Pick any `Category__Region` from that list for step 5 (URL-encode spaces as `%20`, `&` as `%26`).

---

## Phase C — Frontend bring-up (5 min)

```powershell
cd frontend
npm install            # if npm 429s, wait a minute and retry — your network, your call
npm run build          # the gate — must compile clean
npm run start          # serves the production build on :3000
```

Log in at `http://localhost:3000/login` → `operator@nexafreight.dev` / `changeme123`.

Optional (real AIS ships): create `frontend\.env.local` with `AIS_API_KEY=<free key from aisstream.io>` and restart.

---

## Phase D — The 15-minute click-through test matrix

| # | Screen | Action | PASS looks like |
|---|---|---|---|
| 1 | Control Tower `/` | Zoom out (scroll) | World view: cobalt **dashed** sea lines, green road, amber air; port dots in law green/amber/red; chokepoint tags |
| 2 | Control Tower | Look bottom-right | **OPERATOR PULSE** — 4 cards with real numbers (SLA %, open exceptions + ₹ at stake, demurrage, pending exposure) |
| 3 | Control Tower | LAYERS drawer | **No "GDACS Geopolitical Alerts" item** — war layer gone |
| 4 | Control Tower | Toggle Weather / Flights / News | Real live external data renders (REAL feeds, no key needed) |
| 5 | `/insights` | Scroll to bottom | **DEMAND FORECAST — PROPHET ORDER INTAKE** fan chart; `ML · 1.0.0` chip |
| 6 | MOD-407 | Click all 3 lane chips + 30D/60D/90D | Chart refetches each time; dashed cobalt forecast + shaded CI band; footer shows DAY-90 ŷ + CI ±% |
| 7 | `/insights` top | Cross-check | REVENUE tile ₹ matches cost-structure top line (95.8× FX parity — the 5C fix, still holding) |
| 8 | `/shipments` | Filter IN_TRANSIT | Realistic mix (roughly half your fleet in transit — statuses now match leg clocks) |
| 9 | Open an IN_TRANSIT dossier | New strip under ML prediction | **Live Transit Status**: countdown ticking, schedule variance, corridor, **port congestion with a real ×index** |
| 10 | Same dossier | Scroll to financials | P&L populated (this 500'd before 5D) |
| 11 | Same dossier | Route Alternatives panel | Loads without error (this 500'd before 5D) |
| 12 | `/alerts` | Acknowledge one + open reroute | ✓ ACKNOWLEDGED chip; Accept-delay / Divert / Modal-shift options with DERIVED chips |
| 13 | Anywhere | Search text for WAR / CONFLICT / UKRAINE / GAZA / GDACS | Zero hits |
| 14 | Map, 60 s | Watch position dots | SSE stream updates (~30 s cadence, SIMULATED tags expected) |
| 15 | DevTools console | F12 on each screen | 0 errors (307 `_rsc` and the `output: standalone` warning are benign) |

---

## Phase E — Real API verification (curl one-liners)

All through the Next.js proxy (`:3000`) exactly like the browser does — this also tests the rewrite chain.

```powershell
curl.exe -s http://localhost:3000/api/gdelt        | Select-String -Pattern "title"   # GDACS hazards (REAL LIVE)
curl.exe -s http://localhost:3000/api/news         | Select-String -Pattern "name"    # news RSS (REAL LIVE)
curl.exe -s http://localhost:3000/api/health                                          # endpoint list — frontlines/osint must be GONE
curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/api/conflicts                # expect 404 (deleted)
curl.exe -s -o NUL -w "%{http_code}" http://localhost:3000/api/osint/shodan             # expect 404 (deleted)
```

With an AIS key set: toggle the maritime layer → ships render and move (REAL LIVE).

---

## Phase F — Merge gate & deploy

```powershell
cd frontend ; npx vitest run        # MUST print  344 passed (344)

cd ..
git add -A -- frontend/src/app/api  # stages the 19 deletions
git add backend/scripts/20_build_demo_world.py backend/src/nexafreight/api/routes/plan.py backend/src/nexafreight/api/routes/shipments.py backend/src/nexafreight/routers/map.py frontend/src/app/alerts/page.tsx frontend/src/app/insights/page.tsx frontend/src/app/page.tsx "frontend/src/app/shipments/[id]/page.tsx" frontend/src/app/validation/page.tsx frontend/src/components/GlobeMap.tsx frontend/src/components/LayerPanel.tsx frontend/src/components/OperatorInsightsStrip.tsx frontend/src/components/alerts/AlertFeed.tsx frontend/src/components/insights/InsightsCharts.tsx frontend/src/lib/nexafreight/client.ts frontend/src/store/useAuthStore.tsx
git status --short                  # eyeball: 36 paths, nothing else
git commit -m "feat(wave5d): remove war/osint surfaces, sync map to chartroom law, surface demand ML + live status + operator pulse; fix financials/plan 500s"
git push origin feat/wave5b-ledger-dossier
```

Pushing updates **PR #44** automatically. Then:

1. Wait for CI on PR #44 → green (audit + tests).
2. **Merge commit** (no squash — standing law).
3. Render dashboard → **Manual Deploy** the backend first, then frontend. Watch deploy logs.
4. Post-deploy: hit the public `GET /api/health/validation`; log into prod; repeat matrix rows 1, 2, 5, 9.
5. Prod DB: it needs the same reality pass (`20_build_demo_world.py` against the prod SQLite via the nightly flow) or the map will look thin — the code alone doesn't ship rows.

---

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `git apply` rejects | Wrong base — confirm tip `def1457`; patches are per-wave cumulative, use only `chartroom_5d_mega.patch` |
| Whitespace warnings during apply | Benign (5 known lines) |
| `next: not found` after clone/box restart | `npm install` again |
| Build typecheck fails in `.next/dev/types/routes.d.ts` after route deletions | A dev server was running while routes were deleted → stale generated typings. Kill all node processes (`Get-Process node \| Stop-Process -Force`), `Remove-Item -Recurse -Force .next`, rebuild. Never hand-edit the generated `.d.ts` |
| Build OOM / killed | `$env:NODE_OPTIONS="--max-old-space-size=1100"` then rebuild |
| Map has no ports/routes | You skipped Phase B.1 (data, not code) |
| `20_build_demo_world.py` aborts on preflight | DB lacks the network world — run your usual earlier seeding chain first, then re-run it |
| `ImportError: cannot import name 'Leg'` in `dress_legs_for_reality` | Fixed by `chartroom_5d_hotfix1.patch` (Leg lives in `nexafreight.models.leg`). Script is idempotent — apply, re-run, commit the hotfix |
| Route lines look like "randomly drawn" bent polylines | Fixed by `chartroom_5d_hotfix2.patch` — reality pass now uses the real engines: searoute (maritime lanes via Suez/Malacca/Panama), great-circle arcs (air), ORS when `ORS_API_KEY` is set. Log line must read `geometries from {'SEAROUTE': n, 'GREAT_CIRCLE': n, ...}` |
| Want 100% real road geometry + live ships | Free keys: `ORS_API_KEY` (openrouteservice.org) → true street-level HGV paths; `AISSTREAM_API_KEY` (aisstream.io) → live vessel feed. Without them, roads = great-circle APPROXIMATE and ships = simulated positions ON real lanes |
| Demand panel says NO TRAINED LANE | Lane not in your artifact — list lanes with the joblib one-liner in B.3 |
| `422` on shipments list | `size` caps at 100 |
| Financials section blank | Cold backend or the old 500 — confirm B.3 step 4 is 200 |
| PowerShell `curl` weirdness | Use `curl.exe`; env vars via `$env:NAME = "..."` |
