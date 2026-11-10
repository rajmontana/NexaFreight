# NexaFreight Project Verification Table & Provenance Ledger

**Generated Date:** 2026-11-10T10:08:31.909840+00:00  
**Target Repository:** `NexaFreight-fresh`  
**Git Commit Hash:** `b84c53e7f5fe3ac231adcfb72b635d5307354c84`  
**Verification Branch:** `report-evidence`  

---

## Executive Summary

This verification table provides an empirical, verifiable line-by-line reconciliation of claims made in `REPORT.pdf` against the active codebase, git revision history, live regression test suites, recomputed metric scripts, and recovered evidentiary artifacts.

Every entry adheres to the strict evidentiary protocol:
- **MATCH**: The claim is mathematically or textually verified against active code, git history, or live test runs.
- **MISMATCH**: The active repo state or rerun contradicts the claim in `REPORT.pdf`.
- **NOT RETAINED**: The cited file, log, or commit object was never committed or was unrecoverably lost; no synthetic value has been invented.
- **NOT RERUN**: The command or target was not executed due to deliberate environment constraints (e.g., local PostgreSQL marker absence).

---

## Master Verification Table

| Claim in REPORT.pdf | Report Value | Actual Value | Evidence File | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Git Inception Commit [E-001]** | `09786eb` (2026-08-23) | `09786eb` (commit verified) | `evidence_v2/runs/git_tags_and_commits.txt` | **MATCH** |
| **Consolidation Commit [E-008]** | `ee69012` (2026-09-12) | `ee69012` (commit verified) | `evidence_v2/runs/git_tags_and_commits.txt` | **MATCH** |
| **Feature Freeze Milestone Tag [E-029]** | `freeze-p2` (`4441c13`) | `4441c13` (`freeze-p2` tag verified) | `evidence_v2/runs/git_tags_and_commits.txt` | **MATCH** |
| **Release Tag v1.0.0 [E-062]** | `v1.0.0` (`2f6ece9`) | `2f6ece9` (`v1.0.0` tag verified) | `evidence_v2/runs/git_tags_and_commits.txt` | **MATCH** |
| **Release Tag v1.0.1 [E-063]** | `v1.0.1` (`b63bf10`) | `b63bf10` (`v1.0.1` tag verified) | `evidence_v2/runs/git_tags_and_commits.txt` | **MATCH** |
| **Release Tag v1.0.2 [E-070]** | `v1.0.2` (`6451fb8`) | `6451fb8` (`v1.0.2` tag verified) | `evidence_v2/runs/git_tags_and_commits.txt` | **MATCH** |
| **Order Drip Commit [E-072]** | `93ec1a7` (2026-10-30) | `93ec1a7` (commit verified) | `evidence_v2/runs/git_tags_and_commits.txt` | **MATCH** |
| **PR 1 Commits (Honesty & Provenance)** | `9e7b231`, `f8c201a` | Commits do not exist in git; actual merge commit is `0b1f48e` | `evidence_v2/runs/git_tags_and_commits.txt` | **MISMATCH** |
| **PR 2 Commits (GLEC CO2 & ML)** | `3c2d4e5`, `a1b2c3d` | Commits do not exist in git; actual merge commit is `2f6ece9` | `evidence_v2/runs/git_tags_and_commits.txt` | **MISMATCH** |
| **PR 3 Commits (Security Hardening)** | `d4e5f6a`, `b7c8d9e` | Commits do not exist in git; actual merge commit is `35fe96e` | `evidence_v2/runs/git_tags_and_commits.txt` | **MISMATCH** |
| **PR 4 Commits (Deploy Hygiene)** | `e8f9a0b`, `c1d2e3f` | Commits do not exist in git; actual merge commit is `7e6921c` | `evidence_v2/runs/git_tags_and_commits.txt` | **MISMATCH** |
| **Antigravity Brain Session Hash [E-064]** | `7c5f4bd3` | IDE Brain `7c5f4bd3-0763-4314-b35e-629728b7c498` recovered; not a git commit | `evidence_v2/runs/git_tags_and_commits.txt` | **MATCH** |
| **Total Git Commit Count** | ~240 commits | 244 commits (`--all`), 241 on HEAD | `evidence_v2/runs/git_commit_counts.txt` | **MATCH** |
| **Alembic Total Migrations** | 16 migrations | 16 migrations (`001` through `a1b2c3d4e5f6`) | `evidence_v2/runs/alembic_history.txt` | **MATCH** |
| **Alembic Head Revision ID** | `a1b2c3d4e5f6` | `a1b2c3d4e5f6` | `evidence_v2/runs/alembic_history.txt` | **MATCH** |
| **PostgreSQL Audit Trigger Name [E-056]** | `trg_prevent_decision_audit_logs_mutation` | `trg_audit_logs_no_update` and `trg_audit_logs_no_delete` | `evidence_v2/runs/audit_trigger_verification.txt` | **MISMATCH** |
| **PostgreSQL Audit Trigger ERRCODE** | Custom exception ERRCODE implied | Default PL/pgSQL `P0001` (`raise_exception`); no custom SQLSTATE | `evidence_v2/runs/audit_trigger_verification.txt` | **MISMATCH** |
| **Database TRUNCATE Prevention on Audit Logs** | Immutable append-only enforced | TRUNCATE not guarded by trigger (FOR EACH ROW does not fire); app DB role owns table and retains TRUNCATE | `evidence_v2/runs/audit_trigger_verification.txt` | **MISMATCH** |
| **Backend Pytest Tests Collected** | 889 tests | 889 tests collected (across 90 test files) | `evidence_v2/runs/pytest_run.txt` | **MATCH** |
| **Backend Pytest Passed Tests [E-065]** | 884 passed | 884 passed | `evidence_v2/runs/pytest_run.txt` | **MATCH** |
| **Backend Pytest Xfailed Tests [E-065]** | 5 xfailed (ALG-01 Yen Pareto) | 5 xfailed (in `test_planner_pareto.py`) | `evidence_v2/runs/pytest_run.txt` | **MATCH** |
| **Backend Pytest Failed Tests** | 0 failed | 0 failed | `evidence_v2/runs/pytest_run.txt` | **MATCH** |
| **PostgreSQL Pytest Marker (`pytest -m postgres`)** | 184 postgres tests cited in tag freeze-p2 | 0 tests marked `postgres` (889 deselected); CI runs with `DATABASE_URL` rather than marker | `evidence_v2/runs/pytest_run.txt` | **NOT RERUN** |
| **Frontend Vitest Passed Tests [E-066]** | 352 passed (26 test files) | 359 passed (26 test files) | `evidence_v2/runs/frontend_vitest_and_build.txt` | **MISMATCH** |
| **Frontend TypeScript Type Check [E-066]** | 0 errors | 0 errors (`npx tsc --noEmit` clean) | `evidence_v2/runs/frontend_vitest_and_build.txt` | **MATCH** |
| **Frontend Production Build Route Count [E-066]** | 40 routes | 39 routes (`/validation` removed in commit `f7aaff9`) | `evidence_v2/runs/frontend_vitest_and_build.txt` | **MISMATCH** |
| **Backend FastAPI Route Inventory Count** | 56-58 routes | 58 routes introspected from `app.routes` | `evidence_v2/runs/api_routes_inventory.txt` | **MATCH** |
| **Delay Classifier 14-Feature ROC-AUC [E-047]** | 0.7273 | 0.7273 | `evidence_v2/runs/metric_scripts_rerun.txt` | **MATCH** |
| **Delay Classifier Best Single Feature AUC [E-046]**| 0.7289 (`scheduled_shipping_days`) | 0.7289 (`scheduled_shipping_days`) | `evidence_v2/runs/metric_scripts_rerun.txt` | **MATCH** |
| **Delay Classifier Mode Baseline AUC [E-046]** | 0.7095 (`shipping_mode`) | 0.7095 (`shipping_mode`) | `evidence_v2/runs/metric_scripts_rerun.txt` | **MATCH** |
| **Incremental Lift Bootstrap 95% CI [E-047]** | `[-0.0075, +0.0044]` | `[-0.0075, +0.0044]` (mean: -0.0016) | `evidence_v2/runs/metric_scripts_rerun.txt` | **MATCH** |
| **Feature Ablation AUC [E-048]** | 0.5007 | 0.5007 (drop: +0.2265) | `evidence_v2/runs/metric_scripts_rerun.txt` | **MATCH** |
| **ETA Quantile P10 Pinball Lift [E-052]** | -0.23% (loss: 0.1685) | -0.23% (loss: 0.1685 vs 0.1681 baseline) | `evidence_v2/runs/metric_scripts_rerun.txt` | **MATCH** |
| **ETA Quantile P50 Pinball Lift [E-052]** | -0.36% (loss: 0.5054) | -0.36% (loss: 0.5054 vs 0.5036 baseline) | `evidence_v2/runs/metric_scripts_rerun.txt` | **MATCH** |
| **ETA Quantile P85 Pinball Lift [E-052]** | -1.94% (loss: 0.2562) | -1.94% (loss: 0.2562 vs 0.2513 baseline) | `evidence_v2/runs/metric_scripts_rerun.txt` | **MATCH** |
| **ETA Test Coverage (Empirical Lane Quantiles) [E-054]**| P10: 32.85%, P50: 66.40%, P85: 100.00% | P10: 32.85%, P50: 66.40%, P85: 100.00% | `evidence_v2/runs/metric_scripts_rerun.txt` | **MATCH** |
| **Demand Forecasting AutoETS WAPE [E-050]** | 32.16% | 32.16% (across 79 qualified lanes) | `evidence_v2/runs/metric_scripts_rerun.txt` | **MATCH** |
| **Demand Forecasting SeasonalNaive Baseline [E-050]**| 44.02% | 44.02% | `evidence_v2/runs/metric_scripts_rerun.txt` | **MATCH** |
| **Demand Forecasting Relative Lift [E-050]** | +26.94% | +26.94% | `evidence_v2/runs/metric_scripts_rerun.txt` | **MATCH** |
| **Air Freight CO2 Factor [E-045]** | 602.0 g/t-km | 602.0 g/t-km | `evidence_v2/runs/emission_factors_audit.txt` | **MATCH** |
| **Road Freight CO2 Factor [E-045]** | 62.0 g/t-km | 62.0 g/t-km | `evidence_v2/runs/emission_factors_audit.txt` | **MATCH** |
| **Rail Freight CO2 Factor [E-045]** | 22.0 g/t-km | 28.0 g/t-km | `evidence_v2/runs/emission_factors_audit.txt` | **MISMATCH** |
| **Sea Freight CO2 Factor [E-045]** | 16.1 g/t-km | 8.0 g/t-km | `evidence_v2/runs/emission_factors_audit.txt` | **MISMATCH** |
| **GLEC Framework v3.2 Basis Citation** | Authoritative GLEC v3.2 table / WTW basis | In-code disclaimer: "basis not independently verified"; no table/region cited | `evidence_v2/runs/emission_factors_audit.txt` | **MISMATCH** |
| **LightGBM Early Stopping Log [E-051]** | `backend/eval/model_training_lightgbm.log` | Not present in git history, disk, or recycle bin | `evidence_v2/runs/git_deleted_files.txt` | **NOT RETAINED** |
| **Antigravity Full Audit Document [E-040]** | `ANTIGRAVITY_PROMPT_FULL_AUDIT.md` | Not present in git history, disk, or recycle bin | `evidence_v2/runs/git_deleted_files.txt` | **NOT RETAINED** |
| **Audit Document AUDIT.md [E-041]** | `backend/eval/AUDIT.md` | Recovered from Antigravity IDE brain `7c5f4bd3` | `evidence_v2/recovered/backend/eval/AUDIT.md` | **MATCH** |
| **Built-In Errors Audit Document [E-016..18]** | `md files/Built_In_Errors_Audit.md` | Recovered from external research directory | `evidence_v2/recovered/md files/Built_In_Errors_Audit.md` | **MATCH** |
| **Project Verified Reality Document [E-019]** | `md files/Project_Verified_Reality.md` | Recovered from external research directory | `evidence_v2/recovered/md files/Project_Verified_Reality.md` | **MATCH** |
| **Deleted Legacy Audit Report** | `AUDIT_REPORT.md` (deleted at `d09c2e9`) | Restored via `git show d09c2e9^:AUDIT_REPORT.md` | `evidence_v2/recovered/AUDIT_REPORT.md` | **MATCH** |
| **Deleted Legacy Completion Report** | `PROJECT_COMPLETION_REPORT.md` (deleted at `1bb3914`) | Restored via `git show 1bb3914^:PROJECT_COMPLETION_REPORT.md` | `evidence_v2/recovered/PROJECT_COMPLETION_REPORT.md` | **MATCH** |
| **Deleted Markdown Code Reports** | `md/comprehensive_code_report.md` (deleted at `f832b1f`) | Restored via `git show f832b1f^:...` | `evidence_v2/recovered/md/comprehensive_code_report.md` | **MATCH** |
| **Deleted Markdown Execution Reports** | `md/end_to_end_execution_report.md` (deleted at `f832b1f`) | Restored via `git show f832b1f^:...` | `evidence_v2/recovered/md/end_to_end_execution_report.md` | **MATCH** |
| **Deleted Markdown Master Reports** | `md/smarttrack_master_project_report.md` (deleted at `f832b1f`) | Restored via `git show f832b1f^:...` | `evidence_v2/recovered/md/smarttrack_master_project_report.md` | **MATCH** |
| **Total Audit Findings in Register** | 22 findings (`SEC-01..10`, `DEP-01..03`, `DOC-01..04`, `ML-01..04`, `ALG-01`) | Exactly 22 verified findings; 21 resolved, 1 documented limitation (ALG-01) | `evidence_v2/runs/findings_register_verification.txt` | **MATCH** |
| **Live Backend Deployment Verification [E-069]**| All 15 Phase 8 gates passed | All 15 gates passed against live Render backend; 0.46s latency | `evidence_v2/runs/live_health_verification.txt` | **MATCH** |

---

## Recovered Files & Supporting Evidence Mapping (Phase A Summary)

| Original / Cited File Path | Recovered Status | Source Authority | Supporting Evidence Tag(s) |
| :--- | :--- | :--- | :--- |
| `backend/eval/AUDIT.md` | **YES** | Antigravity IDE Brain storage (`7c5f4bd3-0763-4314-b35e-629728b7c498/AUDIT.md`) | `[E-041]`, `[E-064]` |
| `md files/Built_In_Errors_Audit.md` | **YES** | External research storage (`Downloads/Nexa Brain END _END research/`) | `[E-016]`, `[E-017]`, `[E-018]` |
| `md files/Project_Verified_Reality.md` | **YES** | External research storage (`Downloads/Nexa Brain END _END research/`) | `[E-019]` |
| `AUDIT_REPORT.md` | **YES** | Git commit `d09c2e9^:AUDIT_REPORT.md` | Legacy day-17 audit |
| `PROJECT_COMPLETION_REPORT.md` | **YES** | Git commit `1bb3914^:PROJECT_COMPLETION_REPORT.md` | Legacy release report |
| `md/comprehensive_code_report.md` | **YES** | Git commit `f832b1f^:md/comprehensive_code_report.md` | Inception technical dossier |
| `md/end_to_end_execution_report.md` | **YES** | Git commit `f832b1f^:md/end_to_end_execution_report.md` | Inception execution log |
| `md/smarttrack_master_project_report.md` | **YES** | Git commit `f832b1f^:md/smarttrack_master_project_report.md` | Inception master architecture |
| `backend/eval/FINAL_METRICS.md` | **YES** | Active repo (`backend/eval/FINAL_METRICS.md`) | `[E-045]`, `[E-046]`, `[E-047]`, `[E-048]`, `[E-050]` |
| `backend/eval/AUDIT2.md` | **YES** | Active repo (`backend/eval/AUDIT2.md`) | `[E-061]` |
| `backend/eval/LEAKAGE_AND_QUANTILE_AUDIT.md` | **YES** | Active repo (`backend/eval/LEAKAGE_AND_QUANTILE_AUDIT.md`) | `[E-046]`, `[E-047]`, `[E-052]` |
| `backend/eval/report.md` | **YES** | Active repo (`backend/eval/report.md` & `eval/report.md`) | Milestone report |
| `docs/FINAL_AUDIT_REPORT.md` | **YES** | Active repo (`docs/FINAL_AUDIT_REPORT.md`) | Final audit summary |
| `KNOWN_ISSUES.md` | **YES** | Active repo (`KNOWN_ISSUES.md`) | Known limitations dossier |
| `evidence/pr2/pinball_recomputation_results.json` | **YES** | Active repo (`evidence/pr2/` and `backend/evidence/pr2/`) | `[E-052]` |
| `evidence/pr2/delay_ablation_results.json` | **YES** | Active repo (`evidence/pr2/` and `backend/evidence/pr2/`) | `[E-046]`, `[E-047]`, `[E-048]` |
| `evidence/pr2/audit_revision_investigation.json` | **YES** | Active repo (`evidence/pr2/` and `backend/evidence/pr2/`) | `[E-047]`, `[E-052]` |
| `evidence/pr2/quantile_validity_results.json` | **YES** | Active repo (`evidence/pr2/` and `backend/evidence/pr2/`) | `[E-054]` |
| `evidence/pr2/alembic_heads.txt` | **YES** | Active repo (`evidence/pr2/alembic_heads.txt`) | `[E-043]`, `[E-044]`, `[E-056]` |
| `evidence/pr2/co2_backfill.txt` | **YES** | Active repo (`evidence/pr2/co2_backfill.txt`) | `[E-044]` |
| `evidence/pr2/full_pytest_summary.txt` | **YES** | Active repo (`evidence/pr2/full_pytest_summary.txt`) | Intermediate regression summary |
| `backend/evidence/phase8_verification_live.txt` | **YES** | Active repo (`backend/evidence/phase8_verification_live.txt`) | `[E-068]` |
| `backend/evidence/pr5/full_backend_pytest.txt` | **YES** | Active repo (`backend/evidence/pr5/full_backend_pytest.txt`) | `[E-065]` |
| `backend/evidence/pr5/full_frontend_vitest_and_build.txt` | **YES** | Active repo (`backend/evidence/pr5/full_frontend_vitest_and_build.txt`) | `[E-066]` |
| `backend/evidence/pr5/item18_phase8_verification.txt` | **YES** | Active repo (`backend/evidence/pr5/item18_phase8_verification.txt`) | `[E-069]` |
| `backend/eval/model_training_lightgbm.log` | **NO** | Uncommitted ephemeral log; absent across all git branches, OS recycle bin, and local disk | `[E-051]` (**NOT RETAINED**) |
| `ANTIGRAVITY_PROMPT_FULL_AUDIT.md` | **NO** | Absent across all git branches, OS recycle bin, and local disk | `[E-040]` (**NOT RETAINED**) |

---

## Detailed Mismatch and Discrepancy Register

### 1. PR Commit Hashes vs Git Merges
- **Report Claim:** Cites pull request commit hashes `9e7b231`, `f8c201a` (PR 1); `3c2d4e5`, `a1b2c3d` (PR 2); `d4e5f6a`, `b7c8d9e` (PR 3); `e8f9a0b`, `c1d2e3f` (PR 4).
- **Actual Git State:** None of these 8 commit SHAs exist in the repository object database (`git cat-file -t` returns fatal error). The report used synthetic or staging branch commit SHAs. The authentic merge commits on `main` are:
  - PR 1: `0b1f48e` (`fix(pr1): honesty and provenance baseline`)
  - PR 2: `2f6ece9` (`docs(evidence): add raw alembic heads, CO2 backfill, and pytest summary`)
  - PR 3: `35fe96e` (`feat(security): add audit log immutability triggers, SSE stream tickets, and copilot rate limits`)
  - PR 4: `7e6921c` (`fix(release): resolve Phase 5 release blockers and harden security`)

### 2. CO2 Emission Factors (Rail & Sea)
- **Report Claim:** RAIL = 22.0 g CO2e / t-km; SEA = 16.1 g CO2e / t-km (`REPORT.pdf` page 18 and `[E-045]`).
- **Actual Code & Migration:** In `backend/src/nexafreight/core/constants.py` and migration `20261029_1300_f7a8b9c0d1e2_backfill_glec_v3_co2_factors.py`:
  - `RAIL` = **28.0** g/t-km (mixed electric/diesel freight train average).
  - `SEA` = **8.0** g/t-km (deep-sea container shipping 5k-10k TEU average).
  - `AIR` = **602.0** g/t-km (matches).
  - `ROAD` = **62.0** g/t-km (matches).

### 3. GLEC Framework v3.2 Citation Basis
- **Report Claim:** Authoritative GLEC v3.2 factors with specific table provenance.
- **Actual In-Code Documentation:** `backend/src/nexafreight/core/constants.py` explicitly states:
  > *"Emission factors are specified using GLEC default intensity factors (basis not independently verified)"*
  No table number, region, or WTW (Well-to-Wheel) vs TTW (Tank-to-Wheel) basis is defined in the source code or migrations.

### 4. Database Audit Trigger & Immutability Enforcement
- **Report Claim:** Cites PostgreSQL trigger `trg_prevent_decision_audit_logs_mutation` preventing UPDATE and DELETE, and implies immutable audit logs.
- **Actual Migration SQL:**
  - Actual trigger names: `trg_audit_logs_no_update` and `trg_audit_logs_no_delete` (function: `prevent_audit_log_modification`).
  - ERRCODE: Default `P0001` (`raise_exception`); no custom SQLSTATE code is specified.
  - Immutability loophole: The app DB role owns `audit_logs`. `TRUNCATE` is neither revoked nor prevented by a trigger (row triggers do not fire on `TRUNCATE`).

### 5. Frontend Vitest Tests and Route Count
- **Report Claim:** 352 passed tests across 26 files; 40 compiled routes.
- **Actual Rerun:** 359 passed tests across 26 files (+7 tests added in source cache / cold start coverage); 39 compiled routes (`frontend/src/app/validation/page.tsx` was removed in commit `f7aaff9`).
