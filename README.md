# NexaFreight: Autonomous Multi-Modal Logistics Intelligence Platform
### Autonomous IoT-Enabled Logistics Control Tower & Dynamic Disruption Recovery Engine

[![Live Control Tower](https://img.shields.io/badge/Production-Live%20Control%20Tower-00C853?style=for-the-badge&logo=vercel&logoColor=white)](https://nexafreight.vercel.app/)
[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/rajmontana/NexaFreight)
[![Quality Gate](https://img.shields.io/badge/Automated%20Tests-1%2C252%20Passed%20(100%25)-brightgreen?style=for-the-badge&logo=pytest&logoColor=white)](https://github.com/rajmontana/NexaFreight)
[![Backend Engine](https://img.shields.io/badge/Backend-FastAPI%20%7C%20AnyIO-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Frontend UI](https://img.shields.io/badge/Frontend-Next.js%2016.4%20%7C%20React%2019-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%2016%20%7C%20Neon-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Container Security](https://img.shields.io/badge/Security-CIS%20Docker%20UID%2010001-blue?style=for-the-badge&logo=docker&logoColor=white)](https://www.cisecurity.org/)
[![Secret Scan](https://img.shields.io/badge/Secrets-Gitleaks%20Clean-success?style=for-the-badge&logo=git&logoColor=white)](https://github.com/gitleaks/gitleaks)

---

## 🏛️ Academic Institutional Context & Engineering Leadership

This project represents the **Major Capstone Engineering Project & Systems Audit Defense** developed within the **Department of Mechanical Engineering (MED)** at **Motilal Nehru National Institute of Technology (MNNIT) Allahabad**.

- **Academic Supervisor & Guide:** **Er. Mandeep Dhanda**, *Assistant Professor, Department of Mechanical Engineering (MED), MNNIT Allahabad*
- **Engineering Team (Group 1):**
  - **Raj Kumar Merugu (Project Lead):** *Lead Systems Architect, ML/OR Core, UI/UX Design, DevOps & GitHub CI/CD Ownership*
  - **Shanmukh Dhyaneshwar Peela:** *Full-Stack Frontend & Backend Engineering Lead (Next.js 16.4, Canvas Quadtree, FastAPI Core)*
  - **R Rahul:** *Data Engineering, Exploratory Data Analysis (EDA) & Ingestion Lead (AIS/ADS-B VHF Decoders, 4-Stage Fallback)*
  - **Sanat Kumar Maurya:** *Systems Auditor, Governance & Project Manager (22 Audit Findings, WORM Immutability Triggers, ADRs)*
- **Public Source Code Repository:** [`https://github.com/rajmontana/NexaFreight`](https://github.com/rajmontana/NexaFreight)
- **Production Cloud Deployment:** [`https://nexafreight.vercel.app/`](https://nexafreight.vercel.app/)
- **Active Working Branches:** `main` / `hardening-final` (Verified Commit: `2e05a2b` / `a9477f1`)
- **Automated Verification Matrix:** **1,252 Total Passing Tests** (891 Backend Pytest + 361 Frontend Vitest + Docker Non-Root UID 10001 + Gitleaks Secret Clean)

---

## 📖 Table of Contents

1. [Executive Summary & The Global Supply Chain Crisis](#-executive-summary--the-global-supply-chain-crisis)
2. [5-Phase Autonomous Operational Control Loop](#-5-phase-autonomous-operational-control-loop)
3. [System Architecture & Core Subsystems](#-system-architecture--core-subsystems)
4. [Heterogeneous IoT Ingestion & 4-Stage Fallback Pipeline](#-heterogeneous-iot-ingestion--4-stage-fallback-pipeline)
5. [Operations Research: Multimodal Multigraph Routing & MOSP Algorithms](#-operations-research-multimodal-multigraph-routing--mosp-algorithms)
6. [Environmental Standards & Demurrage Economic Modeling](#-environmental-standards--demurrage-economic-modeling)
7. [Machine Learning Engine & Leakage Auditing](#-machine-learning-engine--leakage-auditing)
8. [AI Operations Copilot Cascade & Guardrails](#-ai-operations-copilot-cascade--guardrails)
9. [Systems Security, Governance & Ledger Immutability](#-systems-security-governance--ledger-immutability)
10. [Automated Quality Gates & Test Suite Inventory](#-automated-quality-gates--test-suite-inventory)
11. [Quick Start & Companion Deployment Guide](#-quick-start--companion-deployment-guide)
12. [Academic Research Papers & Publications](#-academic-research-papers--publications)
13. [License & Citation](#-license--citation)

---

## 📌 Executive Summary & The Global Supply Chain Crisis

Modern global intermodal freight logistics coordinates over **11 billion metric tons** of containerized cargo annually across ocean carriers, electrified rail freight corridors, long-haul trucking networks, and air cargo freighters. However, international freight networks suffer from severe systemic fragility:

1. **Maritime Chokepoint Vulnerability:** Over 12% of global seaborne trade passes through narrow maritime straits including the Suez Canal, Bab-el-Mandeb (Red Sea), Strait of Hormuz, and Panama Canal. Geopolitical conflicts, military attacks, and severe droughts force vessels into massive multi-thousand-mile diversions around the Cape of Good Hope, adding 10 to 14 days of sailing time and cascading delays across global manufacturing supply chains.
2. **The "Dark Corridor" Batch Latency Problem:** Ocean carriers and container terminals still communicate using legacy Electronic Data Interchange (EDI) standards—principally **ANSI X12 EDI 315** (Ocean Status) and **EDI 214** (Motor Carrier Status). These updates are transmitted in batch windows spaced **4 to 12 hours apart**. When an inland container feeder train suffers a 12-hour signal failure in transit, the port gate cut-off window passes before the dispatcher even receives the delay manifest. The container is rolled to the next scheduled weekly liner ($H_k = 168\text{ hours}$ headway), inducing a catastrophic discrete delay.
3. **Punitive Demurrage & SLA Economics:** Uncoordinated container dwell in seaport yards triggers escalating demurrage and detention tariffs starting at **$150 to $450 per TEU per day**, doubling after contractual free time expires. Concurrently, enterprise shippers face strict **On-Time In-Full (OTIF)** delivery penalties assessed at **3% to 5% of gross invoice cargo value**.
4. **The Passive Tracking Trap:** Contemporary visibility platforms (e.g., standard GPS dashboards) display delays as passive dots on a map. When a disruption occurs, dispatchers spend **24 to 48 hours** manually telephoning brokers, checking spreadsheets, and guessing landed freight costs across alternative corridors.

**NexaFreight** transforms reactive tracking into an **autonomous, self-healing multi-modal logistics control tower**. Ingesting live maritime AIS transponders, aviation ADS-B squitters, and highway telematics, NexaFreight continuously evaluates transit risks, executes exact Multi-Objective Shortest Path (MOSP) Pareto rerouting, calculates GLEC v3.2 carbon emissions, and records non-repudiable decisions to an immutable PostgreSQL ledger.

---

## 🔄 5-Phase Autonomous Operational Control Loop

NexaFreight enforces a continuous, closed-loop cyber-physical architecture across all monitored transit corridors:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                      NEXAFREIGHT 5-PHASE AUTONOMOUS CONTROL LOOP                  │
└───────────────────────────────────────────────────────────────────────────────────┘

  [ PHASE 1: Real-Time Ingestion ]
    ├── AISStream WebSocket (ITU-R M.1371-5 Type 1, 2, 3 SOTDMA)
    ├── ADS-B Exchange (RTCA DO-260B Mode S Extended Squitter)
    └── OpenRouteService Road Geometries & CAN J1939 Telematics
              │
              ▼
  [ PHASE 2: State Estimation & Resilient Fallback ]
    ├── Redis 7 Sliding-Window Ring Buffer (30-min vessel cache)
    ├── Great-Circle Spherical Geodesic Dead-Reckoning (Eq. 5.1 - 5.3)
    └── Explicit Provenance Tagging: REAL | REPLAYED | SIMULATED | DERIVED
              │
              ▼
  [ PHASE 3: Anomaly & Disruption Detection ]
    ├── Geofence Polygon Intersection & Canal Closure Ingestion (Suez/Panama)
    ├── Port Anchorage Congestion via Spatial Kernel Density Estimation (KDE)
    └── Cross-Track Drift Thresholding (>15.0 nautical miles -> OFF_ROUTE)
              │
              ▼
  [ PHASE 4: Prescriptive Multimodal Pareto Optimization ]
    ├── Directed Multigraph G = (V, E, M) across Sea, Rail, Road, Air
    ├── Exact MOSP Label-Setting Algorithms: Martins (1984), MDA (2021), T-MDA (2023)
    ├── GLEC Framework v3.2 & ISO 14083 Carbon Accounting
    └── Tiered Piecewise Demurrage & SLA Liquidated Damages Optimization
              │
              ▼
  [ PHASE 5: Human Attestation & Cryptographic Ledger Execution ]
    ├── 1-Click Disruption Drawer with 3-Way Trade-Off Matrix (Accept vs Divert vs Shift)
    ├── Strict Role-Based Access Control (OPERATOR / ADMIN JWT Authorization)
    └── PostgreSQL Append-Only Immutability Ledger (BEFORE TRUNCATE Trigger P0001 + SHA-256 Chaining)
```

---

## 🏗️ System Architecture & Core Subsystems

NexaFreight is architected under the **C4 Software Architecture Model**, strictly decoupling high-frequency client-side geospatial rendering from analytical graph computation and transactional persistence.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SYSTEM TOPOLOGY OVERVIEW                               │
└────────────────────────────────────────────────────────────────────────────────────────┘

  TIER 1: PRESENTATION & TACTICAL GLOBE (Next.js 16.4 · React 19 · TypeScript · Tailwind)
    ├── Interactive Tactical Globe (MapLibre GL & Leaflet HTML5 Canvas Quadtree Rasterizer)
    ├── 60 FPS Sustained Rendering across 2,740 concurrent maritime & highway entities
    ├── Single-Use Ephemeral Stream Tickets for Server-Sent Events (SSE) (ADR-02)
    └── Same-Origin Reverse Proxy at /api/nexa/* shielding internal backend (ADR-01)
                                      │
                         HTTP REST / SSE Stream (JWT)
                                      ▼
  TIER 2: API ORCHESTRATION & GATEWAY (FastAPI · AnyIO · Uvicorn · Python 3.11-3.13)
    ├── Non-blocking AnyIO asynchronous event loop handling 100+ concurrent live SSE feeds
    ├── 59 Production REST Endpoints guarded by OAuth2 Bearer JWT and RBAC dependencies
    ├── Rate-Limiting Perimeter via SlowAPI (10 req/min on Copilot endpoints)
    └── Dynamic Model Introspection & Automated OpenAPI 3.1 Swagger Generation
                                      │
                     Internal Async Dispatch & Ingestion
                                      ▼
  TIER 3: OPERATIONS INTELLIGENCE & ANALYTICAL ENGINES
    ├── Multimodal Graph Router: Directed Multigraph G=(V,E,M) with exact Pareto solvers
    ├── Machine Learning Engines: LightGBM Delay Classifier & Quantile ETA Regressor (PAVA)
    ├── Demand Forecasting: StatsForecast AutoETS 13-week holdout pipeline
    └── AI Copilot Cascade: Tri-tier routing: Regex/SQL (0.2ms) -> Groq 70B -> Gemini 2.5
                                      │
                     SQLAlchemy 2.0 AsyncPG / Redis Protocol
                                      ▼
  TIER 4: PERSISTENCE, CACHE & CRYPTOGRAPHIC LEDGER
    ├── Neon Serverless PostgreSQL 16: Relational schema, composite spatial B-Tree indexes
    ├── Dual Database Triggers: BEFORE TRUNCATE (ERRCODE P0001) + Row-level modification lock
    ├── Cryptographic Hash Chaining: Linear SHA-256 chain H_i = SHA256(H_{i-1} || payload)
    └── Redis 7 Transient Cache: Sliding-window ring buffer & Pub/Sub geofence alert bus
```

### Architectural Decision Records (ADRs)

| ADR Identifier | Decision Adopted | Operational Rationale & Trade-Off Justification |
| :--- | :--- | :--- |
| **ADR-01: Same-Origin Reverse Proxy** | Next.js API route rewrites `/api/nexa/:path*` to backend service | Shields backend origin from public networks, eliminates CORS preflight round-trip latency, and prevents leaking long-lived tokens in public URLs. |
| **ADR-02: Single-Use Ephemeral Stream Tickets** | 60-second HMAC-signed tickets for EventSource SSE connections | Standard browser `EventSource` cannot send custom `Authorization: Bearer` headers. Ephemeral tickets expire in 60s and delete upon initial connection, preventing URL-logging token leakage. |
| **ADR-03: Dual Statement-Level Immutability** | PostgreSQL PL/pgSQL trigger `trg_audit_logs_no_truncate` raising `ERRCODE P0001` | SQL row triggers (`BEFORE UPDATE/DELETE`) do not fire on table-level `TRUNCATE` operations. Statement trigger seals the `audit_logs` ledger against mass truncation. |
| **ADR-04: Tri-Tier AI Copilot Cascade** | Deterministic Regex/SQL $\rightarrow$ Groq LPU Llama 3.3 70B $\rightarrow$ Google Gemini Flash | Quantitative queries (ETAs, costs, waybill lookup) are solved via deterministic SQL (0.2 ms). LLMs are reserved strictly for qualitative trade-off analysis, slashing token latency by 80%. |
| **ADR-05: CIS Docker Container Hardening** | Explicit non-root system user `nexafreight` (**UID 10001, GID 10001**) | Drops root privileges in production container images, eliminating container breakout vulnerabilities in compliance with CIS Docker Benchmark 4.1. |

---

## 📡 Heterogeneous IoT Ingestion & 4-Stage Fallback Pipeline

In global deep-sea transit, terrestrial VHF transponders (line-of-sight range $\approx 25\text{ nm}$) become unreachable. Satellite AIS constellations suffer orbital revisit gaps and message collisions resulting in **15 to 60-minute data blackouts**.

To maintain uninterrupted situational awareness without falsifying sensor veracity, NexaFreight enforces an automated **4-Stage Resilient Edge Fallback State Machine**:

```
[ STAGE 1: LIVE STREAM ]  ──(Socket Drop)──>  [ STAGE 2: RING BUFFER REPLAY ]
   Provenance: REAL                              Provenance: REPLAYED
   (AISStream / ADS-B)                           (Redis 7, last 1,000 coords)
           │                                                   │
           └──────────────(Timeout > 120s)─────────────────────┘
                                   │
                                   ▼
                     [ STAGE 3: DEAD-RECKONING ]
                        Provenance: SIMULATED
                        (Spherical Geodesic Kinematic Projection)
                                   │
                           (Timeout > 24 hrs)
                                   │
                                   ▼
                     [ STAGE 4: STATIC PORT ANCHOR ]
                        Provenance: SIMULATED / Replay
                        (Mandatory High-Contrast UI Badge Enforced)
```

### Spherical Geodesic Kinematic Equations

During satellite blackouts, intermediate coordinates $(\phi_t, \lambda_t)$ are projected along the vessel's last reported Speed Over Ground ($v$, SOG) and Course Over Ground ($\theta$, COG) over elapsed duration $\Delta t$ on Earth's mean spherical radius $R_{\text{earth}} \approx 6,371.0\text{ km}$:

$$\delta = \frac{v \cdot \Delta t}{R_{\text{earth}}}$$

$$\phi_t = \arcsin\left( \sin(\phi_0) \cos(\delta) + \cos(\phi_0) \sin(\delta) \cos(\theta) \right)$$

$$\lambda_t = \lambda_0 + \operatorname{atan2}\left( \sin(\theta) \sin(\delta) \cos(\phi_0), \; \cos(\delta) - \sin(\phi_0) \sin(\phi_t) \right)$$

Lateral route deviation is metered using the Great-Circle Haversine formula:

$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right), \quad d = 2 R_{\text{earth}} \arcsin(\sqrt{a})$$

If cross-track lateral error exceeds **15.0 nautical miles (27.78 km)**, the vessel state transitions to `OFF_ROUTE`.

---

## ⚡ Operations Research: Multimodal Multigraph Routing & MOSP Algorithms

NexaFreight formulates global transit networks as an event-expanded directed multigraph $G = (V, E, M)$ where $V$ represents container berths, rail ICDs, and airports, $E$ represents physical corridors, and $M \in \{\text{SEA}, \text{RAIL}, \text{ROAD}, \text{AIR}\}$ denotes transport mode.

### Exact Multi-Objective Shortest Path (MOSP) Problem

Each directed edge $e \in E$ carries a non-negative cost vector:

$$\mathbf{c}(e) = \big(c_1(e), \, c_2(e), \, c_3(e)\big)^T \in \mathbb{R}_{\ge 0}^3$$

where $c_1$ is financial cost (freight tariff + dwell demurrage), $c_2$ is transit duration (hours), and $c_3$ is greenhouse gas emissions (kg $\text{CO}_2\text{e}$).

A path cost vector $\mathbf{u}$ Pareto-dominates $\mathbf{v}$ ($\mathbf{u} \prec \mathbf{v}$) if and only if:

$$\forall i \in \{1, 2, 3\}, \; u_i \le v_i \quad \text{and} \quad \exists j \in \{1, 2, 3\}, \; u_j < v_j$$

### Controlled Comparison of Exact Label-Setting Algorithms

NexaFreight implements and empirically evaluates three exact MOSP label-setting algorithms under a strict zero-tolerance ($\varepsilon = 0$) Pareto dominance policy:

| Algorithmic Characteristic | Martins (1984) | Base MDA (2021) | Targeted MDA (T-MDA, 2023) |
| :--- | :--- | :--- | :--- |
| **Search Paradigm** | One-to-all label setting | One-to-all label setting | Target-directed one-to-one |
| **Queue Size Bound** | Unbounded ($\mathcal{O}(|\mathcal{P}^*|)$) | Strict bound: $\|Q\| \le \|V\|$ | Strict bound: $\|Q\| \le \|V\|$ |
| **Path Storage** | Explicit `MartinsLabel` per path | Implicit (per-arc processing index) | Explicit `TMDALabel` + per-arc NQP deques |
| **Heuristic Preprocessing** | None (0.0 ms) | None (0.0 ms) | 3 Reverse-Dijkstra trees ($\|\Sigma\| = 3$) |
| **Dominance Mechanism** | Pairwise 3D vector dominance | Pairwise 3D vector dominance | 2D dimensionality-reduced target front |

### Empirical Findings across 90 Benchmark Instances (1,890 Timed Solver Trials)

1. **Small Networks ($N \le 24$ services):** Classical **Martins (1984)** achieves lowest cold-query latency (0.30 ms vs 0.84 ms for T-MDA). T-MDA's reverse-Dijkstra preprocessing accounts for **51% to 58%** of total query time, which cannot be amortized on small graphs.
2. **Medium-to-Large Sparse Networks ($N \ge 48$ services):** **T-MDA (2023)** dominates, achieving a **1.41× speedup over Martins** and **2.19× speedup over MDA** at $N = 72$ on Family A corridors. Target-directed pruning eliminates over 80% of unpromising queue labels.
3. **Queue Invariant Cost in Dense Hubs:** Martins consistently outperforms base MDA by **1.56× to 2.40×** across all topologies. Enforcing $\|Q\| \le \|V\|$ in MDA requires per-step incoming-arc scanning ($\mathcal{O}(\text{indegree}(v))$), which degrades in dense hub-and-spoke networks.
4. **Memory Footprint:** Martins maintains the lowest memory footprint (14–168 KiB). T-MDA requires **1.8× to 3.1×** more memory (42–295 KiB) to store reverse shortest-path trees, ideal-point potential dictionaries $\boldsymbol{\pi}(v)$, and per-arc Non-Queue Path (NQP) deques.

---

## 🌿 Environmental Standards & Demurrage Economic Modeling

### Carbon Accounting (GLEC Framework v3.2 & ISO 14083:2023)

Trip emissions are metered using certified activity-based emission intensity factors across consignment mass $m$ (metric tonnes) and effective distance $d_k$ (kilometers):

$$E_{\text{trip}} = \sum_{k=1}^K \big( m \cdot d_k \cdot EF_k \big) \quad [\text{g CO}_2\text{e}]$$

- **Air Cargo (Dedicated Freighter Jet):** $602.0\text{ g CO}_2\text{e/t-km}$
- **Highway Trucking (Heavy Articulated Diesel >32t):** $62.0\text{ g CO}_2\text{e/t-km}$
- **Freight Rail (Electrified Heavy-Haul DFC):** $28.0\text{ g CO}_2\text{e/t-km}$
- **Ocean Container Shipping (Post-Panamax Container Vessel):** $8.0\text{ g CO}_2\text{e/t-km}$

### Progressive Demurrage & SLA Penalty Formulation

Total landed consignment cost integrates freight tariffs, customs duties, insurance, carbon penalties, and progressive port demurrage $D(t_{\text{dwell}})$:

$$C_{\text{total}} = C_{\text{freight}} + C_{\text{terminal}} + C_{\text{customs}} + C_{\text{insurance}} + C_{\text{carbon}} + D(t_{\text{dwell}})$$

Port demurrage and yard detention follow a progressive piecewise tariff:

$$D(t) = \begin{cases} 
\$0 & \text{for } t \le 3\text{ days (Contractual Free Time)} \\
\$150 \cdot (t - 3) & \text{for } 3 < t \le 7\text{ days (Standard Port Detention)} \\
\$600 + \$300 \cdot (t - 7) & \text{for } 7 < t \le 14\text{ days (Escalated Congestion)} \\
\$2,700 + \$450 \cdot (t - 14) & \text{for } t > 14\text{ days (Critical Terminal Blockade)}
\end{cases}$$

### Automated UNCTAD Red Sea Disruption Drill (`scripts/24_red_sea_drill.py`)

When the Bab-el-Mandeb strait is closed, vessels must divert around the Cape of Good Hope. NexaFreight's automated continuous integration test verifies detour distance ratios against official UNCTAD (2024) maritime benchmarks:

| Trade Corridor | Suez Passage | Cape Detour | Distance Ratio | UNCTAD Benchmark | Test Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Nhava Sheva (INJNP) $\rightarrow$ Rotterdam (NLRTM)** | 6,376 nm | 10,901 nm | **1.710** | Ref: $1.72 \pm 0.15$ (+201.5 hrs) | **PASS** |
| **Mundra (INMUN) $\rightarrow$ Rotterdam (NLRTM)** | 6,314 nm | 11,015 nm | **1.744** | Ref: $1.72 \pm 0.15$ (+209.9 hrs) | **PASS** |
| **Singapore (SGSIN) $\rightarrow$ Rotterdam (NLRTM)** | 8,388 nm | 10,434 nm | **1.244** | Ref: $1.25 \pm 0.08$ (+83.4 hrs) | **PASS** |

**Emergency Sea-Air Hybrid Corridor:** Offloading cargo at Port of Salalah (Oman), bonded trucking to Dubai World Central (DWC), and chartering widebody airfreight to Frankfurt (FRA) reduces transit duration from **34.2 days** (Cape detour) to **8.4 days** (saving 25.8 days) at an incremental freight cost of **$2.40/kg**, avoiding millions of dollars in factory stoppage penalties.

---

## 🤖 Machine Learning Engine & Leakage Auditing

NexaFreight incorporates three production machine learning models backed by strict feature store contracts (`backend/src/nexafreight/ml/`):

### 1. LightGBM Binary Delay Risk Classifier
- Evaluates 14 route, financial, and seasonal features to predict probability $P(\text{Delay}) \in [0.0, 1.0]$.
- **Target Leakage Discovery:** Univariate feature importance revealed that administrative planning variable `scheduled_shipping_days` yielded an apparent ROC-AUC of **0.7289** (>92% of learnable variance).
- **1,000-Iteration Bootstrap Validation:** Ablating administrative features yielded a paired $\Delta\text{ROC-AUC}$ 95% Confidence Interval of $[-0.0075, +0.0044]$ crossing zero, proving that additional sensor features offered zero statistical lift on synthetic data and exposing synthetic generation leakage.
- **External Real-World Validation (Olist Corpus — 96,470 Deliveries):** On the authentic Brazilian E-Commerce logistics dataset, 5-fold stratified cross-validation achieved **91.89% ± 0.04% classification accuracy**, **0.7641 ± 0.0044 ROC-AUC**, and **Brier loss of 0.0678**, proving outstanding predictive capability on un-leaked physical data.
- **Threshold Optimization:** Calibrated via Youden's $J$ statistic ($J = \text{TPR} - \text{FPR}$) to optimal threshold $\tau^* = 0.5746$.

### 2. LightGBM Quantile ETA Regressor & Monotonic Repair
- Predicts asymmetric arrival windows at percentiles $P_{10}$, $P_{50}$, and $P_{85}$ by minimizing check loss:

$$L_q(y, \hat{y}) = \max\big( q(y - \hat{y}), \, (1-q)(\hat{y} - y) \big)$$

- **PAVA Monotonic Correction:** Eliminates quantile crossing anomalies ($\hat{y}_{0.85} < \hat{y}_{0.50}$) using the Pool Adjacent Violators Algorithm (PAVA), achieving **100.0% monotonic consistency**.
- **Empirical Coverage Calibration:** Evaluated against 8,109 holdout rows: $P_{10}$ coverage = 9.66% (nominal 10%), $P_{50}$ coverage = 51.77% (nominal 50%), and $P_{85}$ coverage = 83.66% (nominal 85%), providing statistically dependable risk intervals.

### 3. Weekly Corridor Demand Forecasting (StatsForecast AutoETS)
- Evaluated over a strict 13-week holdout horizon (2017-W44 to 2018-W04) across 79 high-volume freight lanes.
- Achieved Weighted Absolute Percentage Error (**WAPE**) of **32.16%** compared to **44.02%** for a 4-week SeasonalNaive baseline, representing a **+26.94% relative forecasting improvement**.

---

## 🧠 AI Operations Copilot Cascade & Guardrails

To prevent LLM hallucination of financial costs and maritime schedules, the NexaFreight AI Copilot (`backend/src/nexafreight/services/copilot.py`) executes a strict tri-tier cascading architecture:

```
[ Operator Inquiry ] ───> [ 1. Regex Classifier ] ──(Quantitative)──> [ Deterministic SQL Query ]
                                    │                                  (0.2 ms · Zero Hallucination)
                                    ▼ (Qualitative / Trade-Off)
                         [ 2. Groq LPU Cascade ]
                            Primary: Groq Cloud Llama 3.3 70B (420 ms latency)
                            Fallback 1: Google Gemini 2.5 Flash
                            Fallback 2: Google Gemini 1.5 Pro
                            Fallback 3: Domain Expert Rule Engine
                                    │
                                    ▼
                         [ 3. Strict Pydantic JSON Schema Validation ]
                            CopilotDecisionSchema(decision_type, financial_impact, ...)
                                    │
                                    ▼
                         [ 4. Append to Immutable Audit Ledger ]
                            Cryptographic SHA-256 Prompt & Output Hashing
```

---

## 🔒 Systems Security, Governance & Ledger Immutability

NexaFreight underwent a comprehensive **22-point technical systems audit** across Security (SEC), Deployment (DEP), Documentation (DOC), and Machine Learning (ML):

1. **WORM Database Ledger Immutability:**
   - Additive Alembic migration `c3d4e5f6a7b8` deployed statement-level trigger `trg_audit_logs_no_truncate`.
   - Any SQL attempt to execute `TRUNCATE TABLE audit_logs` is intercepted and raises PostgreSQL exception **ERRCODE P0001**, permanently protecting regulatory evidence.
2. **Cryptographic SHA-256 Hash Chaining:**
   - Every operational audit log row records a cryptographic digest incorporating the preceding entry's hash:
     $$H_i = \text{SHA256}\big( H_{i-1} \parallel \text{user\_id} \parallel \text{action} \parallel \text{timestamp} \parallel \text{payload\_hash} \big)$$
3. **Attack Surface Pruning (65.6% Slashing):**
   - Audited 32 frontend API route handlers; permanently deleted **21 dead, unauthenticated proxy stubs** (`/api/ai/*`, `/api/cyber-attacks`, `/api/radar`).
   - Retained routes secured with mandatory Bearer JWT verification.
4. **Container Privilege Isolation:**
   - Hardened `backend/Dockerfile` and `docker/Dockerfile.backend` to execute exclusively under unprivileged user `nexafreight` (**UID 10001, GID 10001**), satisfying CIS Docker Benchmark 4.1.

---

## 🧪 Automated Quality Gates & Test Suite Inventory

The NexaFreight test harness is architected under a multi-tier testing pyramid balancing execution velocity with environment fidelity:

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

## 🚀 Quick Start & Companion Deployment Guide

For exhaustive, copy-pasteable, zero-assumptions setup instructions covering both local desktop reproduction and production cloud deployment, refer to the dedicated companion document:

### 📄 [**DEPLOYMENT.md — Complete Local & Cloud Deployment Runbook**](DEPLOYMENT.md)

### Quick Local Clone & Run Summary:

```bash
# 1. Clone repository and checkout hardened branch
git clone https://github.com/rajmontana/NexaFreight.git
cd NexaFreight
git checkout hardening-final

# 2. Setup Backend Virtual Environment
cd backend
python -m venv .venv
# On Windows: .venv\Scripts\activate | On Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt

# 3. Configure Environment & Run Database Migrations
cp .env.example .env
alembic upgrade head

# 4. Bootstrap Default Users & Seed Fleet
python scripts/seed_user.py
python scripts/seed_demo_data.py

# 5. Run Backend Automated Test Suite
pytest -q  # Confirms 891 passed, 5 xfailed

# 6. Setup and Start Frontend
cd ../frontend
npm install
npm test -- --run  # Confirms 361 passed
npm run dev        # Starts dashboard at http://localhost:3000

# 7. Start Backend Server
cd ../backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 📄 Academic Research Papers & Publications

The theoretical algorithms, mathematical graph formulations, and empirical findings of this project are documented across three formal academic publications:

1. **Master Systems Engineering & Audit Report:**
   * *NexaFreight Control Tower: Multi-Modal Logistics Intelligence Platform — Comprehensive Systems Architecture, Operations Research, Machine Learning Governance, and Technical Security Audit* (51 Pages, 28 Tables, 14 Equations).
   * Location: [`Final_Submission_IOT/Detailed_Project_Report_NexaFreight.pdf`](Final_Submission_IOT/Detailed_Project_Report_NexaFreight.pdf)
2. **Academic Conference Research Paper:**
   * *An Experimental Evaluation of Exact Multiobjective Shortest-Path Algorithms for Scheduled Multimodal Freight Networks* (20 Pages, 6 Tables, 7 Figures, 13 References).
   * Focus: Controlled experimental comparison of Martins (1984), MDA (2021), and T-MDA (2023) across 90 instances (1,890 timed solver trials).
   * Location: [`Final_Submission_IOT/Conference_Paper_NexaFreight.pdf`](Final_Submission_IOT/Conference_Paper_NexaFreight.pdf)
3. **Executive Defense Presentation & Slide Deck:**
   * *NexaFreight: Autonomous Multimodal Logistics Control Tower — Transforming Reactive Global Supply Chains* (24 Slides, 16:9 Executive Deck).
   * Location: [`Final_Submission_IOT/Final_Presentation_NexaFreight.pptx`](Final_Submission_IOT/Final_Presentation_NexaFreight.pptx) and [`NexaFreight-fresh/PRESENTATION_SLIDES_CONTENT.md`](NexaFreight-fresh/PRESENTATION_SLIDES_CONTENT.md)

---

## ⚖️ License & Citation

Distributed under the **MIT License**. See `LICENSE` for details.

### Citation Format (BibTeX)

```bibtex
@mastersthesis{merugu2026nexafreight,
  author    = {Merugu, Raj Kumar and Peela, Shanmukh Dhyaneshwar and Rahul, R and Maurya, Sanat Kumar},
  title     = {NexaFreight: Autonomous Multi-Modal Logistics Intelligence Platform and Exact MOSP Control Tower},
  school    = {Motilal Nehru National Institute of Technology (MNNIT) Allahabad},
  department= {Department of Mechanical Engineering},
  supervisor= {Dhanda, Mandeep},
  year      = {2026},
  month     = {November},
  url       = {https://github.com/rajmontana/NexaFreight}
}
```

---
*Verified Ground Truth Record — Motilal Nehru National Institute of Technology (MNNIT) Allahabad · Department of Mechanical Engineering (MED) · November 12, 2026.*
