# NexaFreight: Unified Reproducibility, Benchmark & Cloud Deployment Guide
### Complete Systems Engineering Runbook: From Clean Desktop Clone to Production Cloud Infrastructure

[![Live Control Tower](https://img.shields.io/badge/Production-Live%20Control%20Tower-00C853?style=for-the-badge&logo=vercel&logoColor=white)](https://nexafreight.vercel.app/)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/rajmontana/NexaFreight)
[![Quality Gate](https://img.shields.io/badge/Automated%20Tests-1%2C252%20Passed%20(100%25)-brightgreen?style=for-the-badge&logo=pytest&logoColor=white)](https://github.com/rajmontana/NexaFreight)
[![Backend Engine](https://img.shields.io/badge/Backend-FastAPI%20%7C%20AnyIO-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Frontend UI](https://img.shields.io/badge/Frontend-Next.js%2016.4%20%7C%20React%2019-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2016%20%7C%20Neon-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Security](https://img.shields.io/badge/Security-CIS%20Docker%20UID%2010001-blue?style=for-the-badge&logo=docker&logoColor=white)](https://www.cisecurity.org/)

---

## 🏛️ Academic Supervision, Institution & Authorship

This document establishes the **unified, non-repudiable engineering runbook** for the **Major Capstone Project Defense and Academic Systems Audit**:

- **Academic Institution:** **Motilal Nehru National Institute of Technology (MNNIT) Allahabad**  
- **Department:** Department of Mechanical Engineering (MED)  
- **Faculty Guide & Supervisor:** **Er. Mandeep Dhanda**, *Assistant Professor, Department of Mechanical Engineering (MED), MNNIT Allahabad*  
- **Project Engineering Team (Group 1):**
  - **Raj Kumar Merugu (Lead Systems Architect):** *ML/OR Architecture, Quantile Regressors, Multimodal Solvers, UI/UX Design, DevOps & GitHub CI/CD Lead (482 tests)*
  - **Shanmukh Dhyaneshwar Peela (Full-Stack Engineering Lead):** *Next.js 16.4 App Router, Leaflet Canvas Quadtree (60 FPS), FastAPI Core, REST APIs (361 tests)*
  - **R Rahul (Data Engineering & Telemetry Lead):** *AIS VHF ITU-R M.1371-5 Decoder, RTCA DO-260B ADS-B, 4-Stage Fallback, Redis Ring Buffer (248 tests)*
  - **Sanat Kumar Maurya (Systems Auditor & Project Manager):** *Technical Systems Audit (22 findings closed), WORM Immutability Triggers (P0001), ADRs (161 tests)*
- **Public Source Code Repository:** [`https://github.com/rajmontana/NexaFreight`](https://github.com/rajmontana/NexaFreight)
- **Production Cloud Deployment:** [`https://nexafreight.vercel.app/`](https://nexafreight.vercel.app/)
- **Audited Working Branches:** `main` / `hardening-final` (Verified Commits: `2e05a2b` / `a9477f1`)
- **Total Automated Quality Gate:** **1,252 Automated Tests Verified** (891 Backend Pytest + 361 Frontend Vitest + Docker Non-Root UID 10001 + Gitleaks Secret Clean)

---

## 📖 Table of Contents

1. [Executive Summary & Purpose of this Runbook](#1-executive-summary--purpose-of-this-runbook)
2. [Hardware, Operating System & Toolchain Prerequisites](#2-hardware-operating-system--toolchain-prerequisites)
3. [PART I: Step-by-Step Local Desktop Reproduction Protocol](#3-part-i-step-by-step-local-desktop-reproduction-protocol)
   - [Step 1: Clone Repository & Select Hardened Branch](#step-1-clone-repository--select-hardened-branch)
   - [Step 2: Architecture & Directory Orientation](#step-2-architecture--directory-orientation)
   - [Step 3: Backend Python Environment Setup](#step-3-backend-python-environment-setup)
   - [Step 4: Environment Variables (`.env`) Configuration](#step-4-environment-variables-env-configuration)
   - [Step 5: Database Migrations & Immutability Trigger Setup](#step-5-database-migrations--immutability-trigger-setup)
   - [Step 6: User Bootstrapping & Operational Fleet Seeding](#step-6-user-bootstrapping--operational-fleet-seeding)
   - [Step 7: Frontend Environment Setup](#step-7-frontend-environment-setup)
   - [Step 8: Automated Quality Gates Execution (1,252 Tests)](#step-8-automated-quality-gates-execution-1252-tests)
   - [Step 9: Running Specialized Empirical & Security Drills](#step-9-running-specialized-empirical--security-drills)
   - [Step 10: Starting Local Servers & Interactive Exploration](#step-10-starting-local-servers--interactive-exploration)
   - [Step 11: 6-Step Operational Demonstration ("Golden Path")](#step-11-6-step-operational-demonstration-golden-path)
   - [Alternative: 1-Command Docker Compose Setup](#alternative-1-command-docker-compose-setup)
4. [PART II: Research Paper Benchmark Reproduction (90 MOSP Instances)](#4-part-ii-research-paper-benchmark-reproduction-90-mosp-instances)
   - [Benchmark Overview: Martins vs MDA vs T-MDA](#benchmark-overview-martins-vs-mda-vs-t-mda)
   - [Running the 1,890 Timed Solver Trials](#running-the-1890-timed-solver-trials)
   - [Reproducing Pareto Frontier Visualizations](#reproducing-pareto-frontier-visualizations)
   - [Numerical Stability & Floating-Point Verification](#numerical-stability--floating-point-verification)
5. [PART III: Production Cloud Deployment Blueprint](#5-part-iii-production-cloud-deployment-blueprint)
   - [Cloud Architecture Topology](#cloud-architecture-topology)
   - [Step 1: Neon Serverless PostgreSQL 16 Deployment](#step-1-neon-serverless-postgresql-16-deployment)
   - [Step 2: Upstash Managed Redis 7 Deployment](#step-2-upstash-managed-redis-7-deployment)
   - [Step 3: Render FastAPI Container Deployment](#step-3-render-fastapi-container-deployment)
   - [Step 4: Vercel Edge Frontend Deployment](#step-4-vercel-edge-frontend-deployment)
   - [Step 5: Post-Deployment Smoke Testing & Production Verification](#step-5-post-deployment-smoke-testing--production-verification)
6. [PART IV: Production Security, Monitoring & Zero-Downtime Operations](#6-part-iv-production-security-monitoring--zero-downtime-operations)
7. [PART V: Troubleshooting & Frequently Asked Questions (FAQ)](#7-part-v-troubleshooting--frequently-asked-questions-faq)
8. [Formal Document Sign-Off & Endorsement](#8-formal-document-sign-off--endorsement)

---

## 1. Executive Summary & Purpose of this Runbook

This runbook is the **definitive, all-in-one technical manual** designed to enable any academic committee member, technical evaluator, or software engineer to independently reproduce every numerical result, algorithmic claim, automated test, and deployment architecture of the **NexaFreight Autonomous Logistics Control Tower**.

NexaFreight solves global supply chain opacity, batch EDI latency (4–12h delays inducing dark corridors), and compounding demurrage ($150–$450/day per container) by providing a continuous, closed-loop cyber-physical system:
- **Heterogeneous IoT Ingestion:** Live maritime AIS VHF transponders, aviation ADS-B Mode S squitters, and highway CAN telematics.
- **Resilient 4-Stage Fallback:** Live Stream $\rightarrow$ Redis Ring Buffer Replay $\rightarrow$ Spherical Geodesic Dead-Reckoning $\rightarrow$ Static Port Anchor.
- **High-Performance Tactical Globe:** MapLibre GL and Leaflet HTML5 Canvas with spatial quadtree hit-testing, sustaining **60 FPS** across 2,740 concurrent entities.
- **Operations Research Routing:** Exact Multi-Objective Shortest Path (MOSP) Pareto optimization over directed multigraph $G=(V, E, M)$ balancing freight tariffs, transit duration, progressive demurrage, and GLEC v3.2 carbon emissions.
- **Predictive Machine Learning:** LightGBM delay risk classifier (Youden's $J$ threshold calibration $\tau^* = 0.5746$, 91.89% accuracy on 96,470 Olist deliveries, 1,000-sample bootstrap target leakage audit); LightGBM Quantile ETA regressor (PAVA monotonic repair); StatsForecast AutoETS demand forecasting (WAPE 32.16%).
- **AI Operations Copilot Cascade:** Tri-tier execution: Deterministic Regex/SQL (0.2 ms) $\rightarrow$ Groq LPU Llama 3.3 70B (420 ms) $\rightarrow$ Google Gemini Flash $\rightarrow$ Domain Rules.
- **Cryptographic Immutability:** PostgreSQL statement-level trigger `trg_audit_logs_no_truncate` raising `ERRCODE P0001` on TRUNCATE, linear SHA-256 hash chaining, and non-root Docker execution (UID 10001).

---

## 2. Hardware, Operating System & Toolchain Prerequisites

### Supported Platforms
- **Operating System:** Windows 10/11 (64-bit), macOS (v12+ Monterey, Ventura, Sonoma, Sequoia), or Linux (Ubuntu 22.04 LTS / Debian 12 / RHEL 9).
- **CPU:** Minimum 4 physical cores (8+ logical threads recommended).
- **RAM:** Minimum 8 GB (16 GB recommended for concurrent Next.js dev server and FastAPI AnyIO loops).
- **Storage:** 10 GB free disk space.

### Required Software Toolchains
Verify the toolchains before proceeding:

```bash
# 1. Verify Git (v2.40 or higher)
git --version

# 2. Verify Python (v3.11, v3.12, or v3.13)
python --version   # or python3 --version

# 3. Verify Node.js (v20.x or higher, npm v10.x+)
node --version
npm --version

# 4. Optional: Verify Docker & Docker Compose
docker --version
docker compose version
```

### Free External API Keys (Optional for Live Mode)
The platform runs 100% offline using bundled local SQLite datasets, mock AIS feeds, and heuristic rules. To activate live cloud streaming and LLM reasoning, obtain free API keys:
- **AISStream Key:** Register free at [`https://aisstream.io`](https://aisstream.io) (GitHub OAuth).
- **OpenRouteService Key:** Register free at [`https://openrouteservice.org`](https://openrouteservice.org).
- **Groq Cloud Key:** Register free at [`https://console.groq.com/keys`](https://console.groq.com/keys) (LPU inference).
- **Google AI Studio Key:** Register free at [`https://aistudio.google.com`](https://aistudio.google.com) (Gemini 2.5 Flash).

---

## 3. PART I: Step-by-Step Local Desktop Reproduction Protocol

### Step 1: Clone Repository & Select Hardened Branch

```bash
# Clone the official public repository
git clone https://github.com/rajmontana/NexaFreight.git

# Enter repository root directory
cd NexaFreight

# Checkout the audited hardening branch
git checkout hardening-final

# Verify current git commit (Audited Head: 2e05a2b / a9477f1)
git log -1 --oneline
```

---

### Step 2: Architecture & Directory Orientation

```
NexaFreight/
├── backend/                  # FastAPI async core, OR routers, ML models, and Alembic migrations
│   ├── src/nexafreight/      # Modular Python application source code
│   │   ├── api/routes/       # 59 FastAPI REST routers (map, shipments, alerts, copilot, etc.)
│   │   ├── core/             # Configuration, database engines, security, and GLEC constants
│   │   ├── models/           # SQLAlchemy 2.0 ORM schemas (Shipment, Leg, AuditLog, etc.)
│   │   ├── ml/               # LightGBM models, PAVA quantile repair, and feature store
│   │   └── services/         # Multimodal Pareto Dijkstra planner, AIS stream, copilot cascade
│   ├── scripts/              # 35+ Operational scripts, benchmark drills, and database seeders
│   ├── tests/                # 88 Pytest test files (unit, integration, and security suites)
│   ├── migrations/           # 17 Linear Alembic database migrations
│   └── requirements.txt      # Python dependencies
├── frontend/                 # Next.js 16.4 App Router, React 19, MapLibre & Canvas Globe
│   ├── src/app/              # Next.js pages: /, /alerts, /shipments, /insights, /login
│   ├── src/components/       # GlobeMap.tsx (Leaflet Canvas Quadtree), DisruptionDesk, etc.
│   ├── src/lib/              # TypeScript API clients, GLEC calculations, and error handlers
│   └── package.json          # Node.js dependencies & scripts
├── docker/                   # Hardened non-root Dockerfiles (UID 10001) & entrypoint scripts
├── data/                     # Baseline operational datasets and SQLite database snapshots
└── DEPLOYMENT.md             # This runbook
```

---

### Step 3: Backend Python Environment Setup

Navigate to the `backend/` directory and configure an isolated virtual environment:

#### Windows (PowerShell / Command Prompt):
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

#### macOS / Linux (Bash / Zsh):
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

### Step 4: Environment Variables (`.env`) Configuration

Create the local configuration file:
```bash
cp .env.example .env
```

Generate a cryptographically secure 32-byte JWT secret:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Edit `backend/.env` and ensure the following keys are set:

```ini
# Runtime Profile
ENVIRONMENT=development
LOG_LEVEL=INFO
DEBUG=true

# Database Configuration (SQLite default for local development)
DATABASE_PATH=./data/nexafreight.db
TEST_DATABASE_PATH=:memory:

# Security & Authentication (Required: >= 32 random bytes)
JWT_SECRET=PASTE_YOUR_GENERATED_32_BYTE_SECRET_HERE
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=60
BCRYPT_ROUNDS=12

# Background IoT Telemetry Workers
ENABLE_AIS_LISTENER=true
ENABLE_POSITION_INTERPOLATOR=true
USE_LIVE_AIS=true

# External Live APIs (Optional: leave blank for fallback)
AISSTREAM_API_KEY=your_aisstream_key_here
ORS_API_KEY=your_ors_key_here

# AI Copilot Inference Cascade
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-2.5-flash

# Operational Defaults
DEFAULT_SLA_PENALTY_PCT=0.05
CARBON_PRICE_PER_KG_USD=0.08
PORT_CONGESTION_THRESHOLD=1.4
VESSEL_DELAY_THRESHOLD_PCT=0.10
```

---

### Step 5: Database Migrations & Immutability Trigger Setup

Apply all 17 linear database migrations up to head:

```bash
# Make sure virtualenv is active in backend/
alembic upgrade head
```

Verify migration status:
```bash
alembic current
# Expected Output: c3d4e5f6a7b8 (head)
```

---

### Step 6: User Bootstrapping & Operational Fleet Seeding

Initialize user accounts, multimodal ports, shipments, and live vessel positions:

```bash
# 1. Bootstrap user accounts (Admin, Operator, Viewer)
python scripts/seed_user.py

# 2. Seed multimodal shipping nodes, container depots, and transit corridors
python scripts/seed_demo_data.py

# 3. Activate multimodal fleet and generate dead-reckoning position reports
python scripts/30_activate_multimodal_fleet.py

# 4. Enforce cryptographically secure bcrypt password hashes
python scripts/rotate_passwords.py
```

#### Default Local Test Credentials:
| Role | Email / Username | Default Password | Permissions |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@nexafreight.local` | `Admin@123` | Full system control, user management, configurations |
| **Operations Manager** | `operator@nexafreight.local` | `Operator@123` | 1-Click reroute approval, disruption reporting, dispatch |
| **Dashboard Viewer** | `viewer@nexafreight.local` | `Viewer@123` | Read-only access to map, shipments, and analytics |

---

### Step 7: Frontend Environment Setup

Open a **new terminal window**, navigate to `frontend/`, and install dependencies:

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Ensure `frontend/.env.local` contains:
```ini
NEXT_PUBLIC_NEXA_API_URL=http://localhost:8000
NEXT_PUBLIC_USD_INR=95.8
```

---

### Step 8: Automated Quality Gates Execution (1,252 Tests)

Execute the complete multi-tier automated test suite:

#### 1. Backend Pytest Suite (891 Passed, 5 Xfailed):
```bash
# In backend/ terminal:
pytest -v --tb=short
```
*Pass Criteria:* 891 passed, 5 xfailed (known limitation ALG-01: branch-and-bound heuristic pruning), 0 failed. Runtime: ~14 seconds.

#### 2. Frontend Vitest Suite (361 Passed):
```bash
# In frontend/ terminal:
npm test -- --run
```
*Pass Criteria:* 361 tests passed across 26 test files, 0 failed.

#### 3. TypeScript Typecheck & Production Build Verification:
```bash
# In frontend/ terminal:
npx tsc --noEmit
npm run build
```
*Pass Criteria:* 0 typecheck errors, successful standalone build generating 10 verified production routes.

---

### Step 9: Running Specialized Empirical & Security Drills

```bash
# In backend/ terminal:

# 1. Red Sea Disruption Replay Drill (Verifies UNCTAD 2024 distance ratios)
python scripts/24_red_sea_drill.py
# Verified: [PASS] across Nhava Sheva (1.710x), Mundra (1.744x), and Singapore (1.244x) to Rotterdam

# 2. 1,000-Iteration Bootstrap Target Leakage Audit
python scripts/20_bootstrap_roc_ci.py
# Verified: Delta ROC-AUC 95% CI [-0.0075, +0.0044] crossing zero

# 3. Quantile ETA Monotonic Repair & Pinball Loss Verification
python scripts/23_verify_quantile_monotonicity.py
# Verified: 100% Monotonic non-crossing; empirical coverage [9.66%, 51.77%, 83.66%]

# 4. Database Immutability Statement Trigger Verification
python scripts/verify_audit_trigger.py
# Verified: TRUNCATE operation aborted with PostgreSQL error P0001
```

---

### Step 10: Starting Local Servers & Interactive Exploration

#### Terminal 1 (FastAPI Backend Service):
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
- API Base URL: `http://localhost:8000`
- Interactive Swagger UI: `http://localhost:8000/docs`
- Health Probe: `http://localhost:8000/healthz`

#### Terminal 2 (Next.js Frontend Control Tower):
```bash
cd frontend
npm run dev
```
- Control Tower Dashboard: `http://localhost:3000`

---

### Step 11: 6-Step Operational Demonstration ("Golden Path")

1. **Login:** Browse to `http://localhost:3000`. Log in with `operator@nexafreight.local` / `Operator@123`.
2. **Tactical Fleet Command:** Explore the interactive 3D tactical globe. Observe 2,740 concurrent maritime and highway entities streaming via Server-Sent Events (SSE) with `[REAL]`, `[REPLAYED]`, and `[SIMULATED]` provenance badges.
3. **Disruption Review:** Open **Disruption Desk** (`/alerts`). Observe the active disruption: *Red Sea / Bab-el-Mandeb Strait Closure*.
4. **Impact Assessment:** Inspect flagged at-risk shipment `SH-INJNP-NLRTM-001`. Review the LightGBM ML delay risk score (84.2%) and estimated $28,400+ demurrage risk.
5. **3-Way Trade-Off Matrix:** Open the **Disruption Recovery Drawer**:
   - *Option 1 (Accept Delay):* +48h local delay; $4,200 demurrage.
   - *Option 2 (Port Divert):* Maritime detour via Cape of Good Hope (+198.8h transit).
   - *Option 3 (Modal Shift - RECOMMENDED):* Emergency Sea-Air hybrid bypass via Salalah and Frankfurt (saves 25.8 days).
6. **1-Click Execution:** Click **Approve & Execute**. The route redraws dynamically on the globe map, connecting legs update, and the decision commits immutably to `audit_logs` with a cryptographic SHA-256 hash.

---

### Alternative: 1-Command Docker Compose Setup

```bash
# From repository root:
docker compose up --build
```
Spins up:
- `postgres:16-alpine` on port `5432` with automated healthchecks.
- `backend` running FastAPI on port `8000` under non-root UID 10001.
- `frontend` running Next.js 16.4 on port `3000`.

---

## 4. PART II: Research Paper Benchmark Reproduction (90 MOSP Instances)

This section details the exact protocol to reproduce the experimental results published in:
> *"An Experimental Evaluation of Exact Multiobjective Shortest-Path Algorithms for Scheduled Multimodal Freight Networks"* (MNNIT Allahabad, 2026).

### Benchmark Overview: Martins vs MDA vs T-MDA
- **Problem Formulation:** Three-objective shortest path problem on event-expanded graphs: minimizing financial cost ($c_1$), transit time ($c_2$), and $\text{CO}_2$ emissions ($c_3$).
- **Solvers Compared:** Martins (1984), Base MDA (2021), and Targeted MDA (T-MDA, 2023).
- **Benchmark Suite:** 90 synthetic instances across three families (A: Sparse Layered, B: Dense Hub, C: High Conflict) and scales $N \in \{12, 24, 48, 72, 96, 144\}$.
- **Timing Protocol:** 2 discarded warm-ups + 7 measured repetitions ($90 \times 7 \times 3 = \mathbf{1,890\text{ timed solver trials}}$).

### Running the 1,890 Timed Solver Trials
```bash
# In backend/ terminal:
python scripts/30_benchmark_planner_baselines.py --repetitions 7 --scales 12,24,48,72,96,144
```
Raw telemetry is saved to:
- `evidence_v2/runs/mosp_benchmark_raw.csv` (1,890 trial rows with preprocessing, search, and total runtimes)
- `evidence_v2/runs/mosp_memory_trace.csv` (270 peak heap allocations traced via `tracemalloc`)
- `evidence_v2/runs/mosp_pareto_frontiers.json` (Exact Pareto frontier coordinates for all 90 instances)

### Reproducing Pareto Frontier Visualizations
To reproduce Figure 7 from the paper (the 3D Pareto frontier and 2D projections for instance `SYN_FAMA_N72_S821` with $|\mathcal{P}^*| = 29$ non-dominated solutions):
```bash
python scripts/generate_pareto_figures.py --instance SYN_FAMA_N72_S821
```
Output figure saved to `evidence_v2/figures/pareto_frontier_SYN_FAMA_N72_S821.png`.

### Numerical Stability & Floating-Point Verification
T-MDA's theoretical invariant (Lemma 3 of Maristany de las Casas et al. 2021) guarantees non-decreasing queue extractions. Under IEEE-754 binary64 arithmetic, non-associativity of addition produces $\pm 1$ Units in the Last Place (ULP) discrepancies:
```bash
python scripts/verify_tmda_numerical_stability.py
```
*Measurements Verified:*
- Total queue extractions: 7,463
- Tolerated inversions: 331 (4.44%)
- Maximum absolute inversion: $1.137 \times 10^{-13}$ ($\approx 2 \times \text{ULP}$)
- Maximum relative inversion: $2.501 \times 10^{-16}$ ($\approx \varepsilon_{\text{mach}}$)
- Impact on final Pareto frontier: **Zero** in all 90 instances.

---

## 5. PART III: Production Cloud Deployment Blueprint

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           PRODUCTION CLOUD TOPOLOGY                              │
└──────────────────────────────────────────────────────────────────────────────────┘

        DISPATCHERS & CARRIERS
                 │
                 ▼
  [ Vercel Edge Global CDN ]  ───────────>  Custom Domain: nexafreight.vercel.app
    ├── Next.js 16.4 App Router             Automatic SSL, Brotli/Gzip Compression
    ├── Standalone Node.js Edge Runtime     Edge Caching & Security Headers
    └── Reverse Proxy: /api/nexa/*  ────┐
                                        │ (Encrypted HTTPS)
                                        ▼
  [ Render Web Service (Singapore) ] ───┘
    ├── Docker Container (UID 10001 non-root)
    ├── FastAPI + AnyIO Async Workers (Uvicorn)
    ├── Bundled LightGBM Models (~6.7 MB)
    └── Health Probes: /healthz, /readyz
           │                          │
           ▼                          ▼
  [ Neon Serverless PostgreSQL 16 ]  [ Upstash Redis 7 ]
    ├── Pooled Connection String       ├── TLS (rediss://) Connection
    ├── 17 Alembic Migrations          ├── Sliding-Window Ring Buffer
    └── WORM Statement Trigger P0001   └── Real-time Telemetry Cache
```

---

### Step 1: Neon Serverless PostgreSQL 16 Deployment

1. Create a project at [`https://neon.tech`](https://neon.tech) (PostgreSQL 16, Region: Singapore `ap-southeast-1`).
2. Copy the pooled connection string:
   ```
   postgresql+asyncpg://[user]:[password]@[endpoint]-pooler.ap-southeast-1.neon.tech/nexafreight?sslmode=require
   ```
3. Apply database migrations remotely from your workstation:
   ```bash
   cd backend
   DATABASE_URL="postgresql+asyncpg://[user]:[password]@[endpoint]-pooler.ap-southeast-1.neon.tech/nexafreight?sslmode=require" alembic upgrade head
   ```
4. Synchronize baseline reference tables and operational nodes:
   ```bash
   DATABASE_URL="postgresql+asyncpg://[user]:[password]@[endpoint]-pooler.ap-southeast-1.neon.tech/nexafreight?sslmode=require" python scripts/sync_operational_to_neon.py
   ```

---

### Step 2: Upstash Managed Redis 7 Deployment

1. Create a database at [`https://upstash.com`](https://upstash.com) (Region: Singapore).
2. Set eviction policy to `volatile-lru`.
3. Copy the Python connection string with TLS:
   ```
   rediss://default:[password]@[endpoint].upstash.io:6379
   ```

---

### Step 3: Render FastAPI Container Deployment

1. In [`https://render.com`](https://render.com), click **New > Web Service** and connect repository `rajmontana/NexaFreight`.
2. Configure settings:
   - **Name:** `nexafreight-backend`
   - **Region:** `Singapore`
   - **Branch:** `main` or `hardening-final`
   - **Root Directory:** `backend`
   - **Runtime:** `Docker`
   - **Dockerfile Path:** `../docker/Dockerfile.backend`
   - **Health Check Path:** `/healthz`
3. Configure Environment Variables:
   - `DATABASE_URL`: `postgresql+asyncpg://...` (Neon pooled URI)
   - `REDIS_URL`: `rediss://...` (Upstash URI)
   - `JWT_SECRET`: Click *Generate* (32+ bytes)
   - `ENVIRONMENT`: `production`
   - `RUN_MIGRATIONS`: `false`
   - `ENABLE_AIS_LISTENER`: `true`
   - `ENABLE_POSITION_INTERPOLATOR`: `true`
   - `AISSTREAM_API_KEY`: `[Your key]`
   - `GROQ_API_KEY`: `[Your key]`
   - `GEMINI_API_KEY`: `[Your key]`
   - `ORS_API_KEY`: `[Your key]`
4. Deploy the service. Note public URL: `https://nexafreight-backend.onrender.com`.

---

### Step 4: Vercel Edge Frontend Deployment

1. In [`https://vercel.com`](https://vercel.com), import repository `rajmontana/NexaFreight`.
2. Configure settings:
   - **Framework:** `Next.js`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
3. Configure Environment Variables:
   - `NEXA_BACKEND_URL`: `https://nexafreight-backend.onrender.com`
   - `NEXT_PUBLIC_BACKEND_ORIGIN`: `https://nexafreight-backend.onrender.com`
   - `NEXT_PUBLIC_NEXA_API_URL`: `https://nexafreight-backend.onrender.com`
   - `NEXT_PUBLIC_USD_INR`: `95.8`
4. Deploy. The application is live at `https://nexafreight.vercel.app`.

---

### Step 5: Post-Deployment Smoke Testing & Production Verification

```bash
# 1. Verify backend health probes
curl -I https://nexafreight-backend.onrender.com/healthz
curl https://nexafreight-backend.onrender.com/readyz

# 2. Test Ephemeral Single-Use Stream Ticket
TOKEN=$(curl -s -X POST https://nexafreight-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"operator@nexafreight.local","password":"Operator@123"}' | jq -r .access_token)

TICKET=$(curl -s -X POST https://nexafreight-backend.onrender.com/api/map/positions/stream-ticket \
  -H "Authorization: Bearer $TOKEN" | jq -r .ticket)

# Connect with ticket (Valid):
curl -N "https://nexafreight-backend.onrender.com/api/map/positions/stream?ticket=$TICKET" &
PID=$!; sleep 3; kill $PID

# Attempt to reuse ticket (Must return 401 Unauthorized):
curl -I "https://nexafreight-backend.onrender.com/api/map/positions/stream?ticket=$TICKET"

# 3. Test Database Immutability Trigger
# In psql console on Neon:
# TRUNCATE TABLE audit_logs;
# ERROR: TRUNCATE operation is strictly prohibited on audit_logs table (ERRCODE P0001)
```

---

## 6. PART IV: Production Security, Monitoring & Zero-Downtime Operations

1. **Non-Blocking Index Creation:** All B-Tree indexes on high-throughput tables (`position_reports`, `shipments`, `legs`) use `CREATE INDEX CONCURRENTLY` acquiring only an `SHARE UPDATE EXCLUSIVE` lock.
2. **Lock Timeout Guardrails:** Every migration enforces `SET lock_timeout = '4s';` preventing table lock cascading deadlocks.
3. **Container Hardening:** Process runs under unprivileged system user `nexafreight` (**UID 10001, GID 10001**), eliminating root breakout risks in compliance with CIS Docker Benchmark 4.1.
4. **Secret Scanning:** Enforced via Gitleaks in GitHub Actions CI with zero un-allowlisted credentials.
5. **Credential Rotation:** Execute `python scripts/rotate_passwords.py` periodically to generate fresh bcrypt password hashes from environment secrets.

---

## 7. PART V: Troubleshooting & Frequently Asked Questions (FAQ)

### Q1: "CORS preflight error when making API requests from frontend"
- **Solution:** NexaFreight eliminates CORS overhead by routing all browser requests through the **Next.js Same-Origin Reverse Proxy** (`/api/nexa/*`). Ensure client components fetch from `/api/nexa/endpoint` rather than hardcoding port 8000.

### Q2: "Alembic migration lock deadlocks on container boot"
- **Solution:** Multi-pod deployments race for schema locks. NexaFreight wraps migrations in PostgreSQL session lock `pg_advisory_xact_lock(982734123)` in `migrations/env.py`. Alternatively, set `RUN_MIGRATIONS=false` in application pods and execute migrations in a dedicated pre-deploy stage.

### Q3: "AI Copilot returns HTTP 429 Too Many Requests"
- **Solution:** Public endpoints enforce SlowAPI rate limiting (`@limiter.limit("10/minute")`). Wait 60 seconds or authenticate using an `ADMIN` token.

### Q4: "Map markers drop frame rates on older hardware"
- **Solution:** Ensure Leaflet Canvas quadtree rendering is active in `GlobeMap.tsx` (`L.canvas({ padding: 0.5 })`). Do not switch to standard SVG markers.

---

## 8. Formal Document Sign-Off & Endorsement

This unified guide has been physically verified against the production codebase on branch `hardening-final` (commit `2e05a2b`). All reproduction steps, commands, benchmark protocols, and cloud configurations reflect verified and tested software.

**Lead Systems Architect & Project Lead:** **Raj Kumar Merugu** (`rajmontana`)  
**Department of Mechanical Engineering, MNNIT Allahabad**  
**Date of Certification:** November 12, 2026
