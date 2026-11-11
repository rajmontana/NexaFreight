---
name: pre-commit-checks
description: >-
  Comprehensive verification, test gate, database isolation, and safe git workflow protocol
  required before staging, committing, merging, or pushing code in NexaFreight and full-stack projects.
  Use whenever making commits, preparing pull requests, or verifying changes prior to pushing.
---

# Pre-Commit Verification & Safe Git Workflow Protocol

This skill codifies the exhaustive checklist, command gates, and common failure pitfalls that must be verified **before** staging, committing, or pushing code to version control.

---

## 1. Quick Pre-Commit Checklist (Summary Table)

| Area | Command / Check | Expected Result | Why It Matters |
| :--- | :--- | :--- | :--- |
| **Git Diff Inspection** | `git status`, `git diff` | Only intentional, surgical changes | Prevents accidental file staging or temporary scratch file leakage |
| **Secret Scan** | Check for API keys, passwords, tokens | Zero raw credentials | Gitleaks CI gate halts builds on any exposed credential |
| **Frontend Types** | `cd frontend && npx tsc --noEmit` | `0 errors` | Catches broken prop contracts, missing imports, interface mismatches |
| **Frontend Tests** | `cd frontend && npx vitest run` | All tests passed | Verifies component rendering, state hooks, and client logic |
| **Frontend Build** | `cd frontend && npm run build` | Route tree generated successfully | Catches SSR issues, dynamic route mismatch (`[id]`), bundle failures |
| **Backend Alembic** | `python -m alembic upgrade head` | Migrations applied cleanly | Validates DDL syntax, constraint naming, dialect compatibility |
| **Backend Unit/Int** | `pytest -q` (with test env vars) | 100% pass | Verifies services, API endpoints, serialization, domain models |
| **Eval Gate** | `python eval/validate.py` | `all_ok: True` | Anchors maritime transit quantiles & UNCTAD validation bands |
| **Disruption Replay**| `python scripts/24_red_sea_drill.py` | All ratios within bands | Validates Suez/Cape routing ratios and cost delta physics |

---

## 2. Frontend Pre-Commit Verification Runbook

Always execute these three commands from the `frontend/` directory:

```powershell
cd frontend

# Step 1: Typecheck
npx tsc --noEmit

# Step 2: Component & Unit Tests
npx vitest run

# Step 3: Production Build (SSR & Route Validation)
npm run build
```

### Critical Frontend Pitfalls
1. **Dynamic Route Wildcard Escapes**: On Windows PowerShell, paths like `app/shipments/[id]/page.tsx` contain `[` and `]`, which PowerShell treats as character set wildcards. Always wrap paths in single quotes or use `-LiteralPath`.
2. **Missing Export / SSR Safety**: Ensure client components accessing `window`, `localStorage`, or `navigator` carry `'use client'` at the top line.
3. **Responsive Breakpoints**: Ensure floating overlays (like `CopilotQuickDock` or `OperatorInsightsStrip`) use responsive positioning (`bottom-4 left-1/2 -translate-x-1/2` or right dock) rather than fixed pixel margins that clip on smaller viewports.

---

## 3. Backend Pre-Commit Verification Runbook

Always set the test environment variables before running pytest or migration checks to avoid touching local development SQLite databases (`data/nexafreight.db`):

```powershell
cd backend

# Step 1: Set isolated test environment variables
$env:JWT_SECRET = "test-secret-key-for-ci-runs-only-min-32-chars-long"
$env:ENVIRONMENT = "test"

# Step 2: Run Alembic migration check
python -m alembic upgrade head

# Step 3: Run targeted or full pytest suite
pytest -q

# Step 4: Validate domain & ML benchmarks
python eval/validate.py
python scripts/24_red_sea_drill.py
```

---

## 4. Database Schema, Triggers & Multi-Dialect Isolation

When modifying database tables, triggers, or fixtures, verify both **SQLite** (local / fast test runner) and **PostgreSQL** (production & `postgres-suite` CI container):

### A. Append-Only Triggers & `TRUNCATE CASCADE`
* **The Pitfall**: Adding a statement-level `BEFORE TRUNCATE` trigger to an append-only table (like `audit_logs`) will block `TRUNCATE ... CASCADE` on **any table that has a foreign key pointing to it** (e.g., `audit_logs.actor_id -> users.id`).
* **The Fix**: During test harness resets in PostgreSQL, suppress triggers for the reset transaction:
  ```python
  await conn.execute(text("SET session_replication_role = 'replica'"))
  await conn.execute(text(truncate_sql))
  await conn.execute(text("SET session_replication_role = 'origin'"))
  ```
* **Fallback**: If `session_replication_role` is restricted, temporarily drop the statement trigger, run `TRUNCATE`, and re-create the trigger.

### B. Fresh-Clone File Assumptions
* **The Pitfall**: Never assume `data/nexafreight.db` or cached CSV/parquet files exist on disk in CI. Database `.db` files are strictly `.gitignore`d.
* **The Rule**: Any script executed via an API endpoint (e.g. `/internal/activate-fleet`) must handle missing tables gracefully and never throw uncaught 500 errors during authentication or health probes.

### C. Fixture Idempotency
* **The Pitfall**: Fixtures that insert static records (`email="operator@example.com"`) fail with `IntegrityError: duplicate key value violates unique constraint "uq_users_email"` if an earlier test failed to truncate.
* **The Rule**: Always verify fixture idempotency:
  ```python
  existing = (await db_session.execute(select(User).where(User.email == "operator@example.com"))).scalar_one_or_none()
  if existing:
      return existing
  ```

---

## 5. Security & Credential Hygiene

Before staging any commit, verify that no sensitive configuration or secrets have been exposed:

1. **Check for Unintended `.env` or Credentials**:
   ```powershell
   git status --ignored
   ```
   Ensure `.env`, `.env.local`, `*.pem`, `*.key`, `gho_*`, `ghp_*`, and `Bearer` tokens are never staged.
2. **Review Diff of Every Staged File**:
   ```powershell
   git diff --staged
   ```
   Inspect every line of added code (`+`) to verify no hardcoded secrets or test secrets with production variable names exist.
3. **Gitleaks Pre-Flight**:
   The CI pipeline runs Gitleaks on all commits. Test passwords in test files must use synthetic dummy strings (e.g. `test-secret-key-for-ci-runs-only-min-32-chars-long`).

---

## 6. Safe Git Staging, Commit & Push Workflow

Follow this strict step-by-step procedure to avoid merge conflicts, broken branches, or dirty commits:

### Step 1: Explicit Staging (Never `git add .`)
Stage only the exact files modified for the specific task:
```powershell
git add path/to/file1.py path/to/file2.tsx
```

### Step 2: Conventional, Descriptive Commit Message
Write commits following Conventional Commits format:
* `fix(scope): concise description of bug fix and root cause`
* `feat(scope): concise description of new capability`
* `docs(scope): documentation updates`
* `refactor(scope): code structure change with no behavioral delta`

Example:
```powershell
git commit -m "fix(ci): suppress audit_logs truncate trigger via session_replication_role during postgres test resets"
```

### Step 3: Upstream Sync Check
Before pushing, verify your branch is tracking and in sync with `origin`:
```powershell
git fetch origin
git status
```
If remote has diverged, rebase cleanly before pushing:
```powershell
git pull --rebase origin main
```

### Step 4: Push and CI Verification
Push to the target branch:
```powershell
git push origin main
```

Immediately monitor GitHub Actions CI runs via API or web UI:
```powershell
$r = Invoke-RestMethod -Uri "https://api.github.com/repos/rajmontana/NexaFreight/actions/runs?per_page=3" -Headers @{"User-Agent"="PowerShell"}
$r.workflow_runs | Select-Object id, name, head_branch, head_sha, status, conclusion
```
Do not consider the commit complete until all pipeline jobs (`Backend Pytest`, `Frontend Typecheck & Vitest`, and `Backend Postgres Integration`) report **success**.
