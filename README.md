# 🚢 NexaFreight SmartTrack™ AI
### Multi-Modal Predictive Logistics & Intelligent Autonomous Supply Chain Tower

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![XGBoost](https://img.shields.io/badge/XGBoost-EB5424?style=for-the-badge)](https://xgboost.readthedocs.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Neon](https://img.shields.io/badge/Neon_Postgres-00E599?style=for-the-badge&logo=neon&logoColor=black)](https://neon.tech/)

---

## 📌 Executive Overview

**NexaFreight SmartTrack™** is an enterprise-grade logistics control tower designed for global freight forwarders, 3PLs, and supply chain operators. Built on **172,765 real-world multi-modal shipment records**, it integrates **gradient-boosted machine learning**, **explainable AI (TreeSHAP)**, **live satellite telemetry**, and **Six Sigma Statistical Process Control (SPC)** to predict delivery breaches, prevent demurrage fines, and optimize multi-modal routing in real time.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Data & Storage
        DB[("PostgreSQL Database (Neon.tech)\n172,765 Shipments")]
    end

    subgraph Backend Engine (FastAPI)
        AUTH["JWT Cryptographic Auth\n(SHA-256 HMAC)"]
        ML["XGBoost ETA Regressor\n(47 Feature Vector)"]
        SHAP["Native TreeSHAP Engine\n(Feature Attribution)"]
        SPC["Shewhart SPC Engine\n(X-bar, UCL/LCL, DPMO)"]
        DEM["Demurrage Accrual Calculator\n(Port Dwell Tiers)"]
        ESG["Scope 3 Carbon Engine\n(GLEC Multi-Modal Factors)"]
    end

    subgraph Frontend Control Tower (Vanilla Web)
        UI["Glassmorphism Dashboard\n(Leaflet.js + Chart.js)"]
    end

    DB --> AUTH
    DB --> SPC
    DB --> DEM
    DB --> ESG
    AUTH --> UI
    ML --> UI
    SHAP --> UI
    SPC --> UI
    DEM --> UI
    ESG --> UI
```

---

## 🌟 Key Capabilities

### 1. 🤖 Predictive Lead-Time & Delay Risk (XGBoost + TreeSHAP)
* Evaluates an **exact 47-feature vector** across order geography, shipping mode, cargo weight, and simulated weather/transit delays.
* Dynamically computes **TreeSHAP feature contributions** ($\sum \phi_i + \phi_0 = f(x)$) to explain the root cause of every predicted delay.
* Provides **prescriptive ROI recommendations** (e.g., $+ \$850$ net benefit by switching delayed First Class shipments to Air Cargo).

### 2. ⏱️ Demurrage & Detention Ticking Clocks
* Accrues tier-based container storage costs across major global ports:
  * **Free Period (0–4 Days):** $\$0$
  * **Tier 1 (5–7 Days):** $\$300/\text{day}$
  * **Tier 2 (8–10 Days):** $\$450/\text{day}$
  * **Tier 3 (10+ Days):** $\$600/\text{day}$
* Evaluates active financial exposure ($> \$90\text{M}$ across historical demurrage risk clusters).

### 3. 📈 Six Sigma Statistical Process Control (SPC)
* Computes real **Shewhart $\bar{X}$-Bar control limits** ($\bar{X} = 3.79\text{d}$, $\text{UCL} = 7.63\text{d}$, $\text{LCL} = 0.0\text{d}$).
* Benchmarks carrier performance using **Defects Per Million Opportunities ($\text{DPMO} = 572,899$)** and Six Sigma Quality metrics.

### 4. 🌿 Scope 3 GHG Emissions Tracker (GLEC Framework)
* Multi-modal carbon calculation across Air ($0.500\text{ kg CO}_2\text{e/t-km}$), Road ($0.062$), Rail ($0.022$), and Ocean ($0.015$).
* Identifies green corridor opportunities to meet corporate ESG targets.

### 5. 🔒 Zero-Trust JWT Authentication
* All control tower analytics, shipment tables, and ML prediction endpoints are strictly protected by **Bearer JWT token verification**.

---

## 🚀 Quick Start (Local Development)

The control tower boots **with zero infrastructure** — no database, no API keys required. If PostgreSQL is unreachable or the `shipments` table is empty, every screen automatically serves a deterministic 172,765-row synthetic replica so all charts, the live map, the ML regressor and the copilot work out of the box.

### 1. Clone & Configure Environment
```bash
git clone https://github.com/rajmontana/NexaFreight.git
cd NexaFreight
cp .env.example .env   # optional — defaults work offline
```

### 2. Run with plain Python (recommended, fastest)
```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
cd backend && python -m uvicorn app:app --host 0.0.0.0 --port 8000
```
Then open:
* **Frontend Control Tower:** [http://localhost:8000](http://localhost:8000)
* **Investor Pitch Deck:** [http://localhost:8000/pitch/](http://localhost:8000/pitch/)
* **Interactive API Docs (Swagger):** [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Run with Docker Compose (API + PostgreSQL)
```bash
docker-compose up --build
```

### 4. Optional: unlock the live feeds
Add to `.env` (all free-tier keys) and restart:
```bash
DATABASE_URL=postgresql://...      # live ledger instead of synthetic sandbox
AISSTREAM_API_KEY=...              # real satellite AIS (aisstream.io) — badge flips SIM → LIVE
GROQ_API_KEY=...                   # real Llama-3.3-70B copilot (console.groq.com)
JWT_SECRET=...                     # session signing secret
```

---

## 🔑 Demo Credentials

| Role | Email | Password |
|:---|:---|:---|
| **Logistics Manager** | `manager@nexafreight.com` | `SmartTrack2025` |
| **Supply Chain Director** | `director@nexafreight.com` | `SmartTrack2025` |

---

## ☁️ Cloud Deployment

### 1. Database (Neon.tech PostgreSQL)
Stream your local PostgreSQL database into Neon in seconds:
```bash
set DATABASE_URL="postgresql://user:pass@ep-cool-db.neon.tech/neondb?sslmode=require"
python backend/migrate_to_cloud_db.py
```

### 2. Web Service (Render / Railway / Fly.io)
1. Link this repository to **Render**.
2. Select **Docker** environment.
3. Configure `DATABASE_URL` and `JWT_SECRET` in environment variables.

---

---

## 🎯 Final Assembly (v2.0)

* **Charts on every screen** — all 8 control-tower views render live Chart.js visuals fed by the API: dashboard breach-rate & revenue-trend, ledger risk histogram / modality mix / category breach, SHAP + TCO stack on predictions, demurrage tiers + dwell clocks, SPC X-bar + SLA grid, market trends, Scope 3 doughnut + monthly stacked emissions.
* **Live AIS telemetry** — `backend/telemetry/ais_receiver.py` binds a real [AISstream.io](https://aisstream.io) WebSocket (`AISSTREAM_API_KEY`) with auto-reconnect across five trade-lane watch boxes; without a key, a **dead-reckoning drift simulator** keeps vessels moving (status reported truthfully as `SIM`).
* **Copilot box** — the AI Dispatch Copilot (`/api/ai/chat`) is grounded in a **live control-tower snapshot** (on-time SLA, demurrage exposure, AIS vessel count) injected into Groq Llama-3.3-70b, with an offline SOP fallback engine.
* **Investor pitch deck** — a keyboard-driven, 14-slide glassmorphic deck (Chart.js visualizations, print-ready) lives at **`/pitch/`** (see `pitch/index.html`).
* **Synthetic sandbox failover** — `backend/mock_store.py` materializes a deterministic 172,765-row replica when PostgreSQL is unreachable, so every screen stays fully functional for demos.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
