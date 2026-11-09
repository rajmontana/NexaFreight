# NexaFreight: Developer Onboarding & Architecture Guide 🚢✈️🚛

Welcome to **NexaFreight**! This onboarding guide is designed specifically for engineers and data scientists joining the project who understand basic Python and Machine Learning, but may not be familiar with modern web development frameworks.

---

## 1. Project Overview

- **Mission:** Autonomous multimodal logistics control tower providing real-time visibility and decision automation across ocean shipping, air cargo, freight trains, and trucking fleets.
- **Languages:** Python 3.11 (Backend), TypeScript (Frontend).
- **Core Frameworks:**
  - **Backend:** FastAPI, SQLAlchemy ORM, Pydantic, LightGBM, Google Gemini.
  - **Frontend:** Next.js (React), TailwindCSS, MapLibre GL.
  - **Persistence:** PostgreSQL (Production / Neon Serverless) & SQLite (Local Development).

---

## 2. Essential Web-Dev Glossary for Python & ML Engineers

When navigating the codebase, you will encounter terms common in web engineering. Here is what they mean in plain English:

| Term | Everyday Analogy | What It Does in NexaFreight |
|---|---|---|
| **Router** | A traffic switchboard | In FastAPI (`backend/src/nexafreight/api/`), a Router listens for incoming web requests and directs them to the right Python function based on the URL path. |
| **Endpoint** | A specific service counter | A web address and HTTP verb (like `GET /api/v1/shipments` or `POST /api/v1/decisions/approve`) that external programs or browser screens call to fetch data or trigger actions. |
| **ORM (Object-Relational Mapping)** | Automatic database translator | SQLAlchemy maps SQL database tables directly into ordinary Python classes (`Shipment`, `Order`, `Vehicle`), letting you write `shipment.status = "ACTIVE"` instead of raw SQL queries. |
| **Migration** | Version control for database tables | A script that safely creates, modifies, or deletes database columns as the application evolves over time without deleting existing data. |
| **SSE (Server-Sent Events)** | A live radio broadcast | A persistent, one-way HTTP stream that pushes real-time ship GPS coordinates and incident alerts from Python directly into the browser screen without the browser having to poll. |
| **Component** | A reusable UI Lego brick | In React/Next.js (`frontend/src/components/`), a Component is a modular visual piece (e.g. `Map.tsx`, `AlertCard.tsx`) that combines HTML layout, styling, and interactive behavior. |
| **Hook** | A reactive state manager | A React helper function (prefixed with `use`, such as `useShipmentTracker`) that manages browser memory state, timers, and live SSE event subscriptions. |

---

## 3. The 6 Architectural Layers

The scoped codebase is structured into 6 clear functional layers:

```
┌────────────────────────────────────────────────────────┐
│ 1. Frontend UI & Pages (`frontend/src/app/`, `components/`)
│    The interactive 3D globe, alert incident room, and KPI dashboards.
├────────────────────────────────────────────────────────┤
│ 2. Frontend State & Hooks (`frontend/src/hooks/`, `lib/`)
│    Client-side stores, real-time SSE stream consumers, and utilities.
├────────────────────────────────────────────────────────┤
│ 3. API & Route Endpoints (`backend/src/nexafreight/api/`, `main.py`)
│    FastAPI request parsing, authentication checks, and response dispatch.
├────────────────────────────────────────────────────────┤
│ 4. Core Domain Services (`backend/src/nexafreight/services/`)
│    Rerouting algorithms, ETA prediction, cost calculation, and Copilot.
├────────────────────────────────────────────────────────┤
│ 5. Data Models & Persistence (`backend/src/nexafreight/models/`, `database.py`)
│    SQLAlchemy ORM models, status enums, and the DecisionOutcome audit ledger.
├────────────────────────────────────────────────────────┤
│ 6. Simulation & Live Feeds (`backend/src/nexafreight/adapters/`, `simulation/`)
│    Satellite AIS maritime streams, weather adapters, and synthetic fleet engines.
└────────────────────────────────────────────────────────┘
```

---

## 4. The 6-Step Guided Tour

Follow these files in order to understand how a customer shipment flows through the system:

1. **Backend Boot & API Gateway**  
   - `backend/src/nexafreight/main.py`: The entry point that boots FastAPI, sets up CORS security, connects to the database, and registers all API routes.
   - `backend/src/nexafreight/database.py`: Handles connection pooling and seamless automatic fallback from PostgreSQL to SQLite.
2. **Data Models & The Audit Black Box**  
   - `backend/src/nexafreight/models/shipment.py`: The digital cargo passport tracking physical goods in transit.
   - `backend/src/nexafreight/models/decision_outcome.py`: The audit black box that freezes what the AI predicted versus what actually happened in reality.
3. **Real-time Maritime & Vehicle Feeds**  
   - `backend/src/nexafreight/adapters/feed/aisstream.py`: Ingests live satellite AIS marine radio signals.
   - `backend/src/nexafreight/simulation/simulator.py`: Synthesizes realistic vessel movements and dead-reckoning coordinates along ocean routes.
4. **Disruption Triage & Autonomous Rerouting**  
   - `backend/src/nexafreight/services/rerouting_service.py`: Computes 3 deterministic recovery options (Accept Delay, Port Divert, Modal Shift) when a canal or port is blocked.
   - `backend/src/nexafreight/services/cost_calculator.py`: Quantifies fuel costs, demurrage port penalties, and carbon emissions.
5. **AI Operations Copilot**  
   - `backend/src/nexafreight/services/copilot_service.py`: Resolves operations inquiries using Google Gemini grounded in live database state.
6. **Next.js Control Tower Command Center**  
   - `frontend/src/app/page.tsx`: The primary dashboard rendering the 3D globe and active crisis banners.
   - `frontend/src/app/alerts/page.tsx`: The incident room for reviewing and approving emergency reroute options.

---

## 5. Complexity Hotspots & Safety Guidelines

- **Rerouting Optimization (`rerouting_service.py`):** Balances multi-objective trade-offs (cost vs. time vs. CO2). Changes here directly affect calculated arrival estimates and demurrage liability.
- **Serverless Scale-to-Zero:** High-frequency GPS telemetry (every 5s) must be kept in in-memory caches or streamed directly over SSE. Do **not** write raw 5-second coordinates directly to SQL database tables, as this prevents cloud database engines from sleeping.
- **Graceful Fallbacks:** All database sessions must support auto-fallback to SQLite when the remote PostgreSQL instance is sleeping or unreachable.

