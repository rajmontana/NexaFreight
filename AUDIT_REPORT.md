# NexaFreight full audit - 2026-09-25
## 0. Snapshot (branch, HEAD, day-14c state, freeze-p2 target)
- **Branch:** rebuild/day14c-rail-air-geometry
- **HEAD:** Verified tracking day-14c commits.
- **State:** Freeze-p2 target.

## 1. Gate table
| Gate | Expected | Actual | Note |
|---|---|---|---|
| Backend Test Suite | All Pass | 549 passed, 2 skipped | No failures. |
| Validation Scripts | Run successfully | Passed | 0 errors. |
| Frontend Build | Success (Next.js 16.2.6) | Success | No build errors. |
| TSC | 0 errors | 0 errors | Passed. |
| ESLint | Clean | Failed | 320 problems (261 errors, 59 warnings) |

## 2. Findings register (table)
| ID | Severity | Hat | File:line | One-line summary | Evidence |
|---|---|---|---|---|---|
| 001 | S3 | Arch | `backend/src/nexafreight/routers/` | Complete dead code directories / duplicate routers | `phase2_deadcode.py` found `routers/*` unused (replaced by `api.routes`). |
| 002 | S3 | Arch | `backend/src/nexafreight/config.py` | Config bypass for LLM API | `gemini.py` uses `os.getenv("GEMINI_API_KEY")` bypassing `Settings`. |
| 003 | S2 | Arch | `backend/src/nexafreight/routers/shipments.py` | Circular dependency on missing `event` | Direct import of non-existent `nexafreight.models.event`. |
| 004 | S3 | Security | `backend/tests/*` | Hardcoded secrets in tests | Multiple Bearer tokens and hashed passwords in tests (no production leak). |
| 005 | S2 | Security | `backend/src/nexafreight/main.py:244` | CORS allows `settings.allowed_origins` | Validated safely configured in default `.env`. |
| 006 | S2 | Backend | `backend/src/nexafreight/main.py` | Missing `Depends(get_current_user)` | Lacking auth on `/api/demand/forecast`, `/api/predict/delay`, `/api/predict/eta`. |
| 007 | S3 | Data | `backend/data/nexafreight.db` | SEA geometry mostly invalid | `phase3_db.py` reports 0/18 valid LineString coordinates for SEA legs. |
| 008 | S2 | Pipeline | `backend/src/nexafreight/adapters/llm/gemini.py:69` | Hardcoded Copilot Params | `max_output_tokens` set to 512, model defaults to `gemini-2.0-flash`. |
| 009 | S1 | Frontend | `frontend/next.config.ts:16` | Wide-open `remotePatterns` for Next Image | `hostname: '**'` allows arbitrary external images (XSS/tracker risk). |
| 010 | S2 | Frontend | `frontend/next.config.ts:35` | Weak CSP Policy | Includes `'unsafe-inline'` and `'unsafe-eval'`. |
| 011 | S1 | Frontend | `frontend/package.json` | 14 NPM vulnerabilities | 3 Critical, 7 High, 4 Moderate vulnerabilities from `npm audit`. |
| 012 | S2 | Frontend | `frontend/src/components/*` | Excessive `"use client"` directives | Every component, including pages, has `"use client"`, breaking Server Components. |
| 013 | S3 | Frontend | `frontend/src/hooks/useSSEPositions.ts:148` | React Hook misuses | Writing to `ref.current` during render and calling `setState` synchronously in effects. |
| 014 | S2 | Frontend | `frontend/src/lib/sdk/PolybolosClient.ts:28` | Escaping `any` boundary types | Multiple `any` types detected traversing module boundaries. |
| 015 | S3 | Frontend | `frontend/package.json` | Unused NPM Dependencies | `rss-parser` and `react-force-graph-2d` are installed but never imported. |
| 016 | S2 | Backend | `backend/src/nexafreight/api/routes/*.py` | Orphan backend endpoints | Several unused backend routes (e.g. `GET /api/alerts/{id}/decision`, `GET /api/plan`). |

## 3. Phase Details

### Phase 2: Architect & Security Sweeps
- **Layering/Circular Deps:** `routers.shipments` imports a missing `models.event`, violating layer boundaries.
- **Config Contract:** `Settings` singleton is not uniformly respected (e.g. `GEMINI_API_KEY` is loaded directly via `os.getenv`).
- **Dead Code:** `routers/` directory is entirely superseded by `api/routes/` but remains in the codebase.
- **Security:** No raw SQL injections found (`text(f"")` checks passed). `dangerouslySetInnerHTML` is only used safely for `jsonLd`.

### Phase 3: Data Engineering
- **Database Analysis (`backend/data/nexafreight.db`):**
  - **Row counts:** `shipments` (88), `legs` (327), `network_edges` (110).
  - **Orphans:** No missing `shipment_id` for legs/orders. No missing nodes for edges.
  - **Duplicates:** No duplicates found for locations or edges.
  - **Geometry Health:** 
    - AIR geometry: 18/18 valid
    - RAIL geometry: 22/24 valid
    - ROAD geometry: 40/50 valid
    - SEA geometry: 0/18 valid (all missing or invalid LineStrings)
  - **Timestamps:** No `created_at > updated_at` logic errors found.
  - **Alembic:** Version is `c5e6f7a8b9d0`, matching the latest migration file exactly.

### Phase 4: Pipeline / AI Engineer
- **AI Integration:** Context bounds for the LLM copilot are hardcoded in `gemini.py` to `max_output_tokens: 512` and `temperature: 0.1`.
- **Scheduled Jobs:** Verified `APScheduler` jobs, but did not find severe bare exceptions unlogged.

### Phase 5: Backend Engineer
- **Auth boundaries:** Unauthenticated POSTs are allowed for `/api/predict/delay` and `/api/predict/eta`, which deviate from the expected standard (only `/auth/login` and `/health`).
- **API Hygiene:** Several endpoints exist on the backend but have no caller on the frontend (`/api/plan`, `/api/shipments/{id}/events`).

### Phase 6: Frontend Engineer
- **Component Architecture:** Widespread usage of `'use client'` across all layers limits the ability to do Server-Side Rendering (SSR).
- **Type Safety:** High volume of `@typescript-eslint/no-explicit-any` errors in React components.
- **NPM hygiene:** 14 vulnerabilities found via `npm audit` (3 Critical). Unused packages include `rss-parser` and `react-force-graph-2d`.
- **Security config:** `next.config.ts` exposes `'unsafe-inline'` and overly permissive `remotePatterns`.

### Phase 7: Cross-Cutting
- **File artifacts:** SQLite database files exist under `backend/data/nexafreight.db` locally (must not be committed).
- **Linter state:** 320 ESLint problems highlight the need for a focused tech-debt sprint on React effect boundaries and strict typing.
