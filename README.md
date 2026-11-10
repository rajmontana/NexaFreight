# NexaFreight: Autonomous IoT-Enabled Multi-Modal Logistics Control Tower
### Academic Capstone Project & Final Defense Submission
**Course:** Internet of Things (IoT) Engineering  
**Lead Systems Architect & Author:** `<author>` (`<author-email>`)  
**Git Working Branch:** `hardening-final` (Commit `bc7a500`)  
**Repository Working Directory:** `<repo>`  
**Automated Quality Gates:** 1,252 Automated Tests Verified (891 Pytest, 361 Vitest, Docker UID 10001, Gitleaks Clean)

---

## 📦 Academic Submission Package Contents

This folder contains the complete formal submission package required for the **Internet of Things (IoT) Course Final Defense and Faculty Evaluation**:

```
Final_Submission_IOT/
├── 01_Detailed_Project_Report/
│   ├── Detailed_Project_Report_NexaFreight.docx    # 43-Page Complete Technical Project Report (MS Word)
│   └── Detailed_Project_Report_NexaFreight.pdf     # 43-Page Formal Engineering PDF (15 Chapters, 24 Tables, 9 Figures)
├── 02_Conference_Paper/
│   ├── Conference_Paper_NexaFreight.docx           # 12-Page IEEE / ACM Style Academic Conference Paper (MS Word)
│   └── Conference_Paper_NexaFreight.pdf            # 12-Page Formal Conference PDF (Abstract, Sections I-X, References)
├── 03_Final_Presentation/
│   └── Final_Presentation_NexaFreight.pptx         # 24-Slide Executive 16:9 Presentation (Faculty Feedback & Member Breakdown)
├── 04_Source_Code_Documentation/
│   ├── README.md                                   # Complete Systems Engineering & Reproduction Documentation
│   ├── ARCHITECTURE.md                             # 5-Phase Closed-Loop Control Architecture Reference
│   └── figures/                                    # 9 High-Resolution Vector Architectural & Evaluation Diagrams
└── README.md                                       # Master Package Index & Faculty Quick-Start Guide
```

---

## 📌 Executive Summary & Problem Formulation

Global intermodal supply chains transport over **11 billion metric tons** of containerized cargo annually across fragmented maritime, freight rail, long-haul trucking, and air cargo networks. Contemporary logistics coordination relies heavily on legacy **Electronic Data Interchange (EDI)** standards—principally **ANSI X12 214** (Carrier Shipment Status) and **EDI 315** (Ocean Status). 

Carriers and container terminals transmit these EDI updates in batch synchronization windows spaced **4 to 12 hours apart**. In high-velocity intermodal transport, this batch latency induces dangerous **"dark corridors"** where railhead congestion, terminal dwell delays, and chokepoint disruptions accumulate unnoticed. When an inland feeder misses an ocean port gate cut-off window, the shipment suffers a discrete step penalty equal to the weekly vessel line headway ($H_k = 168	ext{ hours}$ / 7 days), triggering compounding port yard demurrage penalties exceeding **$300 per TEU per day**.

**NexaFreight** solves this fundamental defect by replacing passive batch EDI polling with an **autonomous closed-loop cyber-physical IoT control tower**. Continuously ingesting heterogeneous real-time sensor streams, the platform performs edge state estimation, automated anomaly detection, scalarized Pareto multigraph rerouting, and cryptographic ledger immutability.

---

## 🏗️ 5-Phase Closed-Loop Control Architecture

NexaFreight organizes end-to-end logistics coordination into a synchronized 5-phase control loop:

```
[ Phase 1: Ingestion ] ────────> [ Phase 2: State Estimation ] ────────> [ Phase 3: Anomaly Detection ]
Heterogeneous IoT Sensors         Spherical Geodesic Dead-Reckoning       Spatial Geofences & Anchorage Queues
(AIS VHF, ADS-B, J1939)           Kalman Velocity Smoothing               Off-Route Drift & Canal Closures
                                                                                         │
                                                                                         ▼
[ Phase 5: Supervisory Action ] <─────────────────────────────────── [ Phase 4: Pareto Optimization ]
WebSocket Dispatch Desk                                                Multigraph Dijkstra (Time, Cost, ESG)
PostgreSQL Immutable Ledger                                            GLEC v3.2 Carbon Accounting
```

1. **Phase 1 (Heterogeneous IoT Telemetry Ingestion):** Ingests real-time maritime AIS VHF transponder broadcasts, aviation ADS-B Mode S squitters, and highway CAN bus OBD-II telematics.
2. **Phase 2 (Continuous Kinematic State Estimation):** Executes spherical great-circle dead-reckoning and Kalman filtering to project vessel/vehicle positions during satellite sensor blackouts.
3. **Phase 3 (Automated Disruption Detection):** Monitors spatial geofence polygons, canal blockades, vessel cross-track drift (>15 nautical miles), and port terminal dwell queues.
4. **Phase 4 (Multi-Objective Pareto Optimization):** Dynamically calculates optimal multimodal detours over directed multigraph $G=(V, E, M)$ balancing transit duration, freight tariffs, demurrage risk, and GLEC v3.2 carbon emissions.
5. **Phase 5 (Supervised Supervisory Action):** Presents recommended detours to human dispatchers via live WebSocket streams; requires cryptographic role verification (OPERATOR or ADMIN) and logs decisions to an immutable ledger.

---

## 📡 IoT Sensor Layer & Telemetry Protocols

| Telemetry Modality | Protocol & Standard | Operating Frequencies | Data Frame Architecture | Sensor Telemetry Extracted | Edge Resiliency Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Maritime Shipping** | **ITU-R M.1371-5 SOTDMA** | 161.975 MHz (AIS 1)<br>162.025 MHz (AIS 2) | GMSK modulation @ 9.6 kbps; 2,250 time slots/min (26.67 ms slot) | MMSI, SOG (0.1 kt), COG (0.1°), Heading, WGS-84 Lat/Lon, Nav Status | Redis 7 ring buffer replay -> Spherical dead-reckoning fallback |
| **Aviation Air Cargo** | **RTCA DO-260B Mode S** | 1090 MHz Pulse Position Modulation (PPM) | 1 Mbps, 112-bit Extended Squitter; Downlink Format 17 (DF=17) | ICAO 24-bit address, barometric altitude, groundspeed, track angle, Lat/Lon | Great-circle waypoint projection via spherical trigonometry |
| **Highway Drayage** | **SAE J1939 CAN 2.0B / OBD-II** | 250 kbps / 500 kbps twisted pair | 29-bit extended CAN identifier; Quectel BG96 4G LTE-M / NB-IoT | PGN 65265 (Speed), PGN 65266 (Fuel), PGN 65248 (Odometer), NMEA-0183 | Autonomous cellular re-uplink; local non-volatile flash logging |

---

## 🛡️ Edge Resiliency: 4-Stage Fallback Pipeline

In deep-ocean transit, coastal VHF transponders (line-of-sight ~25 nm) become unreachable, necessitating reliance on low-Earth orbit (LEO) satellite AIS. Due to orbital revisit windows and packet collisions, satellite AIS experiences latency gaps of **15 to 60 minutes**. 

To maintain continuous situational awareness without misrepresenting sensor veracity, NexaFreight enforces a **4-Stage Edge Fallback State Machine**:

```
[ Stage 1: LIVE STREAM ]  ──(Socket Drop)──>  [ Stage 2: RING BUFFER REPLAY ]
   Provenance: REAL                              Provenance: REPLAYED
   (AISStream / ADS-B)                           (Redis 7, last 1,000 coords)
           │                                                   │
           └──────────────(Timeout > 120s)─────────────────────┘
                                   │
                                   ▼
                     [ Stage 3: DEAD-RECKONING ]
                        Provenance: SIMULATED
                        (Great-Circle Kinematic Projection)
                                   │
                           (Timeout > 24 hrs)
                                   │
                                   ▼
                     [ Stage 4: STATIC PORT ANCHOR ]
                        Provenance: SIMULATED / Replay
                        (Mandatory UI Map Badge Enforced)
```

### Spherical Geodesic Kinematic Equations
During blackout periods, the engine projects updated position coordinates $(\phi_t, \lambda_t)$ along the vessel's last reported speed $v$ (SOG) and course heading $	heta$ (COG) over elapsed duration $\Delta t$ on Earth's mean radius $R_{	ext{earth}} pprox 6,371.0	ext{ km}$:

$$\delta = rac{v \cdot \Delta t}{R_{	ext{earth}}}$$

$$\phi_t = rcsin\left( \sin(\phi_0) \cos(\delta) + \cos(\phi_0) \sin(\delta) \cos(	heta) ight)$$

$$\lambda_t = \lambda_0 + 	ext{atan2}\left( \sin(	heta) \sin(\delta) \cos(\phi_0), \; \cos(\delta) - \sin(\phi_0) \sin(\phi_t) ight)$$

Cross-track error is monitored via the Haversine equation:

$$a = \sin^2\left(rac{\Delta\phi}{2}ight) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(rac{\Delta\lambda}{2}ight), \quad d = 2 R_{	ext{earth}} rcsin(\sqrt{a})$$

If cross-track lateral deviation exceeds **15.0 nautical miles (27.78 km)**, the vessel state transitions to `OFF_ROUTE`.

---

## 🌍 Multimodal Multigraph Routing & Red Sea Disruption Replay

NexaFreight models international logistics as a directed multigraph $G = (V, E, M)$ where $V$ represents container terminals and ICDs, $E$ represents physical corridors, and $M \in \{	ext{SEA}, 	ext{RAIL}, 	ext{ROAD}, 	ext{AIR}\}$ denotes transport mode.

### Scalarized Pareto Objective Function
$$\min_{P \subset E} J(P) = w_1 \sum_{e \in P} C_e + w_2 \sum_{e \in P} T_e + w_3 \sum_{e \in P} E_e + w_4 \sum_{e \in P} R_e \quad 	ext{s.t.} \quad \sum T_e \le T_{\max}, \quad \sum w_i = 1.0$$

### Intermodal Transfer Penalties
$$T_{	ext{total}}(P) = \sum_{e \in P} T_e + \sum_{v \in P} \left( 	ext{Dwell}_v + T_{	ext{LoLo}} + T_{	ext{customs}} ight)$$

Where $T_{	ext{LoLo}}$ is crane lift-on/lift-off handling delay (2.5 hrs/100 TEU), and $T_{	ext{customs}}$ is regulatory inspection latency. If total duration breaches port gate cut-off $t_{	ext{cutoff}}$, a discrete liner headway penalty is applied: $	au_{	ext{missed}} = 	au_{	ext{actual}} + H_k$ (168 hours).

### Carbon Accounting (GLEC v3.2 & ISO 14083)
$$E_e = d_e \cdot m \cdot EF_m \quad [	ext{g CO}_2	ext{e}]$$
*Emission Factors:* SEA: 8.0 g CO₂e/t-km; RAIL: 28.0 g CO₂e/t-km; ROAD: 62.0 g CO₂e/t-km; AIR: 602.0 g CO₂e/t-km. (*Note:* SEA and RAIL reflect codebase default constants whose basis is not independently verified).

### Empirical Red Sea Disruption Replay (`scripts/24_red_sea_drill.py`)
| Trade Corridor & Port Pair | Suez Distance | Cape Detour Distance | Distance Ratio | UNCTAD 2024 Benchmark | Automated Test Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Nhava Sheva (INJNP) → Rotterdam (NLRTM)** | 6,376 nm | 10,901 nm | **1.710** | Ref: 1.72 ± 0.15 (+201.5 hrs) | **PASS** |
| **Mundra (INMUN) → Rotterdam (NLRTM)** | 6,314 nm | 11,015 nm | **1.744** | Ref: 1.72 ± 0.15 (+209.9 hrs) | **PASS** |
| **Singapore (SGSIN) → Rotterdam (NLRTM)** | 8,388 nm | 10,434 nm | **1.244** | Ref: 1.25 ± 0.08 (+83.4 hrs) | **PASS** |

**Dynamic Sea-Air Hybrid Corridor:** Offloading at Port of Salalah (Oman), bonded trucking to Dubai World Central (DWC), and charter airfreighting to Frankfurt (FRA) reduces transit duration from **34.2 days** (Cape detour) to **8.4 days** at an incremental tariff of **$2.40/kg**, preventing assembly-line shutdowns.

---

## 🤖 Predictive Machine Learning & Leakage Auditing

1. **LightGBM Delay Risk Classifier:**
   - Early experiments reported test ROC-AUC of 0.7273 across 14 engineered features.
   - **Target Leakage Discovery:** Univariate ranking proved that a single administrative planning variable—`scheduled_shipping_days`—alone achieves **ROC-AUC = 0.7289** (>92% of learnable variance).
   - **1,000-Iteration Paired Bootstrap Test (`scripts/20_bootstrap_roc_ci.py`):** Adding the remaining 13 physical sensor features yields $\Delta	ext{ROC-AUC} = -0.0016$ with 95% Confidence Interval $[-0.0075, +0.0044]$. Because the CI crosses zero, the incremental predictive contribution of the remaining features is statistically null, exposing synthetic data generation artifacts.
2. **Probabilistic Quantile ETA Regression & Isotonic Monotonic Repair:**
   - Evaluates 10th, 50th, and 90th transit time percentiles by minimizing asymmetric pinball loss:
     $$L_q(y, \hat{y}) = \max( q(y - \hat{y}), (1-q)(\hat{y} - y) )$$
   - Solves quantile crossing defects ($\hat{y}_{0.90} < \hat{y}_{0.50}$) via post-processing isotonic rearrangement using the **Pool Adjacent Violators Algorithm (PAVA)**.
   - Pinball loss improvements vs empirical lane baseline: **-0.23% ($q_{10}$)**, **-0.36% ($q_{50}$)**, **-1.94% ($q_{90}$)**.
   - Empirical coverage: **10.2%** (target 10%), **50.1%** (target 50%), **89.8%** (target 90%).
3. **Corridor Volume Demand Forecasting:**
   - Evaluated on StatsForecast AutoETS over an isolated 13-week holdout split.
   - Achieves Weighted Absolute Percentage Error (**WAPE**) of **32.16%** vs **44.02%** for Seasonal Naive baseline (**11.86 pp accuracy gain**).

---

## 🔒 Systems Hardening & Security Architecture

1. **Database Ledger Immutability:**
   - Row-level trigger `trg_audit_logs_no_modify` blocks row UPDATE and DELETE attempts.
   - Statement-level trigger `trg_audit_logs_no_truncate` (Migration `c3d4e5f6a7b8`) executes `BEFORE TRUNCATE` and raises `ERRCODE 'P0001'`, preventing mass audit ledger destruction.
2. **Frontend Attack Surface Pruning:**
   - Audited all 32 Next.js API endpoints under `frontend/src/app/api/`.
   - Identified and permanently deleted **21 dead, unauthenticated mock endpoints** with zero UI references, slashing the frontend attack surface by **65.6%**.
   - Remaining 11 active routes enforced with Bearer JWT tokens.
3. **Container Isolation (CIS Docker Benchmark 4.1):**
   - Dropped root execution across backend Dockerfiles.
   - Configured unprivileged system user `nexafreight` (**UID 10001**).
4. **Autonomous AI Copilot Guardrails:**
   - High-speed primary provider: **Groq Cloud Llama 3.3 70B** on LPUs (>280 tokens/sec, $T=0.1$).
   - 4-Tier fallback: Groq 70B -> Gemini 2.5 Flash -> Gemini 1.5 Pro -> Deterministic Rule fallback.
   - Quantitative inquiries execute deterministic SQL queries; every prompt and output logged with SHA-256 hashes.
5. **Frontend Rendering Optimization:**
   - Migrated vessel rendering from SVG DOM elements (>8,200 elements, 18 FPS) to **Leaflet Canvas with quadtree indexing** (`L.canvas({ padding: 0.5 })`).
   - Sustains **60 FPS** at 8.2ms per frame across 2,740 concurrent vessel markers.

---

## 🧪 Comprehensive Verification Matrix

The codebase has been verified across **1,252 automated test cases** and security quality gates:

```
========================================================================================
Test Suite & Quality Gate            Toolchain Engine         Verified Count & Outcome
========================================================================================
Backend Unit & Security Suite        Pytest 8.3 / AsyncIO     891 passed, 5 xfail, 0 failed
Frontend Component & Hook Suite      Vitest 3.2 / React 19    361 passed across 26 test files
PostgreSQL 16 Service Container      GitHub Actions Suite     240+ integration tests green
Container Privilege Isolation        CIS Docker 4.1           UID 10001 (system user)
Secret Scanner Gate                  Gitleaks 8.18            Zero un-allowlisted credentials
========================================================================================
TOTAL AUTOMATED TEST VERIFICATIONS   1,252 Tests Verified     100% Pass Rate (0 Failures)
========================================================================================
```

---

## 🛠️ Reproduction & Execution Protocol

### 1. Prerequisites
- **Python:** 3.11 or higher
- **Node.js:** 20.x or higher (npm 10+)
- **PostgreSQL:** 16 (or SQLite for local development)
- **Redis:** 7.x (for telemetry ring buffer)

### 2. Environment Setup
```bash
# Clone and enter working directory
git checkout hardening-final

# Setup Backend Virtual Environment
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate
pip install -r requirements.txt

# Setup Frontend
cd ../frontend
npm install
```

### 3. Database Migration & Seeding
```bash
cd ../backend
# Apply additive database migrations
alembic upgrade head

# Seed initial multimodal shipping nodes and active vessels
python scripts/seed_db.py
```

### 4. Running the Complete Verification Suite
```bash
# Run Backend Pytest Suite (891 tests)
pytest -v --tb=short

# Run Frontend Vitest Suite (361 tests)
cd ../frontend
npm test -- --run

# Run TypeScript Typecheck & Production Build
npm run typecheck
npm run build
```

### 5. Executing Key Empirical Verification Scripts
```bash
cd ../backend

# 1. Execute Red Sea Disruption Replay Drill (Verifies UNCTAD 2024 ratios)
python scripts/24_red_sea_drill.py

# 2. Execute 1,000-Iteration Bootstrap Target Leakage Test
python scripts/20_bootstrap_roc_ci.py

# 3. Verify Quantile ETA Monotonic Repair & Pinball Loss
python scripts/23_verify_quantile_monotonicity.py

# 4. Verify Database Immutability Statement Triggers (ERRCODE P0001)
python scripts/verify_audit_trigger.py
```

### 6. Starting Development Servers
```bash
# Terminal 1: FastAPI Backend Service (Port 8000)
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Next.js Frontend Dashboard (Port 3000)
cd frontend
npm run dev
```
Navigate browser to `http://localhost:3000` to access the live dispatch control tower.

---

## 👥 Course Milestone Reviews & Team Member Work Distribution

### Weekly Review Presentations & Post-Presentation Improvements
| Review Milestone | Date & Focus | Faculty Review Critique & Questions | Post-Presentation Engineering Improvements |
| :--- | :--- | :--- | :--- |
| **Milestone 1** | Week 2 (Aug 28) | Scope too broad; questioned reliance on batch EDI standards. | Formulated 5-phase control loop; integrated live AIS VHF and ADS-B decoders. |
| **Milestone 2** | Week 4 (Sep 18) | AIS dropouts in deep-sea transit cause tracking failures. | Built 4-stage edge fallback with Redis ring buffer and spherical dead-reckoning. |
| **Milestone 3** | Week 6 (Oct 09) | Detour routing too simplistic; ignored demurrage and carbon. | Implemented multigraph Pareto Dijkstra with GLEC v3.2 carbon accounting. |
| **Milestone 4** | Week 8 (Oct 23) | Questioned 0.72+ ROC-AUC; suspected synthetic target leakage. | Executed 1,000 bootstrap test; proved CI crosses zero; disclosed administrative leakage. |
| **Milestone 5** | Week 10 (Nov 06) | LLM copilot hallucination risks; audit table truncation risk. | Engineered 4-tier LLM cascade; implemented BEFORE TRUNCATE trigger (P0001). |
| **Milestone 6** | Week 11 (Nov 10) | Mock API routes and root container violate security benchmarks. | Deleted 21 dead routes; hardened Docker to UID 10001; verified 1,252 tests. |

### Individual Work Allocations
- **Member 1 (IoT & Hardware Subsystems):** Sensor Ingestion & Edge State Estimation. Integrated ITU-R M.1371-5 AIS VHF and RTCA DO-260B ADS-B streams. Built 4-stage edge fallback pipeline with Redis ring buffer replay. Derived spherical geodesic dead-reckoning and Haversine cross-track algorithms.
- **Member 2 (Operations Research & ML):** Multimodal Optimization & Predictive Modeling. Formulated multi-objective Pareto multigraph Dijkstra routing solver. Implemented GLEC v3.2 / ISO 14083 carbon accounting engine. Audited LightGBM target leakage; implemented quantile isotonic monotonic repair.
- **Member 3 (Full-Stack & UI Architecture):** Cloud Frontend & Dispatch Visualization. Engineered Next.js 16.4 and React 19 dispatch dashboard. Implemented Leaflet Canvas quadtree rasterization (sustaining 60 FPS at 2,740 vessels). Built real-time WebSocket/SSE live telemetry dispatch streams.
- **Member 4 (Security & Audit Governance):** Ledger Immutability & Systems Hardening. Authored PL/pgSQL statement-level immutable triggers (ERRCODE P0001). Executed frontend attack surface pruning (deleted 21 mock routes). Hardened Docker containers to non-root UID 10001; verified 1,252 automated tests.

---

## 📜 Academic Integrity & Engineering Sign-Off

The undersigned engineering team certifies that this submission package represents authentic, reproducible engineering work conducted on branch `hardening-final` (commit `bc7a500`). All numerical assertions, benchmarks, test counts, and mathematical formulations are grounded exclusively in verified codebase telemetry.

**Lead Systems Architect & Project Representative:** `<author>`  
**Date of Submission:** November 10, 2026  
**Final Status:** APPROVED FOR FACULTY DEFENSE & COURSE EVALUATION
