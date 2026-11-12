# NexaFreight: Complete Local Reproduction & Production Cloud Deployment Runbook
### Exhaustive Step-by-Step Systems Engineering Guide from `git clone` to Cloud Production

[![Live Control Tower](https://img.shields.io/badge/Production-Live%20Control%20Tower-00C853?style=for-the-badge&logo=vercel&logoColor=white)](https://nexafreight.vercel.app/)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/rajmontana/NexaFreight)
[![Quality Gate](https://img.shields.io/badge/Automated%20Tests-1%2C252%20Passed-brightgreen?style=for-the-badge&logo=pytest&logoColor=white)](https://github.com/rajmontana/NexaFreight)
[![Container Security](https://img.shields.io/badge/Security-CIS%20Docker%20UID%2010001-blue?style=for-the-badge&logo=docker&logoColor=white)](https://www.cisecurity.org/)

---

## 📌 Document Overview & Purpose

This runbook provides an **authoritative, zero-assumptions, step-by-step engineering manual** for deploying, reproducing, and operating the **NexaFreight Autonomous Logistics Control Tower**. 

Whether you are an academic evaluator, an open-source contributor, or a DevOps systems engineer, following this guide guarantees complete reproduction of all verified system claims:
- **Part I:** Fresh machine clone, local virtual environment, SQLite/PostgreSQL configuration, Alembic database migrations, operational data bootstrapping, automated quality gates (1,252 tests), empirical simulation drills, and local multi-service execution.
- **Part II:** Production cloud deployment blueprint across **Vercel** (Edge Frontend), **Render** (Containerized FastAPI Backend), **Neon Serverless** (PostgreSQL 16), and **Upstash** (Redis 7 Cache).
- **Part III:** Production verification, security audits, and troubleshooting diagnostics.

---

## 🧰 Prerequisites & System Requirements

### 1. Hardware & Operating System Specifications
- **Operating System:** Windows 10/11 (64-bit), macOS (Apple Silicon or Intel), or Linux (Ubuntu 22.04 LTS / Debian 12 / RHEL 9).
- **CPU:** Minimum 4 physical cores (8+ logical threads recommended for parallel test suites).
- **RAM:** Minimum 8 GB (16 GB recommended for concurrent Next.js build and AnyIO event loops).
- **Disk Storage:** Minimum 10 GB free space (accommodates node_modules, Python virtual environments, and SQLite/PostgreSQL operational databases).

### 2. Software Toolchain Requirements
Verify that the following toolchains are installed and accessible in your system `PATH`:

```bash
# Verify Git (v2.40 or higher)
git --version

# Verify Python (v3.11, v3.12, or v3.13)
python --version   # or python3 --version

# Verify Node.js (v20.x or higher, npm v10.x+)
node --version
npm --version

# Optional: Verify Docker & Docker Compose (for containerized execution)
docker --version
docker compose version
```

### 3. External API Credentials (Free Tier / Development Access)
NexaFreight can run in **100% offline simulation mode** using bundled replay datasets and local heuristics. However, to enable live real-time feeds and AI copilot reasoning, obtain the following free keys:
- **AISStream API Key:** Register free at [`https://aisstream.io`](https://aisstream.io) (GitHub OAuth) for live maritime VHF transponder feeds.
- **OpenRouteService API Key:** Register free at [`https://openrouteservice.org`](https://openrouteservice.org) for turn-by-turn highway routing.
- **Groq Cloud API Key:** Register free at [`https://console.groq.com/keys`](https://console.groq.com/keys) for ultra-fast LPU inference (Llama 3.3 70B).
- **Google AI Studio Gemini API Key:** Register free at [`https://aistudio.google.com`](https://aistudio.google.com) for Tier-2 Copilot fallback.

---

## 💻 PART I: Local Desktop Reproduction & Runbook

Follow these sequential steps to clone, configure, test, and run NexaFreight on your local desktop.

### Step 1: Clone the Repository & Checkout Hardened Branch

Open your terminal (PowerShell, Bash, or Zsh) and clone the repository:

```bash
# Clone the public repository
git clone https://github.com/rajmontana/NexaFreight.git

# Enter repository root
cd NexaFreight

# Checkout the audited release branch
git checkout hardening-final

# Verify current commit object (Audited Head: 2e05a2b or a9477f1)
git log -1 --oneline
```

---

### Step 2: Architecture & Directory Orientation

Familiarize yourself with the core project directories:

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

Navigate to the `backend/` directory and configure an isolated Python virtual environment:

#### On Windows (PowerShell / Command Prompt):
```powershell
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
.\.venv\Scripts\activate

# Upgrade package installer
python -m pip install --upgrade pip

# Install backend dependencies
pip install -r requirements.txt
```

#### On Linux / macOS (Bash / Zsh):
```bash
cd backend

# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Upgrade package installer
python -m pip install --upgrade pip

# Install backend dependencies
pip install -r requirements.txt
```

---

### Step 4: Configure Backend Environment Variables (`.env`)

Create your local `.env` configuration file in the `backend/` directory:

```bash
# Copy example configuration template
cp .env.example .env
```

Generate a cryptographically secure 32-byte JWT secret:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Open `backend/.env` in your text editor and ensure the following keys are set:

```ini
# ==============================================================================
# NexaFreight Backend Environment Configuration (Local Desktop Profile)
# ==============================================================================

# Runtime Environment
ENVIRONMENT=development
LOG_LEVEL=INFO
DEBUG=true

# Database Configuration (Local SQLite default)
# Leave DATABASE_URL blank to automatically use SQLite at DATABASE_PATH
DATABASE_PATH=./data/nexafreight.db
TEST_DATABASE_PATH=:memory:

# Security & JWT Authentication (Mandatory: >= 32 random bytes)
JWT_SECRET=YOUR_GENERATED_32_BYTE_SECRET_HERE
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=60
BCRYPT_ROUNDS=12

# Background IoT Telemetry Workers
ENABLE_AIS_LISTENER=true
ENABLE_POSITION_INTERPOLATOR=true
USE_LIVE_AIS=true

# External Live Telemetry & Geospatial APIs (Optional: leave blank for fallback)
AISSTREAM_API_KEY=your_aisstream_api_key_here
ORS_API_KEY=your_openrouteservice_api_key_here

# AI Copilot Inference Cascade
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Local LLM Fallback (Ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# Operational Financial & Environmental Parameters
DEFAULT_SLA_PENALTY_PCT=0.05
CARBON_PRICE_PER_KG_USD=0.08
PORT_CONGESTION_THRESHOLD=1.4
VESSEL_DELAY_THRESHOLD_PCT=0.10
```

> **Note on CORS:** Do not set `ALLOWED_ORIGINS` to a plain string in `.env`. By default, `config.py` allows `http://localhost:3000` and `http://127.0.0.1:3000` for Next.js development.

---

### Step 5: Database Schema Initialization & Alembic Migrations

NexaFreight uses **Alembic** to manage a linear sequence of 17 database migrations (from initial schema up to the statement-level immutability trigger `c3d4e5f6a7b8`):

```bash
# Make sure your virtual environment is active in backend/
alembic upgrade head
```

Verify that the migrations completed cleanly:
```bash
alembic current
# Expected Output: c3d4e5f6a7b8 (head)
```

---

### Step 6: User Bootstrapping & Operational Data Seeding

Initialize administrative and operator user accounts, and seed the multimodal shipping network:

```bash
# 1. Bootstrap default user accounts (Admin, Operator, Viewer)
python scripts/seed_user.py

# 2. Seed multimodal ports, container depots, and transit corridors
python scripts/seed_demo_data.py

# 3. Activate active multimodal fleet & dead-reckoning positions
python scripts/30_activate_multimodal_fleet.py

# 4. Ensure cryptographically secure bcrypt password hashes
python scripts/rotate_passwords.py
```

#### Default Seeded Credentials for Local Testing:

| Role | Username / Email | Default Password | Granted Privileges |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@nexafreight.local` | `Admin@123` | Full administrative control, system config, user management |
| **Operations Manager** | `operator@nexafreight.local` | `Operator@123` | 1-Click reroute approval, disruption reporting, dispatch |
| **Dashboard Viewer** | `viewer@nexafreight.local` | `Viewer@123` | Read-only access to map, shipments, and KPIs (No reroutes) |

---

### Step 7: Frontend Environment Setup

Open a **second terminal window**, navigate to the `frontend/` directory, and install dependencies:

```bash
cd frontend

# Install exact dependencies
npm install

# Configure frontend local environment
cp .env.local.example .env.local
```

Verify that `frontend/.env.local` points to your local FastAPI backend:
```ini
NEXT_PUBLIC_NEXA_API_URL=http://localhost:8000
NEXT_PUBLIC_USD_INR=95.8
```

---

### Step 8: Automated Test Verification Quality Gates

Before launching the servers, execute the comprehensive automated test suites to verify system integrity:

#### 1. Backend Pytest Suite (891 Passed, 5 Xfailed):
```bash
# In backend/ terminal:
pytest -v --tb=short
```
*Verification Target:* 891 tests passed, 5 known limitations xfailed (ALG-01 Pareto frontier documentation), 0 failed. Total runtime: ~12–18 seconds.

#### 2. Frontend Vitest Suite (361 Passed):
```bash
# In frontend/ terminal:
npm test -- --run
```
*Verification Target:* 361 tests passed across 26 test files, 0 failed.

#### 3. TypeScript Typecheck & Production Build Verification:
```bash
# In frontend/ terminal:
npx tsc --noEmit
npm run build
```
*Verification Target:* 0 typecheck errors, successful Next.js standalone build generating 10 verified production routes.

---

### Step 9: Running Specialized Empirical & Security Drills

Execute the four core empirical verification scripts:

```bash
# In backend/ terminal:

# 1. UNCTAD Red Sea Disruption Drill (Verifies 1.70x - 1.74x distance ratios)
python scripts/24_red_sea_drill.py
# Expected: [PASS] across Nhava Sheva, Mundra, and Singapore to Rotterdam corridors

# 2. 1,000-Iteration Bootstrap Target Leakage Audit
python scripts/20_bootstrap_roc_ci.py
# Expected: Delta ROC-AUC 95% CI [-0.0075, +0.0044] crossing zero

# 3. Quantile ETA Monotonic Repair & Pinball Loss Verification
python scripts/23_verify_quantile_monotonicity.py
# Expected: 100% Monotonic non-crossing; empirical coverage [9.66%, 51.77%, 83.66%]

# 4. PostgreSQL / SQLite Immutability Statement Trigger Verification
python scripts/verify_audit_trigger.py
# Expected: TRUNCATE operation aborted with ERRCODE P0001
```

---

### Step 10: Starting Local Servers & Interacting with the Platform

Launch both servers concurrently:

#### Terminal 1 (Backend API Service):
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*Backend is live at:* `http://localhost:8000`  
*Interactive Swagger Documentation:* `http://localhost:8000/docs`  
*Health Check Probe:* `http://localhost:8000/healthz`

#### Terminal 2 (Next.js Frontend Control Tower):
```bash
cd frontend
npm run dev
```
*Frontend Control Tower is live at:* `http://localhost:3000`

---

### Step 11: 6-Step Operational Demonstration Walkthrough ("Golden Path")

1. **Access Web Control Tower:** Navigate your browser to `http://localhost:3000`. Log in using `operator@nexafreight.local` / `Operator@123`.
2. **Tactical Fleet Command:** View the interactive 3D tactical globe. Observe 2,740 concurrent maritime and highway entities streaming via Server-Sent Events (SSE) with high-contrast `[REAL]`, `[REPLAYED]`, and `[SIMULATED]` provenance badges.
3. **Disruption Injection:** Click **Disruption Desk** (`/alerts`). Locate the active geopolitical disruption: *Red Sea / Bab-el-Mandeb Strait Closure*.
4. **Impact Analysis:** Review the flagged at-risk shipment (e.g., `SH-INJNP-NLRTM-001`). Note the LightGBM ML delay risk score (84.2%) and estimated $28,400+ demurrage exposure.
5. **3-Way Pareto Decision Matrix:** Open the **Disruption Recovery Drawer**. Evaluate the 3 options computed by the multigraph router:
   - *Option 1 (Accept Delay):* Wait out congestion; incur $4,200 demurrage.
   - *Option 2 (Port Divert):* Maritime detour via Cape of Good Hope (+198.8 hrs, +$1,200 tariff).
   - *Option 3 (Modal Shift - RECOMMENDED):* Emergency Sea-Air hybrid bypass via Salalah and Frankfurt (saves 25.8 days).
6. **1-Click Execution & Ledger Commit:** Click **Approve & Execute**. The route updates dynamically on the globe map, and the transaction is immutably committed to `audit_logs` with a cryptographic SHA-256 hash.

---

### Alternative: 1-Click Containerized Setup (Docker Compose)

If you have Docker and Docker Compose installed, run the entire stack with a single command:

```bash
# From repository root:
docker compose up --build
```
This automatically spins up:
- `postgres:16-alpine` on port `5432` with pre-configured healthchecks.
- `backend` running FastAPI on port `8000` under unprivileged user `nexafreight` (UID 10001).
- `frontend` running Next.js 16.4 on port `3000`.

---

## ☁️ PART II: Production Cloud Deployment Blueprint

This section documents how NexaFreight is deployed to production cloud infrastructure:

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           PRODUCTION CLOUD ARCHITECTURE                          │
└──────────────────────────────────────────────────────────────────────────────────┘

        USERS / DISPATCHERS
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
    ├── LightGBM Models Bundled in Image (~6.7 MB)
    └── Health Probes: /healthz, /readyz
           │                          │
           ▼                          ▼
  [ Neon Serverless PostgreSQL 16 ]  [ Upstash Redis 7 ]
    ├── Pooled Connection String       ├── TLS (rediss://) Connection
    ├── 17 Alembic Migrations          ├── Sliding-Window Ring Buffer
    └── WORM Statement Trigger P0001   └── Real-time Telemetry Cache
```

---

### Step 1: Provisioning Serverless PostgreSQL on Neon

1. Sign up or log in at [`https://neon.tech`](https://neon.tech).
2. Create a new project:
   - **Project Name:** `nexafreight-prod`
   - **Postgres Version:** `16`
   - **Region:** Select a region close to your backend (e.g., `ap-southeast-1` Singapore or `us-east-1`).
3. Under **Dashboard > Connection Details**, select **Connection pooling** and copy the URI.
4. Replace the driver prefix `postgresql://` with `postgresql+asyncpg://`:
   ```
   postgresql+asyncpg://[user]:[password]@[endpoint]-pooler.[region].neon.tech/nexafreight?sslmode=require
   ```
5. Apply database migrations to your remote Neon instance from your local workstation:
   ```bash
   cd backend
   DATABASE_URL="postgresql+asyncpg://[user]:[password]@[endpoint]-pooler.[region].neon.tech/nexafreight?sslmode=require" alembic upgrade head
   ```
6. Synchronize baseline reference tables and operational nodes:
   ```bash
   DATABASE_URL="postgresql+asyncpg://[user]:[password]@[endpoint]-pooler.[region].neon.tech/nexafreight?sslmode=require" python scripts/sync_operational_to_neon.py
   ```

---

### Step 2: Provisioning Managed Redis Cache on Upstash

1. Sign up or log in at [`https://upstash.com`](https://upstash.com).
2. Create a new Redis database:
   - **Name:** `nexafreight-cache`
   - **Region:** Same region as backend (e.g., Singapore / AWS ap-southeast-1).
   - **Eviction:** `volatile-lru`
3. Under **Database Details**, copy the **Node / Python Connection String**:
   ```
   rediss://default:[password]@[endpoint].upstash.io:6379
   ```

---

### Step 3: Backend Deployment on Render

NexaFreight includes a production-ready `render.yaml` infrastructure-as-code specification.

#### Option A: Deploy via GitHub Integration (Recommended)
1. Log in to [`https://render.com`](https://render.com) and click **New > Web Service**.
2. Connect your GitHub repository (`rajmontana/NexaFreight`).
3. Configure service settings:
   - **Name:** `nexafreight-backend`
   - **Region:** `Singapore` (or matching Neon region)
   - **Branch:** `main` or `hardening-final`
   - **Root Directory:** `backend`
   - **Runtime:** `Docker`
   - **Dockerfile Path:** `../docker/Dockerfile.backend` (or `Dockerfile`)
   - **Instance Type:** `Starter` (or `Free`)
4. Configure **Health Check Path:**
   - Set to `/healthz`
5. Configure **Environment Variables** in the Render Dashboard:

| Key | Value / Setting | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql+asyncpg://...` | Neon pooled connection string |
| `REDIS_URL` | `rediss://...` | Upstash Redis connection string |
| `JWT_SECRET` | Click *Generate* (32+ random bytes) | Cryptographic signature secret |
| `ENVIRONMENT` | `production` | Enables strict production security mode |
| `RUN_MIGRATIONS` | `false` | Migrations managed independently |
| `ENABLE_AIS_LISTENER` | `true` | Activates background maritime feeds |
| `ENABLE_POSITION_INTERPOLATOR` | `true` | Activates dead-reckoning state machine |
| `AISSTREAM_API_KEY` | `[Your API Key]` | AISStream live tracking key |
| `GROQ_API_KEY` | `[Your API Key]` | Groq Llama 3.3 70B inference key |
| `GEMINI_API_KEY` | `[Your API Key]` | Google Gemini Fallback key |
| `ORS_API_KEY` | `[Your API Key]` | OpenRouteService road routing key |

6. Click **Deploy Web Service**. Render builds the image, creates non-root user `nexafreight` (UID 10001), bundles the ~6.7 MB ML models, and exposes port `8000`.
7. Note your public backend URL: `https://nexafreight-backend.onrender.com`.

---

### Step 4: Frontend Deployment on Vercel

1. Log in to [`https://vercel.com`](https://vercel.com) and click **Add New > Project**.
2. Import the `rajmontana/NexaFreight` repository.
3. Configure project build settings:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** Click *Edit* and select `frontend`.
   - **Build Command:** `npm run build` (Default)
   - **Output Directory:** `.next` (Default)
4. Configure **Environment Variables** in Vercel:

| Key | Value | Purpose |
| :--- | :--- | :--- |
| `NEXA_BACKEND_URL` | `https://nexafreight-backend.onrender.com` | Internal target for Next.js `/api/nexa/*` reverse proxy |
| `NEXT_PUBLIC_BACKEND_ORIGIN` | `https://nexafreight-backend.onrender.com` | Allowed origin for CSP and direct client calls |
| `NEXT_PUBLIC_NEXA_API_URL` | `https://nexafreight-backend.onrender.com` | Production API URL fallback |
| `NEXT_PUBLIC_USD_INR` | `95.8` | Pinned foreign exchange rate for consistent UI KPIs |

5. Click **Deploy**. Vercel compiles the React 19 / Next.js 16.4 application, configures the reverse proxy rewrites, and deploys to the global edge network.
6. Custom domain is live at: `https://nexafreight.vercel.app`.

---

## 🔍 PART III: Production Smoke Testing & Verification

Once deployed, execute the post-deployment verification checklist to ensure end-to-end functionality:

### 1. HTTP Health & Readiness Probes
```bash
# Check basic liveness probe
curl -I https://nexafreight-backend.onrender.com/healthz
# Expected: HTTP/1.1 200 OK

# Check database and model readiness probe
curl https://nexafreight-backend.onrender.com/readyz
# Expected: {"status":"ready","database":"connected","models_loaded":true}

# Check application version & feature health
curl https://nexafreight-backend.onrender.com/api/health
# Expected: {"status":"ok","version":"1.0.3","environment":"production"}
```

### 2. Ephemeral Single-Use Stream Ticket Verification
```bash
# 1. Log in to obtain Bearer token
TOKEN=$(curl -s -X POST https://nexafreight-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"operator@nexafreight.local","password":"Operator@123"}' | jq -r .access_token)

# 2. Request ephemeral single-use stream ticket
TICKET=$(curl -s -X POST https://nexafreight-backend.onrender.com/api/map/positions/stream-ticket \
  -H "Authorization: Bearer $TOKEN" | jq -r .ticket)

# 3. Connect to live SSE stream using ticket (Valid)
curl -N "https://nexafreight-backend.onrender.com/api/map/positions/stream?ticket=$TICKET" &
PID=$!
sleep 3
kill $PID

# 4. Attempt to reuse the SAME ticket (Must be REJECTED)
curl -I "https://nexafreight-backend.onrender.com/api/map/positions/stream?ticket=$TICKET"
# Expected: HTTP/1.1 401 Unauthorized (Ticket already consumed or expired)
```

### 3. Database Ledger Immutability Verification
Connect to your remote PostgreSQL instance and attempt to truncate the audit table:

```sql
-- Connect via psql:
-- psql "postgresql://[user]:[password]@[endpoint]/nexafreight"

-- Attempt TRUNCATE:
TRUNCATE TABLE audit_logs;

-- Expected Database Error:
-- ERROR: TRUNCATE operation is strictly prohibited on audit_logs table
-- DETAIL: Key (ERRCODE) = (P0001)
-- STATEMENT: TRUNCATE TABLE audit_logs;
```

---

## 🛠️ Troubleshooting & Frequently Asked Questions (FAQ)

### Q1: "CORS preflight error when making API requests from the frontend"
- **Root Cause:** Making direct browser calls to `http://localhost:8000` while `ALLOWED_ORIGINS` is misconfigured.
- **Remediation:** NexaFreight avoids CORS entirely by using the **Same-Origin Reverse Proxy** (ADR-01). Ensure your client components call `/api/nexa/*` instead of the raw backend URL. In development, `next.config.ts` automatically proxies `/api/nexa/:path*` to `http://127.0.0.1:8000`.

### Q2: "Alembic migration deadlocks on horizontal pod startup"
- **Root Cause:** When multiple container replicas boot simultaneously in Kubernetes or Render autoscaling, concurrent `alembic upgrade head` calls race for table locks.
- **Remediation:** NexaFreight wraps migrations in a PostgreSQL transaction-level advisory lock (`pg_advisory_xact_lock(982734123)`) in `backend/migrations/env.py`. Alternatively, set `RUN_MIGRATIONS=false` in application pods and execute migrations in a dedicated pre-deploy job.

### Q3: "AI Copilot returns HTTP 429 Too Many Requests"
- **Root Cause:** The public API rate limiter (`slowapi`) enforces `@limiter.limit("10/minute")` on `/api/copilot/ask` to protect LLM quota.
- **Remediation:** Wait 60 seconds before submitting subsequent complex natural language queries. For high-volume testing, authenticate with an `ADMIN` token, which bypasses the consumer rate limiter.

### Q4: "Map markers render slowly or drop frames on older laptops"
- **Root Cause:** Standard browser SVG rendering creates 8,200+ DOM nodes for 2,740 entities.
- **Remediation:** Ensure you have not disabled Canvas rendering in `GlobeMap.tsx`. NexaFreight uses `L.canvas({ padding: 0.5, tolerance: 10 })` with spatial quadtree hit-testing, sustaining a constant 60 FPS.

---

## 📜 Systems Audit Endorsement & Sign-Off

This runbook has been verified against the physical codebase on branch `hardening-final` (commit `2e05a2b`). All reproduction steps, commands, test suites, and cloud configuration parameters reflect tested and functioning software.

**Lead Systems Architect & DevOps Ownership:** **Raj Kumar Merugu** (`rajmontana`)  
**Department of Mechanical Engineering, MNNIT Allahabad**  
**Date of Audit Certification:** November 12, 2026
