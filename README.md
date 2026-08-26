# NexaFreight Control Tower

**Multi-modal logistics control tower** — live shipment visibility (ocean / air / road),
AI-assisted disruption decisions with human approval, operations-research routing,
financial exposure tracking, forecasting, and ESG/carbon compliance.

> **Status: Phase 0 of 6 (foundation).** Full plan: [`docs/BLUEPRINT.md`](docs/BLUEPRINT.md) ·
> Agent working rules: [`AGENTS.md`](AGENTS.md)

---

## What this is (honest version)

A control tower for a realistic freight operation built on a strict **data-honesty model**
— every number on every screen carries its provenance:

| Label | Meaning | Examples |
|---|---|---|
| `REAL` | From a live external feed or published dataset | AIS vessel positions, ADS-B flights, weather, 180K real order lines (DataCo, CC BY 4.0), IMF chokepoint transits, UNCTAD port dwell times, published port-disruption records |
| `DERIVED` | Computed from real data | Port congestion index, great-circle distances, lane statistics |
| `CALIBRATED` | Constructed, every parameter citing a published source | Execution events/dwell, rate cards, cargo-to-vessel bindings |
| `PROJECTED` | Model output | ETA quantiles, delay risk, demand forecasts |

The AI **recommends** (ranked options with full cost math, grounded in the SOP rulebook);
humans **decide** (role-based approval limits, immutable audit trail).

## Roadmap (phases, acceptance criteria in the blueprint §13)

| Phase | Scope | Status |
|---|---|---|
| 0 | Repo hygiene, package structure, CI, config/auth core, honest health | ✅ done |
| 1 | Domain schema, DataCo ingestion, calibrated execution layer, SOP seed | ⬜ |
| 2 | AIS/OpenSky ingestion, ghost binding, live map | ⬜ |
| 3 | ETA quantile model, rule engine, alert inbox + approvals | ⬜ |
| 4 | OR decision engine, financial dashboards | ⬜ |
| 5 | Forecasting, ESG, free-tier cloud deploy (HF Spaces + Neon) | ⬜ |

## Quick start (local)

```bash
cp .env.example .env            # set JWT_SECRET (openssl rand -base64 48)
docker compose up --build       # API on http://localhost:8000, Postgres 16
```

Or without Docker:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn backend.app.main:app --reload
```

## Development

```bash
ruff check .     # lint (CI-enforced)
pytest           # test suite (CI-enforced)
```

CI runs on every push/PR (`.github/workflows/ci.yml`): lint → tests → secret scan.

## Stack (fixed by blueprint §4/AGENTS.md — no substitutions)

FastAPI · PostgreSQL 16 (+SQLite for fast tests) · SQLAlchemy 2 · Alembic ·
Leaflet/Chart.js vanilla-JS portal · LightGBM (Phase 3) · PuLP/CBC (Phase 4) ·
AISStream.io + OpenSky + Open-Meteo + OSRM (Phase 2) · Hugging Face Spaces + Neon (Phase 5).

## Data sources

See `docs/BLUEPRINT.md` §4 (strategy, licenses) and §4.5 (dataset audit) and
`data/raw/README.md`. Raw files are **not** committed; ingestion pipelines emit
small documented derivatives.

## License

MIT (code). Datasets keep their upstream licenses (DataCo CC BY 4.0; IMF/World Bank
terms; UNCTAD terms; Verschuur et al. cited, not redistributed).
