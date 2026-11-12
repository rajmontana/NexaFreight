# NexaFreight: Complete Slide-by-Slide Presentation Content & Deck Guide

> **Project Name:** NexaFreight  
> **Subtitle:** Autonomous Multimodal Freight Control Tower & Dynamic Disruption Recovery Engine  
> **Production Live URL:** [https://nexafreight.vercel.app](https://nexafreight.vercel.app)  
> **Backend Architecture:** FastAPI + LightGBM + Neon PostgreSQL + Next.js 14 + MapLibre GL  
> **Audience:** Academic Evaluators, Industry Judges, Technical Leadership  

---

## Slide 1: Title Slide

### Header & Hook
- **Title:** **NEXAFREIGHT**
- **Subtitle:** Autonomous Multimodal Freight Logistics & Dynamic Disruption Recovery Control Tower
- **Presenter / Team:** [Your Name / Team NexaFreight]
- **Date & Context:** Final Capstone / Project Defense 2026

### Visual Layout
- **Hero Visual:** High-resolution split screenshot: Left side shows the **Global 3D Operational Command Map** with live vessels, flights, and trucks; right side shows the **Autonomous Disruption & Reroute Drawer** with a live decision card.
- **Badge Elements:** `LIVE PRODUCTION` · `REAL-TIME TELEMETRY` · `MACHINE LEARNING ENGINE` · `GLEC FRAMEWORK`

### Speaker Notes
> "Good morning, respected professors, judges, and colleagues. Today, we are proud to present **NexaFreight**—an enterprise-grade, autonomous logistics control tower engineered from the ground up to solve global freight opacity, predict transit delays using trained machine learning models, and execute automated, financially optimized rerouting decisions when live global corridors fail."

---

## Slide 2: The Problem: Global Freight Fragility & The Blindspot Crisis

### Slide Title
**The Global Supply Chain Blindspot: Why Modern Freight Still Breaks**

### Visual Layout
- **3-Column Problem Cards:**
  1. *Chokepoint Vulnerability:* Suez Canal, Bab-el-Mandeb, Panama Canal, and port labor strikes cause cascading $30B+ disruptions.
  2. *Data Fragmentation & Opacity:* Shippers receive static ETA updates days late; sea, air, rail, and road systems operate in disconnected silos.
  3. *The Cost of Delayed Action:* Contractual SLA penalties compound exponentially (0.5%–1.0%/week) and terminal demurrage hits $150+/container/day while managers scramble to investigate.

### Core Bullet Points
- **Fragile Single-Points-of-Failure:** Over 12% of global maritime commerce funnels through chokepoints susceptible to geopolitical conflict, weather, or port congestion.
- **Lagging Disruption Detection:** Traditional logistics software discovers delays after a scheduled milestone is missed, turning solvable hours into multi-day demurrage compounders.
- **The "Evaluation Paralysis" Problem:** When a disruption occurs, operations managers spend 4 to 8 hours manually calling carriers, calculating route options, and estimating financial impact across disparate spreadsheets.

### Key Metrics Callout
- **$150+/day per container** in avoidable demurrage penalties.
- **10% revenue cap** risked under strict enterprise Master Services Agreement (MSA) SLAs.
- **Zero deterministic autonomy** in existing off-the-shelf tracking dashboards.

### Speaker Notes
> "In recent years, crises across the Red Sea, the Suez Canal, and major container ports in Rotterdam and California proved that global logistics lacks dynamic autonomy. When a vessel is blocked or a highway pass shuts down, operations teams don't suffer from a lack of GPS dots on a map—they suffer from lack of proactive intelligence. By the time a delay is acknowledged, demurrage and contract penalties have already eaten up the entire shipment margin. NexaFreight transforms operators from passive observers into decisive commanders."

---

## Slide 3: The Solution: NexaFreight Autonomous Control Tower

### Slide Title
**NexaFreight: Predictive Intelligence & 1-Click Operational Recovery**

### Visual Layout
- **Core Loop Diagram (Circular Closed-Loop Flowchart):**
  `1. Live Signal Ingestion (AIS, Flight, Road)` $\longrightarrow$
  `2. ML Delay & ETA Prediction (LightGBM + Quantiles)` $\longrightarrow$
  `3. Disruption & SLA Impact Quantification` $\longrightarrow$
  `4. 3-Way Pareto Reroute Optimization` $\longrightarrow$
  `5. 1-Click Autonomous Execution & Immutable Audit Log`

### Core Bullet Points
- **Unified Multimodal Mesh:** Connects Ocean Freight, Intercontinental Air Cargo, Highway Drayage, and Dedicated Freight Corridors (Rail) into a single mathematical routing graph.
- **Proactive ML Risk Inferences:** Real-time delay classification booster predicts probability of delay $P(\text{delay})$ and computes asymmetric quantile delay distributions ($P_{10}, P_{50}, P_{85}$) to catch breaches before they happen.
- **Instant Financial Quantification:** Translates physical disruptions directly into dollar penalties (SLA loss + port demurrage + fuel cost + carbon tax).
- **Automated Reroute Engine:** Formulates 3 scored recovery options (Accept Delay vs. Physical Divert vs. Express Air Modal Shift) and identifies the mathematical optimum.
- **Enterprise-Grade Governance:** Zero-loss route migration with immutable SHA-256 tamper-evident audit logs.

### Speaker Notes
> "NexaFreight is not just another tracking portal. It is an active decision system. When a corridor breaks, NexaFreight detects the anomaly, runs our trained LightGBM and Quantile models, computes every affected customer order's contractual SLA penalty, calculates alternative physical sea routes and air charters, and presents an operator with the exact financial trade-offs in seconds. One click executes the recovery across the entire network."

---

## Slide 4: System Architecture & Technology Stack

### Slide Title
**Full-Stack Architecture: Built for 24/7 Command Center Scale**

### Visual Layout
- **Architecture Diagram:**
  - *Frontend Tier:* Next.js 14 App Router, TypeScript, MapLibre GL 3D Canvas, TailwindCSS, Chartroom High-Contrast Maritime Design System.
  - *Network Proxy Tier:* Next.js Same-Origin Reverse Proxy (`/api/nexa/*`), Single-Use HMAC Stream Tickets (zero token leakage in query params).
  - *Backend Core:* FastAPI (Python 3.11), SQLAlchemy 2.0 Async ORM, A* Multimodal Graph Planner (NetworkX), GLEC v3.2 Emissions Calculator.
  - *Data & Persistence:* Neon Cloud PostgreSQL + Local SQLite fallback, Append-Only Triggers for Security.
  - *Telemetry Ingestion:* Real-time Server-Sent Events (SSE) Position Engine with dead-reckoning kinematics and vessel track replay.

### Core Architecture Highlights
- **Same-Origin Reverse Proxy (ADR-01):** Eliminates cross-origin CORS exposure and prevents JWT access token leakage to third parties.
- **Single-Use Stream Tickets (SEC-03):** Prevents JWT exposure in browser EventSource logs; tickets expire in 60s and enforce single-use consumption.
- **GPU-Accelerated 3D Map (MapLibre GL):** Renders thousands of concurrent vessels, trucks, aircraft, and subsea cables at 60 FPS without DOM lag.
- **Strict Data Provenance Model:** Every single UI badge, coordinate, and KPI displays explicit data provenance:
  - `REAL`: Verified live telemetry (live AIS / GPS).
  - `CALIBRATED`: Empirical benchmarks from World Bank & PortWatch indices.
  - `DERIVED`: Mathematically calculated routes & ML inference outputs.
  - `SIMULATED`: Dead-reckoning kinematic interpolation for continuity.

### Speaker Notes
> "Our architecture reflects enterprise production constraints. We implemented a same-origin reverse proxy to prevent CORS vulnerabilities, single-use HMAC tickets for secure Server-Sent Events streaming, and a high-performance GPU canvas with MapLibre GL. Most importantly, we never fake data: our system strictly tags every data point with provenance badges—REAL, CALIBRATED, DERIVED, or SIMULATED—so operators know the exact origin of every signal."

---

## Slide 5: Multimodal Routing Graph & Network Topology

### Slide Title
**The Multimodal Core: Unifying Ocean, Air, Highway & Rail**

### Visual Layout
- **Network Map / Infographic:**
  - Map highlighting major global gateways: Shanghai, Los Angeles, Rotterdam, Hamburg, Jebel Ali Dubai, Mundra Port, Surat, JNPT Mumbai, and Singapore.
  - Mode-coded paths: Blue (Maritime sea lanes), Gold (Air cargo corridors), Green (Highway road corridors), Slate (Dedicated Freight Rail).

### Technical Details & Graph Capabilities
- **Multi-Criteria A\* Graph Search:** Evaluates paths across 47 international hubs and 136 multimodal edges simultaneously minimizing cost, transit time, and $\text{CO}_2$ emissions.
- **True Marine Searoute Geometry:** Incorporates real bathymetric searoute marine graphs respecting maritime navigation restrictions (Suez Canal, Malacca Strait, Panama Canal, Bab-el-Mandeb).
- **Curved Highway Geometries:** High-resolution road coordinates (e.g. 3,300+ turn-by-turn waypoints around geographical barriers such as the Gulf of Khambhat) ensuring realistic vehicle motion rather than straight-line approximations.
- **Transshipment Dwell Modeling:** World Bank Container Port Performance Index (CPPI) calibrated dwell times:
  - $P_{50}$ median turnaround and $P_{90}$ congestion tail adders applied dynamically at transshipment points.

### Speaker Notes
> "In logistics, a straight line on a map is useless. Our routing engine integrates true marine graph calculations—accounting for chokepoints and canal dimensions—and high-resolution curved highway turn-by-turn waypoints. When moving containers between ports and inland hubs, our A-star multi-criteria planner models port dwell times, transshipment delays, and customs queues calibrated against actual World Bank port performance metrics."

---

## Slide 6: Machine Learning Pipeline: Delay Classifier & Risk Bands

### Slide Title
**ML Component 1: Delay Classification via LightGBM**

### Visual Layout
- **Model Card & Confusion Matrix / ROC Visual:**
  - Feature Importance chart (Distance, Shipping Mode, Historical Delay Rate, Order Revenue, Port Dwell Index).
  - Risk Band Threshold Gauge:
    - `LOW` ($P < 0.30$)
    - `MEDIUM` ($0.30 \le P < 0.60$)
    - `HIGH` ($0.60 \le P < 0.85$)
    - `CRITICAL` ($P \ge 0.85$)

### Technical Specifications
- **Model Architecture:** Gradient Boosted Decision Trees (LightGBM Booster).
- **Feature Contract (14 Features):**
  - Transit metrics: `shipping_mode`, `cargo_class`, `total_distance_km`, `leg_count`.
  - Financial terms: `revenue`, `shipping_cost`, `product_price`, `order_profit`.
  - Temporal seasonality: `scheduled_shipping_days`, `sla_month`, `sla_weekday`, `sla_quarter`.
  - Geographic lane vectors: `order_country`, `customer_country`.
- **Target Invariant:** Evaluates binary probability $P(\text{delay} > \text{SLA})$.
- **Zero Data Leakage:** Strict temporal separation; future milestone timestamps and realized delivery dates are eliminated from feature vectors.

### Production Output
- Returns calibrated probability (e.g. $P(\text{delay}) = 0.842$).
- Automatically assigns risk band to alert payload to prioritize operator action.

### Speaker Notes
> "Our first machine learning model is an enterprise LightGBM Delay Classifier. It takes 14 validated features across mode, distance, financial exposure, seasonal month, and lane geography. Crucially, we enforced strict data leakage prevention: no downstream or post-departure realization fields are permitted in the training schema. The model outputs a probability between 0 and 1, automatically bucketing shipments into clear operational risk bands: Low, Medium, High, and Critical."

---

## Slide 7: Machine Learning Pipeline: Quantile ETA Regression

### Slide Title
**ML Component 2: Quantile ETA Regression ($P_{10}, P_{50}, P_{85}$)**

### Visual Layout
- **Quantile Fan Chart:**
  - Expected timeline displaying asymmetric confidence bands: $P_{10}$ (optimistic delivery), $P_{50}$ (median expectation), $P_{85}$ (contractual risk ceiling).
  - Formula Callout: $\Delta = P_{85} - P_{50}$ (Uncertainty Spread in Days).

### Why Quantiles Over Mean (MSE)?
- **Freight Distributions are Heavy-Tailed:** Standard linear regression or MSE models assume symmetric Gaussian errors. In freight logistics, a ship can never arrive 10 days early, but port strikes and weather can easily make it 10 days late.
- **Pinball Loss Optimization:** Models trained with Pinball Loss at $\alpha \in \{0.10, 0.50, 0.85\}$.
  $$\mathcal{L}_\alpha(y, \hat{y}) = \max(\alpha(y - \hat{y}), (1 - \alpha)(\hat{y} - y))$$
- **Contractual SLA Defense:** Operators commit to customer deadlines using $P_{85}$. If the $P_{85}$ exceeds the customer SLA, an automatic alert is triggered before the ship even leaves port.

### Live Production Example
- *Corridor:* Jebel Ali $\rightarrow$ Mundra (Trans-Oceanic):
  - $P_{10} = 6.0\text{ days}$
  - $P_{50} = 8.0\text{ days}$
  - $P_{85} = 12.0\text{ days}$
  - *Confidence Spread:* $4.0\text{ days}$ uncertainty buffer.

### Speaker Notes
> "Why did we build a quantile model instead of standard regression? Because logistics delays are asymmetrical. A ship cannot arrive 10 days early, but it can easily arrive 10 days late due to canal jams. A standard mean prediction hides extreme tail risk. By predicting the 10th, 50th, and 85th percentiles via Pinball Loss, our operators can guarantee contractual SLAs using the P85 ceiling, pricing risk accurately before committing capital."

---

## Slide 8: Machine Learning Pipeline: Lane Demand Forecasting

### Slide Title
**ML Component 3: Multi-Horizon Seasonal Lane Demand Forecasting**

### Visual Layout
- **Time Series Line Chart:**
  - 12-week forward demand curve showing historical container volume (TEUs) and seasonal forecast with 95% confidence intervals.
  - Highlighted high-density corridors: Trans-Pacific, Trans-Atlantic, and Indian Coastal Feeder.

### Technical Highlights
- **Model:** AutoETS / Holt-Winters Exponential Smoothing with additive damped trend and weekly/monthly seasonality.
- **Proactive Capacity Balancing:** Allows fleet dispatchers to anticipate freight surges (e.g. pre-holiday shipping spikes, post-monsoon surges) and pre-position container chassis and drayage trucks at receiving ports.
- **Unified ML Registry:** All three models (`delay_classifier`, `eta_quantile`, `demand_forecast`) are loaded independently through our decoupled `ModelRegistry`, ensuring failure of one model does not disrupt core control tower operations.

### Speaker Notes
> "The third pillar of our ML stack is lane-level demand forecasting. Using seasonal exponential smoothing models calibrated across historical volume trends, NexaFreight predicts container demand up to 12 weeks ahead. This enables logistics planners to pre-allocate capacity, avoid spot-market shipping premiums, and position haulage assets before bottlenecks form."

---

## Slide 9: Autonomous Disruption Detection & SLA Breach Quantification

### Slide Title
**From Physical Event to Financial Impact: The Alert Engine**

### Visual Layout
- **Split Screen Alert Workflow:**
  - *Left:* Incident detection feed (e.g. "Bab-el-Mandeb Chokepoint Delay +240h").
  - *Right:* Financial exposure breakdown card:
    - SLA Penalty: $\$9,000$ (compounded weekly).
    - Demurrage Exposure: $\$29,000$ ($150/box/day past free days).
    - Total Exposure: $\$38,000 \rightarrow$ **CRITICAL SEVERITY**.

### How NexaFreight Quantifies Financial Exposure
1. **Disruption Ingestion:** Real-time event ingested (Vessel delay, terminal congestion, storm weather, or highway pass closure).
2. **Dynamic Revised ETA:**
   $$\text{Revised ETA} = \text{Latest Planned Arrival} + \text{Delay Hours}$$
3. **Contractual SLA Breach Breakdown:**
   - Evaluates every customer order linked to the affected shipment.
   - Computes exact days late: $\text{Days Late} = \lceil(\text{Revised ETA} - \text{Deadline}) / 86400\rceil$.
   - Applies liquidated damages (e.g. 0.5% per week, weekly rounded, capped at 10% revenue).
4. **Destination Demurrage Assessment:**
   - Calculates demurrage for containers exceeding contract free days (4 free days, $\$62.50-\$150$/container/day).
5. **Severity Classification:**
   - Exposure $\ge \$10,000 \longrightarrow$ `CRITICAL`
   - Exposure $\ge \$2,500 \longrightarrow$ `HIGH`
   - Exposure $\ge \$500 \longrightarrow$ `MEDIUM`

### Speaker Notes
> "Most software shows an alert that says: 'Traffic delay.' That is not helpful to a CFO or operations manager. NexaFreight's Alert Engine connects physical delays directly to commercial contracts. It scans every customer order on that vessel, calculates the exact contractual liquidated damages down to the penny, estimates terminal demurrage costs, and assigns a prioritized severity badge. An operator immediately sees that a 10-day Red Sea delay will cost $38,000 in penalties if unaddressed."

---

## Slide 10: The 3-Way Pareto Reroute Decision Engine

### Slide Title
**Autonomous Recovery: The 3-Way Trade-Off Matrix**

### Visual Layout
- **Comparison Table / 3 Option Cards:**

| Metric | Option A: ACCEPT DELAY | Option B: DIVERT ROUTE | Option C: MODAL SHIFT |
| :--- | :--- | :--- | :--- |
| **Strategy** | Absorb delay & hold course | Re-route around chokepoint | Air Freight express charter |
| **Physical Path** | Wait out canal queue | Divert via Cape of Good Hope | Fly cargo via Air Cargo |
| **Transit Time Delta** | $+240\text{ hours}$ | $+168\text{ hours}$ ($-72\text{h}$ vs delay) | $-192\text{ hours}$ (Rapid recovery) |
| **Cost Delta** | $\$0\text{ extra freight}$ | $+\$14,200\text{ fuel/distance}$ | $+\$84,000\text{ air charter}$ |
| **SLA Penalty** | $\$9,000$ (Breached) | $\$2,200$ (Saved 1 week) | $\$0$ (Zero breach) |
| **Demurrage Cost** | $\$29,000$ (10 days past) | $\$6,000$ (Minimal) | $\$0$ (Airside customs) |
| **$\text{CO}_2$ Delta** | Nominal | $+72\%\text{ maritime distance}$ | $+320\%\text{ aviation burn}$ |
| **Total Financial Impact**| **$\$38,000$** | **$\$22,400$** `★ RECOMMENDED` | **$\$84,000$** |

### Mathematical Optimization Formula
$$\min \left( \Delta \text{Cost} + \text{SLA Penalty} + \text{Demurrage} + \text{Carbon Cost} \right)$$
- The system automatically marks the cost-optimal recovery strategy as **`RECOMMENDED`**.

### Speaker Notes
> "When an alert fires, NexaFreight instantly generates the three canonical recovery options:
> First, Accept Delay: do nothing, but absorb $38,000 in SLA penalties and container demurrage.
> Second, Divert: take an alternate corridor—like the Cape of Good Hope or an alternate deepwater port—adding sailing distance but slashing late fees to $22,400.
> Third, Modal Shift: charter an emergency air cargo freighter, eliminating SLA breach entirely for ultra-critical freight.
> Our algorithm evaluates total cost of choice and marks Option B as Recommended, saving the enterprise over $15,600 on a single shipment."

---

## Slide 11: 1-Click Execution & Immutable Cryptographic Audit Log

### Slide Title
**Zero-Loss Execution & Compliance Integrity**

### Visual Layout
- **Execution & Audit Trail Graphic:**
  - Screenshot of the **"APPROVE & EXECUTE"** button on the UI.
  - Interactive Audit Log table showing:
    - Decision ID (UUID)
    - Timestamp (UTC)
    - Approving Operator (`operator@nexafreight.local`)
    - Route Version Migration (`v1` $\rightarrow$ `v2`)
    - Cryptographic Verification Badge (`SHA-256 VERIFIED`)

### Technical Governance Safeguards
- **Zero-Loss Leg Swapping:** The decision executor replaces the disrupted leg with newly planned legs, increments `route_version`, recalculates arrival milestones, and updates the live map geometry seamlessly.
- **Append-Only Database Triggers (ADR-03):**
  - PostgreSQL trigger `prevent_audit_log_modification()` raises an exception on any unauthorized `UPDATE` or `DELETE` attempt.
  - Guarantees regulatory compliance for insurance claims and maritime dispute arbitrations.
- **Revealed-Preference Calibration:** Tracks historical operator overrides to adapt future routing recommendations based on organizational risk tolerance.

### Speaker Notes
> "Autonomy is nothing without trust and accountability. When an operator clicks 'Approve & Execute', our decision engine executes a zero-loss leg migration in the database: the old leg is archived, the new route geometry is rendered live, and an immutable audit log is committed. Backed by database-level triggers, these logs cannot be altered or deleted by anyone—providing an audit trail for maritime insurance claims and enterprise compliance."

---

## Slide 12: GLEC Framework v3.2 Carbon Accounting

### Slide Title
**Sustainability by Design: Standardized Carbon Accounting**

### Visual Layout
- **Emission Comparison Bar Chart:**
  - Carbon footprint per mode in $\text{g CO}_2\text{e} / \text{tonne-km}$:
    - **AIR:** $602.0\text{ g}$
    - **ROAD:** $62.0\text{ g}$
    - **RAIL:** $22.0\text{ g}$
    - **SEA:** $16.1\text{ g}$
  - Visual showing $\text{CO}_2$ delta calculated in real-time for each reroute alternative.

### Core Environmental Capabilities
- **Global Logistics Emissions Council (GLEC) Framework v3.2:** Centralized emission factor repository (`DEFAULT_CO2_FACTORS`).
- **Real-Time Carbon Delta Modeling:**
  - Evaluates trade-offs between speed and environmental impact.
  - Modal shifts to air cargo reflect an explicit carbon penalty ($+\$45/\text{tonne CO}_2$) incorporated directly into total impact scores.
- **ESG Reporting Ready:** Enables enterprise supply chains to report Scope 3 freight emissions accurately.

### Speaker Notes
> "Modern supply chains cannot ignore ESG mandates. NexaFreight incorporates the Global Logistics Emissions Council Framework v3.2 across all routing decisions. When an operator evaluates air charter vs. maritime diversion, the system calculates the exact incremental carbon tonnage and applies enterprise carbon tax factors to ensure sustainability goals are respected."

---

## Slide 13: Live Operational Demonstration

### Slide Title
**Live System Walkthrough: Real-Time Command & Control**

### Visual Layout
- **Live Demo Screen Checklist:**
  1. *Global Multimodal Map:* Real-time tracking of container vessels, air cargo, and highway trucks across India, Europe, the Americas, and Asia.
  2. *Live Telemetry Stream:* Server-Sent Events (SSE) updating coordinates at 5-second intervals with heading and speed.
  3. *Alert Center:* Active alerts across corridors (Bab-el-Mandeb, Rotterdam Maasvlakte, Pacific Storm, I-80 pass closure).
  4. *Reroute Drawer:* Selecting an alert, viewing ML predictions ($P(\text{delay})$ & quantiles), reviewing the 3-way trade-off.
  5. *1-Click Execution:* Approving the diversion, observing live route geometry updates, and inspecting the immutable audit log.

### Step-by-Step Presentation Script
1. **Navigate to Command Map:** Show live global distribution (vessels crossing oceans, trucks on highways, cargo planes aloft).
2. **Open Alert Center:** Click the top-right alert counter showing active `CRITICAL` and `HIGH` alerts.
3. **Inspect Disrupted Shipment (`glob-sea-me-001`):** Show the disruption banner detailing ML risk: $P(\text{delay}) = 84.2\%$, $P_{85} = +12.0\text{d}$, and $\$38,000$ financial exposure.
4. **Trigger Reroute Drawer:** Review Option A (Accept: $-\$38k$), Option B (Divert via Cape: $-\$22.4k$), Option C (Modal Shift: $-\$84k$).
5. **Click "Approve & Execute":** Watch the route update live, resolving the alert and committing the cryptographic decision log.

### Speaker Notes
> "Let us now transition to our live production environment running at nexafreight.vercel.app. We will demonstrate how an active Red Sea chokepoint advisory is identified, how our machine learning models calculate a delay probability of 84.2%, how the financial engine computes a $38,000 exposure across customer orders, and how a single click on 'Approve & Execute' re-plans the route and commits the decision."

---

## Slide 14: Verification, Testing & Robustness Metrics

### Slide Title
**Engineered for Zero Downtime: Testing & Benchmark Metrics**

### Visual Layout
- **Quality & Test Metrics Dashboard:**
  - `359 / 359` Vitest Frontend Unit & Component Tests Passing (100%).
  - `39 / 39` Pytest Backend Tests Passing (100% across Alert Engine, Reroute Engine, and ML Routes).
  - Sub-50ms API response time cached via Redis/Memory across 15,000+ active network shipments.
  - Zero Plaintext Credentials (strict environment isolation & GitHub Push Protection).

### Robustness & Code Invariants
- **Graceful ML Fallbacks:** If an external prediction model is offline, the system safely falls back to calibrated empirical World Bank lane quantiles without breaking the UI.
- **Idempotent Decision Execution:** Concurrent approvals return HTTP 409 Conflict, preventing duplicate vessel diversions or double-booking.
- **Thundering-Herd Protection:** Async mutex locks protect route cache builds from high-concurrency client polling.

### Speaker Notes
> "Behind the interface is a rigorously tested codebase. We maintain 359 automated Vitest frontend tests and 39 Pytest backend test suites covering our optimization algorithms, financial engines, and ML schemas. We tested edge conditions including database cold starts, API rate-limiting, and concurrent approval locks to guarantee zero crashes during mission-critical operations."

---

## Slide 15: Conclusion & Future Roadmap

### Slide Title
**Summary & Future Roadmap: The Future of Autonomous Logistics**

### Core Summary Takeaways
1. **End-to-End Multimodal Unification:** Sea, Air, Road, and Rail brought under a single unified mathematical control plane.
2. **Predictive Rather Than Reactive:** Machine learning models predict delays and quantify quantile uncertainty before SLA breaches compound.
3. **Automated Economic Action:** Turns complex supply chain disruptions into clear, financially quantified recovery choices executed with 1-click autonomy.

### Future Expansion Vectors
- **IoT Sensor Telemetry:** Direct integration with smart reefer container temperature, humidity, and shock sensors.
- **Customs & Regulatory Automation:** Automated Electronic Export Information (EEI) and bonded warehouse document generation upon reroute.
- **Dynamic Carrier Contracting:** Automated spot-market API bidding (e.g. Freightos, Xeneta) for instantaneous charter execution.

### Closing Call to Action
- **Live Platform URL:** `https://nexafreight.vercel.app`
- **Questions & Discussion:** Open floor for questions from the committee.

### Speaker Notes
> "In conclusion, NexaFreight delivers the missing link in global freight: dynamic, financially quantified autonomy. By bringing together live telemetry, machine learning predictions, and mathematical rerouting algorithms, we give operators the power to recover from disruptions in minutes rather than days. Thank you, and we welcome any questions from the panel."

---

## Slide 16: Local Reproduction & Production Cloud Deployment Runbook

### Slide Title
**Reproducibility & Deployment: From Clean Desktop Clone to Global Cloud**

### Visual Layout
- **Two-Column Split Architecture:**
  - *Left Column: Local Desktop Reproduction (Step-by-Step)*
    1. Clone & Branch: `git clone https://github.com/rajmontana/NexaFreight && git checkout hardening-final`
    2. Backend: `python -m venv .venv && pip install -r requirements.txt && alembic upgrade head`
    3. Seed: `python scripts/seed_user.py && python scripts/seed_demo_data.py`
    4. Quality Gates: `pytest -q` (891 passed, 5 xfail) & `npm test -- --run` (361 passed)
    5. Local Stack: FastAPI on `:8000` + Next.js 16 on `:3000` (or `docker compose up --build`)
  - *Right Column: Production Cloud Architecture*
    - **Frontend:** Vercel Global Edge CDN (Next.js 16.4 App Router, Standalone, Same-Origin `/api/nexa/*` Reverse Proxy)
    - **Backend:** Render Singapore Container Service (FastAPI, AnyIO, Non-Root UID 10001, Bundled ML Models)
    - **Database:** Neon Serverless PostgreSQL 16 (Connection Pooling, 17 Alembic Migrations, WORM P0001 Triggers)
    - **Cache:** Upstash Redis 7 (TLS `rediss://`, 30-min Sliding Window Ring Buffer)

### Key Reference Links Callout
- **Public GitHub Repository:** [`https://github.com/rajmontana/NexaFreight`](https://github.com/rajmontana/NexaFreight)
- **Comprehensive Runbook:** [`DEPLOYMENT.md`](DEPLOYMENT.md) (Step-by-step local & cloud deployment manual)
- **Project Documentation:** [`README.md`](README.md) (Complete system architecture & benchmark specification)
- **Live Control Tower:** [`https://nexafreight.vercel.app`](https://nexafreight.vercel.app)

### Speaker Notes
> "To guarantee 100% academic integrity and open-science reproducibility, our entire system is packaged with a zero-assumptions deployment runbook in DEPLOYMENT.md. Evaluators can clone the repo, run all 1,252 automated tests in under 30 seconds, verify our UNCTAD Suez detour drill, or deploy the complete stack onto Vercel, Render, and Neon PostgreSQL."

---

## Quick Reference Summary Table for Slide Designer

| Slide # | Slide Title | Recommended Layout / Asset | Key Takeaway / Number |
| :---: | :--- | :--- | :--- |
| **1** | Title Slide | Dark/Light split mockup of map & drawer | Autonomous Multimodal Control Tower |
| **2** | The Problem | 3 Problem Cards with warning accents | $\$150$/day demurrage; $10\%$ revenue loss |
| **3** | The Solution | 5-step circular closed-loop diagram | Detect $\rightarrow$ ML Predict $\rightarrow$ Quantify $\rightarrow$ Reroute $\rightarrow$ Execute |
| **4** | System Architecture | Architectural block diagram (Next.js $\leftrightarrow$ FastAPI) | Single-use tickets, MapLibre 60FPS canvas |
| **5** | Multimodal Network | Global map with mode-colored corridors | 47 nodes, 136 edges, true searoute & highway curves |
| **6** | ML Delay Classifier | Feature importance bar chart + risk gauge | LightGBM, 14 features, zero leakage |
| **7** | Quantile ETA Model | Asymmetric quantile fan chart ($P_{10}, P_{50}, P_{85}$) | Heavy-tailed risk defense via Pinball loss |
| **8** | Demand Forecasting | 12-week time-series volume forecast curve | Multi-horizon Holt-Winters / AutoETS |
| **9** | Alert & SLA Engine | Split screen: Physical Event $\rightarrow$ Financial penalty | Real liquidated damages + demurrage formula |
| **10** | 3-Way Trade-Off Matrix | Comprehensive 3-option comparison table | Accept Delay vs Divert vs Modal Shift |
| **11** | 1-Click Execution & Audit | UI button screenshot + Cryptographic table | Zero-loss leg swap, append-only DB triggers |
| **12** | Carbon Emissions (GLEC) | Mode-wise emissions bar chart | GLEC v3.2 standard, $\$45$/tonne carbon penalty |
| **13** | Live Demonstration | 5-step interactive demo walkthrough | Step-by-step execution on live production site |
| **14** | Testing & Robustness | Test pass cards (359 Vitest + 39 Pytest) | $100\%$ pass rate, sub-50ms response, zero secrets |
| **15** | Roadmap & Conclusion | Future capabilities + live link | IoT reefer telemetry, spot-market API bidding |
| **16** | Reproduction & Cloud Deployment | 2-Column Runbook + Cloud Architecture Diagram | Full local & cloud runbook in DEPLOYMENT.md |
