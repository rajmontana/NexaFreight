---
trigger: always_on
---

# SmartTrack Binding Project Rules

1. **What already exists — DO NOT REBUILD**
2. **No architecture changes without itemized approval**
3. **No fabricated or simulated data ever — fail loudly instead**
4. **No claims of "verified," "tested," "operational," or "fixed" without real shown command output**
5. **Feature schema is a contract, not a guess**
6. **Deviations get flagged BEFORE they happen, not narrated after**
7. **Every change ships as a small, reviewable commit**
8. **Auth is not optional and not deferred** — protect all dashboard and API routes
9. **If you're unsure, ask — do not fill the gap with something plausible**
10. **No new features until the current priority list is DONE and VERIFIED**

# Strict Execution Phases (In Order)
- **Phase 0 — Verification**: Confirm git status, directory tree, model artifacts, feature contract, model name/ROC-AUC verification, PostgreSQL rows, app.py, and temporal leakage check.
- **Phase 1 — Auth (Priority 1)**: Login page, JWT token issuance, protect every dashboard and API route behind auth middleware, verify unauthenticated rejection.
- **Phase 2 — Real Data (Priority 2)**: Replace random/simulated values with real PostgreSQL queries and aggregations.
- **Phase 3 — Real ML (Priority 3)**: Load verified model, pass exact feature vector (no silent zeroing), serve real predictions and SHAP values.
- **Phase 4 — SPC & Compliance Math (Priority 4)**: Compute real X-bar, UCL, LCL, and DPMO from actual database data.
- **Phase 5 — Cloud Deployment**: Containerize with Dockerfile, environment variables, deploy frontend/backend/DB, git-push-to-deploy.

# Explicit Boundaries & Prohibitions
- Do NOT propose switching frameworks (Next.js + Tailwind is locked; React + MUI is not happening).
- Do NOT propose or build any item from "industry benchmarking / improvisations" (IoT sensors, carbon arbitrage, autonomous workflows, probabilistic ETA bands, carrier scorecards) until after Phase 5.
- Do NOT retrain or modify the ML pipeline outside of the verified leakage check.
- If a blocker or mismatch is encountered, STOP and report it immediately — do not route around it silently.