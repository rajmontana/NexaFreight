# NexaFreight Control Tower

An autonomous multimodal logistics intelligence platform and real-time decision-support system. NexaFreight coordinates global supply chain operations across ocean shipping, air cargo, rail freight, and road haulage through real-time telemetry tracking, predictive machine learning, multiobjective route optimization, carbon emission accounting, and tamper-resistant audit logging.

## Overview

Modern international supply chains coordinate cargo through fragmented tracking silos, delayed Electronic Data Interchange (EDI) batches, and reactive operational management. When chokepoints like the Suez Canal or Panama Canal encounter disruptions, dispatchers often spend days manually assessing reroutes and calculating punitive demurrage costs.

NexaFreight provides an end-to-end, automated operational control loop:
* **Ingestion and Normalization:** Continuously collects global maritime AIS transponders, aviation ADS-B flight feeds, and road network geometries.
* **Continuous State Estimation:** Uses great-circle geodesic dead-reckoning and sliding-window entity caches to track assets and trace explicit data provenance (REAL, CALIBRATED, SIMULATED, DERIVED).
* **Automated Disruption Detection:** Monitors port anchorage congestion via spatial Kernel Density Estimation, canal closures, geofence breaches, and cross-track drift.
* **Multimodal Multiobjective Optimization:** Solves exact Multi-Objective Shortest Path (MOSP) problems across Sea, Rail, Road, and Air networks, balancing financial cost, transit duration, and GLEC v3.2 CO2 emissions.
* **Human-in-the-Loop Attestation:** Surfaces disruption mitigation options (Accept, Divert, Shift) in an interactive trade-off drawer for operator approval.
* **Cryptographic Immutability:** Enforces append-only triggers and cryptographic hash chains on PostgreSQL decision ledgers to prevent unauthorized modification or deletion.

## Architecture and Tech Stack

The platform is designed as a decoupled, multi-tier system separating high-performance geospatial visualization from asynchronous API orchestration, analytical graph solvers, and transactional persistence.

```mermaid
flowchart TD
    UI[Next.js 16 Tactical Globe]
    Proxy[Next.js API Route Proxy]
    API[FastAPI Control Tower]
    DB[(PostgreSQL / SQLite)]
    Worker[AIS & Telemetry Workers]
    Engine[MOSP & ML Predictive Engines]

    UI --> Proxy
    Proxy --> API
    Worker --> DB
    API --> DB
    API --> Engine
    API -.-> UI
```

### Core Technologies and Libraries

#### Frontend
* **Framework:** Next.js 16.4 (App Router) with React 19.2 and TypeScript 5
* **Styling:** Tailwind CSS 4 with Framer Motion for tactical HUD micro-interactions
* **Geospatial & Visualizations:** MapLibre GL 6.16, React-Map-GL 8.1, HTML5 Canvas Quadtree renderer, Recharts 3.10, and Lucide React icons
* **Testing:** Vitest 2.1 with full React component test suite

#### Backend and API Orchestration
* **Runtime:** Python 3.11+
* **Framework:** FastAPI 0.115 with Starlette and AnyIO asynchronous event loop
* **Server:** Uvicorn 0.30
* **Data Validation:** Pydantic 2.9 and Pydantic-Settings 2.5
* **Task Scheduling:** APScheduler 3.10 and background asyncio workers
* **Authentication:** OAuth2 with JWT (python-jose 3.3) and Passlib bcrypt password hashing

#### Database and Persistence
* **Engines:** PostgreSQL 16 (production cloud via Neon or local container) and SQLite (local testing and offline development)
* **ORM:** SQLAlchemy 2.0 with asyncpg (PostgreSQL) and aiosqlite (SQLite)
* **Migrations:** Alembic 1.13 with multi-dialect support and trigger migrations

#### Operations Research, ML and Analytics
* **Routing Solvers:** NetworkX 3.6, SeaRoute 1.4, OpenRouteService 2.3, Shapely 2.0, GeoPy 2.4, GeographicLib 2.1
* **Predictive ML:** LightGBM 4.5, Scikit-learn 1.9, Optuna 4.0, SHAP 0.46
* **Time-Series Forecasting:** StatsForecast 1.7 (AutoETS 13-week horizon)
* **Data Processing:** NumPy 2.4, Pandas 2.3, PyArrow 25.0, DuckDB 1.1

#### AI Copilot
* **Inference:** Google Generative AI (Gemini 1.5/2.5) with local fallback to Ollama (Llama 3.1)

#### Containerization and Infrastructure
* **Containers:** Hardened non-root Docker images (UID 10001) for backend and frontend
* **Orchestration:** Docker Compose
* **Cloud Blueprint:** Render web service specification (`render.yaml`)

## Key Features

### Geospatial Command Center
* Tactical 60 FPS globe capable of streaming and rendering thousands of global maritime vessels, commercial aircraft, rail corridors, and road shipments simultaneously.
* Single-use ephemeral stream tickets providing secure Server-Sent Events (SSE) connections for live vessel positions without exposing long-lived bearer tokens in URL query strings.
* Interactive filters by transport mode, carrier status, cargo sensitivity (Hazmat, Refrigerated, Standard), and risk tier.

### Multimodal Route Optimizer
* Schedule-aware multigraph routing supporting intermodal transfers across Sea, Rail, Road, and Air.
* Exact Multi-Objective Shortest Path (MOSP) Pareto optimization balancing financial transit cost (USD), duration (hours), and carbon footprint (kg CO2).
* Real-world transshipment delay modeling, port dwell curves, and schedule headways.

### Predictive Delay and Risk Modeling
* LightGBM classifier predicting transit delay probability before departure.
* Historical lane quantile regression estimating P10, P50, and P85 residual delay bounds.
* Automated ETS time-series forecasting for port volume and weekly demand fluctuations.

### Disruption Management Desk
* Real-time geofence collision detection for chokepoints and canals.
* Automated disruption generation with impact quantification (demurrage escalation, contractual SLA penalties, and schedule deviation).
* Three-way prescriptive mitigation engine: Accept Delay, Divert to Alternative Corridor, or Mode Shift to Expedited Rail/Air.

### Environmental Accounting and Governance
* Standardized carbon emission factors compliant with GLEC Framework v3.2 and ISO 14083.
* Operational demurrage calculation applying free-time thresholds and stepped daily tariff schedules.
* Cryptographically chained audit ledger with database-level immutability triggers (`BEFORE TRUNCATE` and update prevention) to ensure regulatory traceability.

## Project Structure

```
NexaFreight/
├── backend/
│   ├── alembic.ini                   # Alembic database migration config
│   ├── Dockerfile                    # Container definition for backend
│   ├── Makefile                      # Backend tasks and shortcuts
│   ├── requirements.txt              # Pinned Python package dependencies
│   ├── migrations/                   # Linear database schema revisions
│   │   └── versions/                 # 17 versioned migration scripts
│   ├── scripts/                      # Fleet activation, seeders, and benchmarks
│   ├── src/nexafreight/              # Core application package
│   │   ├── adapters/                 # AIS feeds, OSRM routing, LLM drivers
│   │   ├── api/                      # REST routers and request schemas
│   │   │   └── routes/               # Modular route controllers
│   │   ├── core/                     # Logging, security, and parameter caches
│   │   ├── ml/                       # Model registries, feature encoders, ETA estimators
│   │   ├── models/                   # SQLAlchemy relational ORM entities
│   │   ├── services/                 # Disruption detection, MOSP planner, SLA engine
│   │   ├── workers/                  # AIS receiver and dead-reckoning interpolator
│   │   ├── config.py                 # Pydantic-settings environment schema
│   │   ├── database.py               # Async engine and session factory
│   │   └── main.py                   # FastAPI lifespan application entrypoint
│   └── tests/                        # Comprehensive test suite (unit and integration)
├── docker/
│   ├── Dockerfile.backend            # Production non-root backend image
│   ├── Dockerfile.frontend           # Multi-stage Next.js frontend image
│   └── entrypoint.backend.sh         # Migration lock and startup wrapper
├── docs/                             # Parameter tables, onboarding, and audit docs
├── eval/                             # Empirical benchmarks and reference metrics
├── frontend/
│   ├── package.json                  # Node.js dependencies and scripts
│   ├── tsconfig.json                 # TypeScript compiler configuration
│   ├── vitest.config.ts              # Unit and component test configuration
│   ├── public/                       # Static assets, marks, and web manifests
│   └── src/
│       ├── app/                      # Next.js App Router (pages and API proxies)
│       │   ├── alerts/               # Alert feed and reroute trade-off desk
│       │   ├── insights/             # KPI bands, CO2 trends, demurrage charts
│       │   ├── login/                # Authentication interface
│       │   ├── shipments/            # Shipment dossier and milestone tracking
│       │   └── page.tsx              # Main command center and interactive map
│       ├── components/               # Tactical globe, overlays, and modal views
│       ├── hooks/                    # Live SSE position hooks and query state
│       └── lib/                      # Client SDK, navigation math, GLEC utilities
├── docker-compose.yml                # Local container stack with PostgreSQL
├── render.yaml                       # Cloud deployment configuration
├── Makefile                          # Unified build and test automation
└── LICENSE                           # MIT open source license
```

## Prerequisites and Installation

### System Prerequisites
* **Python:** Version 3.11 or higher
* **Node.js:** Version 20.x or higher with npm
* **Docker:** Docker Engine 24+ and Docker Compose (recommended for local PostgreSQL)
* **Git:** Version 2.30+

### Clone the Repository
```bash
git clone https://github.com/rajmontana/NexaFreight.git
cd NexaFreight
```

### Environment Configuration
The backend requires environment variables to start. Copy `.env.example` to create your local `.env`:

```bash
cp backend/.env.example backend/.env
```

Key configuration variables defined in the system schema:

| Variable | Description | Default / Example |
| :-- | :-- | :-- |
| `ENVIRONMENT` | Runtime mode (`development`, `test`, `production`) | `development` |
| `DATABASE_URL` | Async connection string for PostgreSQL | `postgresql+asyncpg://user:pass@host:5432/db` |
| `DATABASE_PATH` | Path to local SQLite file when `DATABASE_URL` is omitted | `./data/nexafreight.db` |
| `JWT_SECRET` | Cryptographic secret for signing bearer tokens | Minimum 32-character random string |
| `JWT_ALGORITHM` | Algorithm for token signatures | `HS256` |
| `JWT_EXPIRY_MINUTES` | Lifetime of authentication tokens | `60` |
| `ENABLE_AIS_LISTENER` | Toggles the background AIS receiver worker | `true` |
| `ENABLE_POSITION_INTERPOLATOR` | Toggles the dead-reckoning interpolator | `true` |
| `USE_LIVE_AIS` | Selects live stream (`true`) or replay data (`false`) | `true` |
| `AISSTREAM_API_KEY` | Optional API key for live AISStream WebSocket | Empty string |
| `GEMINI_API_KEY` | Optional API key for Google Gemini copilot | Empty string |
| `OLLAMA_BASE_URL` | Endpoint for local LLM inference | `http://localhost:11434` |
| `ORS_API_KEY` | Optional key for OpenRouteService road routing | Empty string |

### Backend Setup
```bash
cd backend
python -m venv .venv

# On Linux / macOS:
source .venv/bin/activate

# On Windows PowerShell:
.\.venv\Scripts\Activate.ps1

pip install --upgrade pip
pip install -r requirements.txt
```

### Database Initialization
Run database migrations using Alembic:
```bash
python -m alembic upgrade head
```

Optionally seed initial network parameters and demo fleet:
```bash
python scripts/activate_and_seed_positions.py
```

### Frontend Setup
```bash
cd ../frontend
npm install
```

Create a `frontend/.env.local` file with the backend connection origin:
```bash
NEXT_PUBLIC_BACKEND_ORIGIN=http://localhost:8000
```

## Usage and Execution

### Running with Docker Compose
The complete multi-container stack (PostgreSQL, FastAPI backend, and Next.js frontend) can be launched with a single command:
```bash
docker compose up --build
```
* **Frontend UI:** Available at `http://localhost:3000`
* **Backend API:** Available at `http://localhost:8000`
* **API Documentation:** Available at `http://localhost:8000/docs` (in non-production environments)

### Running Locally for Development

#### Terminal 1: Backend API
```bash
cd backend
uvicorn nexafreight.main:app --host 127.0.0.1 --port 8000 --app-dir src --reload
```

#### Terminal 2: Frontend Client
```bash
cd frontend
npm run dev -- -p 3000
```

Alternatively, invoke targets from the project `Makefile`:
```bash
make dev-backend   # Launches backend API server
make dev-frontend  # Launches frontend development server
```

### Running Test Suites

#### Backend Test Suite (Pytest)
```bash
cd backend
pytest -q
```
Runs comprehensive unit tests, API route validation, database trigger verification, and algorithmic tests.

#### Frontend Test Suite (Vitest and Typecheck)
```bash
cd frontend
npx tsc --noEmit
npx vitest run
```
Verifies TypeScript contract compliance, utility functions, state stores, and component rendering.

#### Run All Automated Tests
```bash
make test
```

## API Reference

The FastAPI backend exposes modular REST endpoints alongside real-time streaming channels.

### System and Health Probes
* `GET /health`: Comprehensive health status including database connectivity and worker metrics
* `GET /healthz`: Fast liveness check returning HTTP 200
* `GET /readyz`: Readiness check ensuring persistence layers respond within 2 seconds

### Authentication
* `POST /auth/register`: Create a new user account (Operator or Admin)
* `POST /auth/login`: Exchange email and password credentials for an OAuth2 JWT access token
* `POST /auth/refresh`: Refresh an active authentication session
* `GET /auth/me`: Retrieve current authenticated profile and assigned role permissions

### Shipments and Telemetry
* `GET /shipments`: List shipments with query filters for origin, destination, carrier, and status
* `GET /shipments/{id}`: Detailed shipment dossier including full leg hierarchy, milestones, and sensor readings
* `GET /shipments/{id}/predict`: Retrieve calibrated delay predictions and lane quantiles for a shipment

### Disruptions and Rerouting
* `GET /disruptions`: List detected active disruptions across maritime and inland corridors
* `GET /disruptions/{id}`: Inspect specific disruption impacts, affected cargo lists, and estimated delay hours
* `POST /disruptions/{id}/reroute`: Generate Pareto-optimal reroute alternatives (Accept, Divert, Shift)

### Decisions and Governance
* `GET /decisions`: Retrieve past disruption decisions and ledger entries
* `POST /decisions/{id}/approve`: Operator approval committing a reroute to the immutable audit log
* `POST /decisions/{id}/reject`: Operator rejection recording rationale to the ledger

### Geospatial and Real-Time Feeds
* `GET /map/positions`: Snapshot of current vessel, aircraft, train, and truck coordinates
* `POST /map/stream-ticket`: Generate an ephemeral single-use ticket for WebSocket/SSE access
* `GET /map/positions/stream`: Server-Sent Events (SSE) feed streaming continuous positions
* `GET /map/corridors`: Return GeoJSON geometries for international shipping lanes and rail lines
* `GET /map/ports`: List major global ports, geographic coordinates, and current congestion indices

### Route Planning and Multimodal MOSP
* `POST /plan/route`: Execute multiobjective timetable pathfinding between origin and destination

### Analytics and Predictive ML
* `GET /analytics/kpis`: High-level operational metrics (active shipments, on-time rate, total carbon emissions)
* `GET /analytics/co2`: Detailed GLEC v3.2 carbon emission breakdown by transport mode
* `GET /analytics/demurrage`: Accrued and projected demurrage liabilities
* `POST /predict/delay`: Score delay probability for custom shipment parameter payloads
* `POST /predict/eta`: Evaluate empirical ETA residual bounds (P10, P50, P85)

### AI Operations Copilot
* `POST /copilot/query`: Natural language query interface with automated schema tool execution
* `POST /copilot/explain`: Request step-by-step reasoning for a specific disruption reroute proposal

## Contributing and Governance

Contributions to NexaFreight are welcome. Please adhere to the following workflow:

1. **Branch Hygiene:** Create focused feature or fix branches from `main` using standard naming conventions (`feat/feature-name`, `fix/issue-name`).
2. **Commit Convention:** Use Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`).
3. **Quality Gates:** Before submitting a pull request, ensure all tests pass cleanly:
   * Backend suite: `cd backend && pytest -q`
   * Frontend typecheck and unit tests: `cd frontend && npx tsc --noEmit && npx vitest run`
4. **Secret Scanning:** Never commit credentials, `.env` files, or production private keys. All pull requests undergo automated secret checks.

## License

This project is licensed under the terms of the MIT License. See the [LICENSE](LICENSE) file for complete details.
