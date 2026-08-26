# AGENTS.md — Working Rules for AI Agents on NexaFreight

> **Binding for any AI coding agent working in this repository** (Arena.ai Agent Mode sessions, Claude Code, or human contributors). Read at the start of every session; follow without exception. The project owner edits this file at will — a change here changes agent behavior, no discussion required.
>
> **v0.3 — owner-supplied rule set adopted 2026-08-26** (§3 tightened by owner directive: no mock/fake/test values in the product — real data only), integrated with project-specific standing rules. Phases refer to `docs/BLUEPRINT.md` §13.

---

## 1. Phase-locked execution

Work **only** on the current phase/task the owner defines. Do not start, prep, or "helpfully" touch anything from a later phase, even if it seems related or efficient to bundle. If no phase/task is stated at session start, **ask** — don't pick one.

## 2. No silent substitutions

Never replace a specified library, framework, dataset, API, or model with an alternative because it's "easier," "more modern," or "faster to implement." The blueprint's stack choices (FastAPI, PostgreSQL, Leaflet/Chart.js vanilla JS, LightGBM, PuLP/CBC, AISStream/OpenSky/Open-Meteo/OSRM, HF Spaces + Neon) are the spec. If I believe an alternative is better, **STOP and propose it** — don't implement it.

## 3. No fake data in the product — REAL or CALIBRATED only

**Owner directive (2026-08-26): the product runs on real data only. No mock, fake, dummy, or placeholder values may ever appear in the running application.**

- Every product value must be `REAL` (live feed or published dataset), `DERIVED` (computed from real), `CALIBRATED` (constructed with every parameter citing a published source — `docs/BLUEPRINT.md` §4.3), or `PROJECTED` (model output).
- **Missing real data = stop and wait** (rule 4). Never substitute fake data to keep building.
- `FEED_MODE=mock` does NOT mean "fake data": it means the feed returns an honest **empty/not-connected** state. No invented numbers.
- The only permitted synthetic values are **unit-test fixtures** inside `backend/tests/` (testing "2+2=4" needs a known input — this is standard engineering hygiene and never ships in the product).

## 4. Missing requirement = stop and ask

If a task needs a credential, API key, schema, config value, or decision I don't have, **stop and ask**. Do not invent, guess, or default silently.

## 5. One phase, one confirmation

After completing a phase, summarize exactly: **(a)** what was built, **(b)** what was assumed, **(c)** what's mocked/incomplete. Wait for the owner's go-ahead before the next phase.

## 6. No scope creep in the name of "best practice"

Don't add extra abstraction layers, extra services, or "future-proofing" not asked for. Simplicity and adherence to spec beat cleverness.

## 7. Diff-level transparency

For any change to existing code, show **what changed and why** — not just the new file dumped in.

## 8. State reality, not optimism

If something is untested, unverified, or likely to break at scale, say so directly. Don't report "done" unless actually verified working. Unverified items are listed as such in the phase report.

---

## 9. Cloud deployment & ML — additional rules

- **Separate config from code.** All API keys, endpoints, model paths, thresholds → `.env` / config files, never inline in source. No exceptions, no "just for now."
- **Real data path must be explicit.** The code path for live data (AIS, OpenSky, weather, OSRM) and the fallback/mock path must be clearly separated and switchable via a config flag (e.g., `FEED_MODE=live|replay|mock`) — never silently merged. Feed status is always visible in the UI.
- **Model versioning is mandatory.** Every model artifact (e.g., the LightGBM quantile ETA model) is saved with a version tag plus the training-data snapshot and parameters it came from — a `models/registry/` manifest, no exceptions. Never overwrite a working model silently.
- **Reproducible environment.** `requirements.txt` pinned to exact versions (`==`) before deployment. Dev may use ranges; deploy freezes them.
- **Fail loud, not silent.** Backend errors (API timeout, missing telemetry, model load failure) surface as visible errors/logs — never swallowed and replaced with a default/mock value. (UX corollary: the *operator UI* shows an honest degraded-state banner; it doesn't crash.)
- **Resource and cost boundaries stated upfront.** Before any deploy: expected request volumes, rate limits (AISStream, OpenSky 4,000 credits/day, Groq free tier, HF Spaces CPU), and cost implications ($0 target) — stated before, not discovered after.
- **Auth and secrets never touch the repo.** No API keys, tokens, or credentials committed to GitHub, even temporarily "to test." `.env` + `.gitignore` from commit one.
- **Staging before prod.** Any live-data integration is validated against a staging/test run (local or staging Space + recorded replay) before wiring into the main deployed app.
- **Rollback plan exists before deploy.** Git tag per phase + Docker image tag + Neon restore point; the revert steps are stated before each push to production.

---

## 10. Project-specific standing rules

- **SOPs, tariffs, thresholds, and business rules are DATA, never code** — versioned rows with effective dates (current seed `docs/inputs/sop_seed_values.md` is a **v0.1 draft**; the owner's ongoing real-world SOP research will revise them; updating rules = data edit, zero engine code).
- `docs/BLUEPRINT.md` is the approved plan; deviations get a dated note in the blueprint before merging deviating code.
- Raw datasets stay in `data/raw/` (git-ignored); only small documented derivatives are committed.
- Model training uses time-based splits only; no leaked features; honest backtest vs baseline.
- Feature branches; `main` stays deployable; CI green before merge; Alembic for schema changes.
- AI recommends, humans decide: no autonomous cost-incurring actions; every decision has an approval trail (who/when/why + SOP version).
- Operator UI must work on mobile. Destructive actions require confirmation.

---

## 11. Owner's additional rules *(add yours below — delete this note)*

11.1.

11.2.

11.3.
