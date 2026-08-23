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

---

## Strict Execution Phases (In Order)

### Phase 0 — Verification (Prerequisite)
1. `git status` and `git log --oneline -20`
2. `tree -L 3 -I 'node_modules|.git|__pycache__|venv'`
3. `ls -la backend/*.pkl backend/*.joblib`
4. Inspect model `feature_names_in_`
5. Verify model name vs "delay_prediction_model.pkl (96.5% ROC-AUC)"
6. Confirm PostgreSQL row count (~172,765)
7. Inspect full `backend/app.py`
8. Temporal leakage check (port congestion, demurrage, outcome features)

### Phase 1 — Auth (Priority 1)
- Add login page (email/password, JWT token issuance)
- Protect every dashboard route and every API route behind auth middleware
- Verify rejection of unauthenticated requests

### Phase 2 — Real Data (Priority 2)
- Replace random/simulated values with real PostgreSQL SQL queries and aggregations

### Phase 3 — Real ML (Priority 3)
- Load verified model at startup
- Feed exact 47-feature vector (no silent zeroing)
- Serve real predictions and SHAP values

### Phase 4 — SPC & Compliance Math (Priority 4)
- Compute real X-bar, UCL, LCL, DPMO from actual database lead-time data

### Phase 5 — Cloud Deployment (Only after 1–4 verified)
- Docker containerization, environment variables, cloud deployment (Vercel, Render/Railway, Supabase/Neon), git-push-to-deploy

---

## Explicit Boundaries & Prohibitions
- Do NOT propose switching frameworks (Next.js + Tailwind is locked; React + MUI is not happening).
- Do NOT propose or build any item from "industry benchmarking / improvisations" (IoT sensors, carbon arbitrage, autonomous workflows, probabilistic ETA bands, carrier scorecards) until after Phase 5.
- Do NOT retrain or modify the ML pipeline outside of the verified leakage check.
- If a blocker or mismatch is encountered, STOP and report it immediately — do not route around it silently.
