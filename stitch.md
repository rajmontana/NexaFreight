# Stitch Design System & Screen Generation Prompts: NexaFreight "Chartroom"

This document contains the complete Stitch design system configuration and screen-by-screen generative prompts for Google Stitch. It synthesizes the visual laws from `DESIGN.md`, product commitments from `PRODUCT.md`, and the three visual reference archetypes:

1. **Stratoshaft** (Technical waybill, corner registration ticks `[ ]`, boxed mono telemetry, slim left rail, and decisive cobalt buttons).
2. **Aurelia** (Airy paper atmosphere, delicate weight 300 display typography, dot-timeline event feeds, and the 2px spectral live-thread gradient).
3. **Words Shape Weather / River** (Editorial paper minimalism, 1px hairline-divided modular ledger grids, micro-sparkline bars, and 11px uppercase mono labels).

---

## 1. Global Stitch Design System (`design.md`)

Use this block when initializing or updating the Stitch project design system via `create_design_system` or `upload_design_md`:

```markdown
# Design System: NexaFreight "Chartroom"
Metaphor: "Nautical Chart & Technical Waybill"

## Colors
- paper: #F6F7F4 (App background, default canvas, reading surfaces)
- surface-raised: #FFFFFF (Raised cards, panels, active drawers)
- surface-subtle: #FAFBF9 (Alt table rows, secondary grouped containers)
- ink: #16181D (Primary text, headings, dark borders)
- text-secondary: #5A5D66 (Metadata, timestamps, secondary labels)
- border-hairline: #D4D5D0 (1px dividers, grid separations, registration ticks)
- cobalt: #2547C8 (Primary accent, active nav, focus rings, primary CTA buttons - <=10% surface area)
- cobalt-pressed: #1D3AA6 (Hover & active states)
- oxide-risk: #B4452F (Risk chips, delays, critical SLA alerts)
- moss-positive: #3E6B4F (Positive affirmations, healthy telemetry, resolved status)
- spectral-thread: linear-gradient(90deg, #8B7FD4, #2547C8, #3FA796) (Strictly reserved for active live-streaming indicators)

## Typography
- UI Font: 'Archivo', sans-serif (Display 300 weight for major headings, 500 for headlines, 600 for buttons/titles, 400 for body)
- Data Font: 'IBM Plex Mono', monospace with tabular figures (all timestamps, coordinates, container IDs, speeds, port codes, currency amounts)
- Label Style: 11px uppercase monospace, +0.08em letter-spacing, font-weight 500
- Currency: Indian Rupee (₹) formatted with tabular numbers (e.g., ₹1,42,800)

## Elevation & Shapes
- Shadows: STRICTLY ZERO BOX SHADOWS, zero drop shadows, zero glow. Flat surfaces only.
- Borders: 1px hairline (#D4D5D0) borders.
- Radii: 2px (buttons, chips), 3px-4px (cards, drawers, modals). Never exceed 4px.
- Technical Marks: Corner registration marks (L-shaped ticks `[ ]`) on major panels.

## Banned List
- Inter and JetBrains Mono are strictly prohibited.
- Dark mode ops presets or neon cyber palettes are banned.
- Gradients on surface fills or backgrounds are banned.
```

---

## 2. Screen-by-Screen Stitch Prompts

---

### Screen 1: Master Control Tower (Overview & Live Telemetry)

**Prompt for Stitch (`generate_screen_from_text`):**
```text
A high-density enterprise multimodal logistics control tower dashboard named "NEXAFREIGHT", designed in the "Chartroom" aesthetic: a light matte paper canvas (#F6F7F4), crisp ink text (#16181D), and a single restrained cobalt blue accent (#2547C8). Absolutely flat design with zero drop shadows and 1px hairline borders (#D4D5D0).

Layout Structure:
1. Top Status Strip (Height: 48px, background #F6F7F4, border-bottom 1px hairline):
   - Left: "UTC 15:42:08Z" and "ACTIVE CARRIERS 14" in IBM Plex Mono.
   - Center: "LIVE STREAMING" indicator with an animated 2px spectral underline (violet #8B7FD4 -> cobalt #2547C8 -> teal #3FA796).
   - Right: Boxed mono metric readouts inspired by Stratoshaft: [IN TRANSIT: 147] [AT RISK: 8 with #B4452F oxide dot] [DEMURRAGE: ₹4,18,500].

2. Left Slim Technical Navigation Rail (Width: 64px, border-right 1px hairline, background #F6F7F4):
   - Vertical column of minimalist technical line icons:
     - OVERVIEW (active with a solid 2px cobalt left rule and #2547C8 icon)
     - SHIPMENTS, ALERTS, ANALYTICS, VALIDATION.
   - Bottom: "SYS 01" status chip and operator profile icon.

3. Central Map Viewport (Flexible grid, nautical chart style):
   - Framed with 1px hairline borders and L-shaped corner registration ticks [ ].
   - Pale chart basemap with subtle marine depth contours.
   - Global multimodal routes (ocean searoutes in cobalt, air corridors in dashed lines, rail/road in hairline ink).
   - Live vessel and cargo markers with clean mono speed readouts (e.g., "19.4 KTS").
   - Top-right map overlay: Zoom controls [+ -] in 2px radius buttons, and coordinate readout "18.9432° N, 72.8234° E" in IBM Plex Mono.

4. Bottom Modular Ledger Grid (Inspired by Stratoshaft and Words Shape Weather):
   - Divided into 3 horizontal hairline-bordered modules:
     - Module A ("DENSITY & DELAY PROFILE"): Line area curve showing fleet transit delays over 24h, with a vertical tracking line and key-value metrics below: [AVG P50: +1.4h] [CONGESTION INDEX: 0.42] [ON-TIME: 94.2%].
     - Module B ("EVENT DISPATCH TIMELINE"): Dot-timeline feed inspired by Aurelia, with vertical hairline thread and colored dots:
       - 15:38: Rotterdam Port congestion alert (oxide dot)
       - 15:12: Vessel MV Ever Forward AIS telemetry received (moss dot)
       - 14:50: JNPT customs clearance approved (cobalt dot).
     - Module C ("ACTIVE CORRIDOR LEDGER"): Tabular rows showing route IDs, origin/dest (e.g., "INNSA → NLRTM"), cargo TEU, and compact [VIEW >] buttons.
```

---

### Screen 2: Shipments Ledger & Deep Inspector Drawer

**Prompt for Stitch (`generate_screen_from_text`):**
```text
An enterprise logistics shipment management view with an open slide-over inspector drawer for "NEXAFREIGHT". Designed in a crisp maritime chartroom theme with a paper-white palette (#F6F7F4 / #FFFFFF), hairline dividers (#D4D5D0), and zero box-shadows.

Layout Structure:
1. Background Content: Dense Shipments Table (Desktop data surface):
   - Header: Display title "SHIPMENT LEDGER" in Archivo weight 300, with total count "1,248 CONSIGNMENTS" in 11px uppercase mono.
   - Filter bar: Minimalist inputs with 1px hairline borders, placeholder "Filter by B/L, Container, Port...", and mode selector chips [ALL] [OCEAN] [AIR] [ROAD].
   - Table columns:
     - SHIPMENT ID (IBM Plex Mono, e.g. "SHP-99214")
     - CARRIER / VESSEL ("Maersk Mc-Kinney Møller")
     - ROUTE ("SGSIN → INMAA")
     - P50 DELAY with ProvenanceChip [REAL] or [CALIBRATED]
     - SLA STATUS (Moss chip [ON SCHEDULE] or Oxide chip [AT RISK])
     - FREIGHT VALUE in Indian Rupee (e.g. "₹24,80,000", right-aligned tabular numbers).

2. Slide-Over Right Inspector Drawer (Width: 480px, background #FFFFFF, border-left 1px solid #D4D5D0, flat elevation with no drop shadow):
   - Drawer Header:
     - Top row: Monospace label "WAYBILL SPECIFICATION · SHP-99214" with close [✕] button.
     - Headline: "Valparaiso Express / Voyage 042E" (Archivo weight 500, 18px).
     - Origin/Destination routing strip with waybill notch ticks: "SGSIN (Singapore) ➔ INNSA (Nhava Sheva)".
   - Section 1: ML Predictive ETA & Delay:
     - P50 delay readout "+3.2 HOURS" with an outlined monospace ProvenanceChip: `[● CALIBRATED]`.
     - Confidence bar: 1px hairline border with solid #3E6B4F moss fill representing 88% confidence.
     - SLA Risk Level: Muted oxide badge "MODERATE RISK".
   - Section 2: Financial Ledger (All figures strictly in ₹ with tabular numbers):
     - Table card with hairline dividers:
       - Revenue: ₹18,50,000
       - Freight Cost: ₹12,10,000
       - Demurrage Exposure: ₹1,45,000
       - SLA Penalty at Risk: ₹0
       - Net Margin: ₹4,95,000 (26.7%) highlighted with moss ink.
   - Section 3: AI Copilot Quick Prompt:
     - Prompt box: "Ask Copilot about this shipment..." with hairline border.
     - Suggested pills: ["Demurrage exposure?"] ["Alternative air legs?"] ["SLA breach risk?"].
```

---

### Screen 3: Disruption Response & Autonomous Reroute Studio

**Prompt for Stitch (`generate_screen_from_text`):**
```text
An autonomous multimodal disruption recovery studio for the "NEXAFREIGHT" logistics control tower. Aesthetic: Technical waybill, paper background (#F6F7F4), ink typography (#16181D), 1px hairline borders (#D4D5D0), and corner registration brackets [ ]. Zero shadows.

Layout Structure:
1. Top Section: Active Disruption Masthead:
   - Alert notification banner styled like a formal maritime dispatch notice:
     - Headline: "DISRUPTION DETECTED: SUEZ CANAL TERMINAL CONGESTION" in Archivo 500 with an Oxide Red dot [● CRITICAL].
     - Context line: "Vessel MSC Leni delayed 72.4 hours. SLA breach imminent for 42 high-priority containers."
     - Telemetry timestamp: "DETECTED: 2026-09-28 14:22 UTC · MODEL: LIGHTGBM-v2.1" with ProvenanceChip [● REAL].

2. Main Body: Three Deterministic Recovery Scenarios (Side-by-side technical trade-off cards):
   - Card 1: "SCENARIO A: ACCEPT DELAY"
     - Subtitle: "Maintain existing searoute; notify consignees"
     - Metrics grid (IBM Plex Mono tabular):
       - ETA Delta: +72.0 h
       - Cost Impact: ₹0
       - Demurrage Penalty: ₹8,40,000 (Oxide text)
       - SLA Breach Probability: 92% with ProvenanceChip [● SIMULATED]
     - Secondary button: [ACCEPT DELAY >] (hairline border, paper background).

   - Card 2: "SCENARIO B: PORT DIVERT (RECOMMENDED)" (Active card with 1px cobalt border and corner registration ticks):
     - Top badge: Cobalt mono chip [RECOMMENDED OPTION]
     - Subtitle: "Divert to Damietta Port (EGDAM) for bonded staging"
     - Metrics grid (IBM Plex Mono tabular):
       - ETA Delta: +14.5 h
       - Cost Impact: +₹2,80,000
       - Demurrage Penalty: ₹0 (saved)
       - SLA Breach Probability: 12% with ProvenanceChip [● SIMULATED]
     - Primary decisive button: [COMMIT PORT DIVERT >] (solid cobalt #2547C8 background, white text, 2px radius).

   - Card 3: "SCENARIO C: MODAL SHIFT (SEA-AIR)"
     - Subtitle: "Transship 8 critical TEU via Cairo Air Cargo to Frankfurt"
     - Metrics grid (IBM Plex Mono tabular):
       - ETA Delta: -28.0 h (On-Time Recovery)
       - Cost Impact: +₹11,50,000
       - Demurrage Penalty: ₹0
       - CO₂ Differential: +4.2 MT
       - SLA Breach Probability: 2% with ProvenanceChip [● SIMULATED]
     - Secondary button: [EXECUTE AIR SHIFT >].

3. Bottom Section: Trade-Off Delta Visualization:
   - Minimalist comparative bar chart comparing the 3 options across Cost (₹), Time (Hours), and SLA Risk (%), using hairlines and solid cobalt/oxide bars.
```

---

### Screen 4: Multimodal Live Turn-by-Turn Guidance HUD (`NavigationView`)

**Prompt for Stitch (`generate_screen_from_text`):**
```text
A real-time turn-by-turn navigation HUD overlay for ground haulage and multimodal transfers in the "NEXAFREIGHT" logistics platform. Crisp technical waybill aesthetic on a paper background (#F6F7F4), high-contrast ink text (#16181D), and cobalt accent (#2547C8). Absolutely flat, zero drop shadows.

Layout Structure:
1. Top Maneuver Guidance Bar (Width: 100%, background #FFFFFF, border-bottom 1px hairline #D4D5D0):
   - Left: Large bold directional turn arrow (e.g. sharp right merge icon in cobalt #2547C8).
   - Center:
     - Distance to next maneuver: "450 m" in 24px bold IBM Plex Mono.
     - Instruction: "Turn right onto Port Access Expressway (Gate 4)" in Archivo 500.
     - Secondary road instruction: "Follow signage for Container Terminal 2 Berth".
   - Right: Destination ETA "ETA 16:45" and remaining distance "18.2 km" in mono tabular figures, with speaker toggle [🔊].

2. Central Route Map Background:
   - Nautical/topographical road routing canvas with high-contrast road corridors.
   - Blue solid cobalt line showing active truck trajectory.
   - Truck position marker with heading indicator and live telemetry speed: "48 KM/H".

3. Bottom Operational Instrument Card (Anchored bottom center, width: 600px, background #FFFFFF, border 1px hairline, corner ticks [ ]):
   - Trip Progress Line: 2px hairline background with solid cobalt fill at 65% completion.
   - 3 Telemetry Columns (IBM Plex Mono):
     - [SPEED: 48 km/h] with ProvenanceChip [● REAL]
     - [SLA REMAINING: +01:14:20] with Moss indicator
     - [WAYPOINT: 6 OF 8 (JNPT HUB)].
   - Right Action Buttons:
     - Secondary button: [RE-CENTER] with compass icon.
     - Secondary button: [REROUTE] (recomputes alternative road route).
     - Close button: [EXIT HUD ✕].
```

---

### Screen 5: Model Calibration & Verification Certificate (`/validation`)

**Prompt for Stitch (`generate_screen_from_text`):**
```text
A public model verification and calibration matrix page for "NEXAFREIGHT", designed as an authentic maritime technical calibration certificate. Light paper canvas (#F6F7F4), ink typography (#16181D), 1px hairline borders (#D4D5D0), corner registration marks, and zero box-shadows.

Layout Structure:
1. Certificate Masthead:
   - Center header: "NEXAFREIGHT VERIFICATION MATRIX" in Archivo weight 300 (28px).
   - Subtitle: "Autonomous Logistics Control Tower · Live Model Calibration Gate" in 11px uppercase mono.
   - Timestamp and Commit SHA: "CALIBRATION GENERATED: 2026-09-28T18:20:33Z · SHA: 5e58cf5 · GATED BY EVAL/VALIDATE.PY".
   - Top-right corner: Formal seal / watermark mark "CERTIFIED CALIBRATION" with corner brackets [ ].

2. Calibration Status Banner:
   - Full-width box with 1px solid hairline border:
     - Left: Moss positive dot [●] and text "ALL 14 AUDIT CHECKS PASS PUBLISHED BENCHMARK THRESHOLDS".
     - Right: Mono tag "CI STATUS: GREEN / COMPLIANT".

3. Main Calibration Ledger Table (Structured like a technical laboratory ledger):
   - Table Headers (11px uppercase IBM Plex Mono): MODEL COMPONENT · BENCHMARK REFERENCE · TARGET THRESHOLD · VERIFIED METRIC · PROVENANCE · STATUS.
   - Row 1: Delay Classifier (LightGBM) | Historical Late Delivery Dataset (44,179 rows) | ROC-AUC >= 0.78 | 0.8164 | [● REAL] | PASS (Moss chip)
   - Row 2: ETA Quantile Regressor (P10) | Historical Transit Residuals (P10) | Pinball Loss <= 0.180 | 0.1678 | [● CALIBRATED] | PASS
   - Row 3: ETA Quantile Regressor (P50) | Scheduled Shipping Days vs Real Days | MAE <= 1.050 days | 1.007 days | [● CALIBRATED] | PASS
   - Row 4: ETA Quantile Regressor (P85) | Coverage Interval (P10-P85) | Coverage >= 0.750 | 0.7656 | [● CALIBRATED] | PASS
   - Row 5: Demurrage Escalation Model | Port Tariff Schedule 2026 | Escalation Rate | 1.000 (Monotonic) | [● DERIVED] | PASS
   - Row 6: CO2 Emission Factor | IMO 2024 Marine Fuel Spec | Fuel Burn Rate | 0.0312 kg/ton-km | [● CALIBRATED] | PASS.

4. Footer Verification Signature:
   - Dual column signature block with hairline sign-off rules: "Lead ML Systems Engineer" and "Chief Logistics Operations Officer".
```

---

### Screen 6: Operator Waybill Authentication (Login Screen)

**Prompt for Stitch (`generate_screen_from_text`):**
```text
A login and authentication screen for "NEXAFREIGHT" control tower operators, designed in the "Chartroom" aesthetic as an authentic physical waybill card. Light matte paper canvas (#F6F7F4), ink typography (#16181D), and 1px hairline borders (#D4D5D0). Strictly zero drop shadows.

Layout Structure:
1. Background: Calm, unadorned paper canvas (#F6F7F4).

2. Centered Waybill Login Card (Width: 420px, background #FFFFFF, border 1px solid #D4D5D0, 3px corner radius, zero box-shadow):
   - Four corner registration ticks (1px L-brackets `[ ]`) framing the card.
   - Header Section:
     - Geometric eye glyph `◈` in cobalt #2547C8.
     - Title: "NEXAFREIGHT" in Archivo weight 500 (22px).
     - Subtitle: "Control Tower — Operator Access" in 11px uppercase mono.
     - 1px hairline horizontal divider.

3. Form Section:
   - Field 1:
     - Label: "OPERATOR EMAIL" (11px uppercase IBM Plex Mono with +0.08em tracking).
     - Input box: 1px hairline border, paper background, placeholder "operator@nexafreight.dev", text in Archivo.
   - Field 2:
     - Label: "ACCESS KEY / PASSWORD" (11px uppercase IBM Plex Mono).
     - Input box: 1px hairline border, placeholder "••••••••••••".
   - Helper row:
     - "Remember station" checkbox (2px radius).
     - "Reset key" in quiet secondary link.

4. Action Button:
   - Primary CTA: "AUTHENTICATE DISPATCH >"
   - Styling: Solid cobalt background (#2547C8), white text in Archivo 600, 2px corner radius, full width, height 40px, hover color #1D3AA6. Flat, no glow.

5. Card Footer:
   - Sub-hairline section with security clearance badge:
     - "STATION ID: TERMINAL-B4 · TLS 1.3 VERIFIED · RESTRICTED ACCESS".
```

---

### Screen 7: AI Operations Copilot Dialogue Drawer

**Prompt for Stitch (`generate_screen_from_text`):**
```text
An interactive AI Operations Copilot drawer for the "NEXAFREIGHT" logistics control tower. Styled as a quiet, authoritative dispatch teletype with a paper palette (#F6F7F4 / #FFFFFF), hairline dividers (#D4D5D0), and zero box-shadows.

Layout Structure:
1. Drawer Header (Width: 460px, background #FFFFFF, border-left 1px solid #D4D5D0):
   - Title: "AI OPERATIONS COPILOT" in Archivo weight 500 with a subtle cobalt dot [●].
   - Model info: "GEMINI 1.5 PRO · RAG LOGISTICS KNOWLEDGE BASE" in 10px uppercase IBM Plex Mono.
   - Close button [✕] in hairline square.

2. Teletype Message Thread:
   - Message 1 (Operator Question):
     - Right-aligned bubble with subtle background (#FAFBF9), 1px hairline border, text in Archivo 400:
       "Why was shipment SHP-8821 rerouted, and what is our demurrage exposure at Nhava Sheva?"
   - Message 2 (Copilot Answer):
     - Left-aligned teletype dispatch card:
       - Header line: "DISPATCH ADVISORY · 15:42 UTC" in 10px mono.
       - Body paragraph in crisp ink text:
         "Shipment SHP-8821 was autonomously diverted from JNPT to Mundra Port due to a 96-hour tidal berthing delay. 
         Predicted P50 arrival is now 2026-09-30 08:00 UTC with an outlined ProvenanceChip [● CALIBRATED]."
       - Structured Data Callout Card:
         - Demurrage avoided: ₹3,20,000 [● DERIVED]
         - Divert transit surcharge: +₹1,10,000 [● REAL]
         - Net financial gain: +₹2,10,000 [● DERIVED] with moss green indicator.
       - Citations: ["Port Notice #24-118", "LightGBM Delay Classifier v2.1"].

3. Prompt Input Footer (Fixed at bottom):
   - Preset chips above input: ["Audit SLA Breach"] ["Alternative Feeder Vessels"] ["Export Cost Breakdown"].
   - Input bar: Textarea with 1px hairline border, placeholder "Ask an operational or routing question...", and a compact cobalt submit button [DISPATCH ➔].
```

---

### Screen 8: Executive Analytics, Predictive Forecast & ESG Ledger (The Analytics Suite)

**Prompt for Stitch (`generate_screen_from_text`):**
```text
An enterprise-grade operational analytics dashboard for "NEXAFREIGHT", styled as a high-density nautical chartroom ledger. Light matte paper canvas (#F6F7F4), crisp ink text (#16181D), cobalt accent (#2547C8), and oxide red (#B4452F) for risk. Absolutely flat design — zero box-shadows, zero gradients on surfaces, strictly 1px hairline borders (#D4D5D0). All numeric figures in IBM Plex Mono with tabular figure alignment. All section headings in Archivo weight 300–500. Corner registration ticks [ ] on major panels.

OVERALL LAYOUT:
- Full-viewport panel (700px wide, anchored top-left beneath the 48px status strip).
- Header bar at top (48px), then a scrollable content body.

HEADER BAR (48px, background #FFFFFF, border-bottom 1px #D4D5D0):
- Left: Title "OPERATIONAL ANALYTICS" in Archivo weight 500 (13px, ink #16181D), followed by a muted ProvenanceBadge chip "● DERIVED" in 10px IBM Plex Mono with a 1px hairline border (oxide/moss dot).
- Center: Four tab selector buttons in IBM Plex Mono 11px uppercase: [SCORECARD] [FLEET] [SLA RISK] [ESG]. Active tab has solid cobalt (#2547C8) bottom border (2px) and cobalt ink. Inactive tabs are secondary ink (#5A5D66).
- Right: Compact text "● REPLAY  ● CALIBRATED" provenance status in 10px mono and a close [✕] button in hairline square.

═══════════════════════════════════════════
TAB 1: SCORECARD — P&L Financial Scorecard
═══════════════════════════════════════════

SECTION A — Three Projection Horizon Cards (3-column grid, each card 1px hairline border, 3px radius, #FFFFFF background, corner ticks [ ]):
  Card 1 "NEXT 24H":
    - Headline: "NEXT 24H · 42 SHIPMENTS" in 11px uppercase mono.
    - Data pairs (IBM Plex Mono tabular, 10px, left label in #5A5D66 / right value in #16181D):
      Revenue:                  $2,84,000
      Shipping Cost:            $1,91,200
      Decided Margin:           $92,800  (moss ink #3E6B4F)
      Undecided Revenue:        $44,000
      Pending SLA Est:         -$12,400  (oxide ink #B4452F)
      Pending Demurrage Est:   -$8,100   (oxide ink #B4452F)
      Total Pending Est:       -$20,500  (oxide ink #B4452F)
  Card 2 "NEXT 7D":
    - Same structure, larger figures (~7× scale).
  Card 3 "NEXT 30D":
    - Same structure, largest figures (~30× scale).

SECTION B — Revenue vs Total Costs Bar Chart (full width, 200px height):
  - Chartroom hairline grid lines (1px #D4D5D0), no chart background fill.
  - Grouped bars per shipment (15 shipments on x-axis, abbreviated IDs in 9px mono).
  - Bar A "REVENUE" in solid cobalt #2547C8.
  - Bar B "TOTAL COSTS" in solid oxide #B4452F.
  - Y-axis tick labels in IBM Plex Mono: "$0k / $50k / $100k / $150k".
  - Legend in 10px mono below chart: [■ Revenue] [■ Total Costs].
  - No tooltip background gradients — tooltip card is flat white with 1px hairline.

SECTION C — P&L Shipment Margin Ledger (full-width table, dense 10.5px):
  - Table header row (11px uppercase IBM Plex Mono, #5A5D66, border-bottom 1px hairline):
    SHIPMENT · MODE · STATUS · REVENUE · COST · FREIGHT · SLA PEN · DEMURRAGE · MARGIN · MARGIN%
  - 8 data rows, alternating row background (#F6F7F4 / #FFFFFF).
  - SHIPMENT column in cobalt #2547C8 mono (e.g. "SHP-8821…").
  - MARGIN column: positive values in moss #3E6B4F, negative in oxide #B4452F.
  - Each row is clickable (subtle hover: cobalt-tinted row highlight, no shadow).

═══════════════════════════════════════════
TAB 2: FLEET — Operations & Demand Forecast
═══════════════════════════════════════════

SECTION A — Fleet KPI Stat Grid (2 rows × 3 columns, 1px hairline cards):
  Card 1: "TOTAL FLEET"         Value: 1,248   (large IBM Plex Mono 22px)
  Card 2: "IN TRANSIT"          Value: 847     (cobalt #2547C8)
  Card 3: "DELIVERED"           Value: 312     (moss #3E6B4F)
  Card 4: "DELAYED"             Value: 89      (oxide #B4452F)
  Card 5: "SLA BREACHES"        Value: 14      (oxide #B4452F, bold)
  Card 6: "OPEN ALERTS"         Value: 31      (oxide #B4452F)
  Each card: 11px uppercase mono label at top, large tabular number below, corner registration ticks [ ].

SECTION B — Fleet Status Distribution (horizontal pill row, 1px hairline border bar):
  Label: "STATUS DISTRIBUTION" in 10px uppercase mono.
  Segmented hairline bar (no gradient, flat fills):
    [IN TRANSIT 67.9%: cobalt fill] [DELIVERED 25.0%: moss fill] [DELAYED 7.1%: oxide fill]
  Pill legend below bar in 10px mono.

SECTION C — 90-Day Demand Forecast Sparklines (3 lanes, stacked, 1px hairline separator each):
  Title row: "PROPHET DEMAND FORECAST · 90-DAY HORIZON" in 11px uppercase mono with [● CALIBRATED] chip.
  Lane 1: "COMPUTERS · W. AFRICA"
    - Inline SVG sparkline (220×40px): solid cobalt line for historical segment, dashed teal (#5AC8FA) for 90-day forecast extension.
    - Right: "TREND ↑ +12.4%" in 10px mono (moss ink).
  Lane 2: "CLOTHES · W. EUROPE"
    - Same sparkline style. Right: "TREND → +2.1%".
  Lane 3: "GARDEN TOOLS · C. AMERICA"
    - Same sparkline style. Right: "TREND ↓ -4.8%" (oxide ink).
  Note below sparklines: "DOTTED SEGMENT = ML FORECAST EXTRAPOLATION · [● CALIBRATED]" in 9px uppercase mono #5A5D66.

═══════════════════════════════════════════
TAB 3: SLA RISK — Penalty Ledger
═══════════════════════════════════════════

SECTION A — SLA Summary Strip (horizontal, 1px hairline-bordered strip, 44px height):
  [AT RISK: 14  ●] [LATE: 8  ●] [ON TIME: 826  ●]  — dots colored oxide / oxide / moss.
  All values in IBM Plex Mono 14px bold, labels in 10px mono #5A5D66.

SECTION B — SLA Risk Ledger Table (full-width, dense 10.5px):
  Header row (11px uppercase IBM Plex Mono, 1px border-bottom):
    SHIPMENT · STATUS BADGE · DAYS TO DEADLINE · DELAY DAYS · DISRUPTION EVENT
  Data rows (8 rows visible, scrollable):
    Row 1: SHP-4421 | [LATE] (oxide pill, 2px radius, oxide background tint) | 0 days | +4.2 days | "JNPT berth congestion · tidal delay"
    Row 2: SHP-8821 | [AT_RISK] (amber/oxide-light pill) | 1.5 days | +1.8 days | "Suez Canal slow transit"
    Row 3: SHP-0012 | [ON_TIME] (moss pill) | 6.2 days | 0 days | "—"
    Row 4: SHP-3391 | [LATE] (oxide pill) | 0 days | +7.1 days | "Rotterdam port congestion"
    Row 5: SHP-7714 | [AT_RISK] (oxide-light pill) | 0.8 days | +0.9 days | "Weather deviation Indian Ocean"
    Row 6: SHP-2200 | [ON_TIME] (moss pill) | 12 days | 0 days | "—"
    Row 7: SHP-5509 | [LATE] (oxide pill) | 0 days | +2.4 days | "AIS transponder outage"
    Row 8: SHP-9108 | [AT_RISK] (oxide-light pill) | 2.1 days | +1.1 days | "Customs hold INMAA"
  STATUS BADGE pills: 2px radius, 10px IBM Plex Mono uppercase, flat fill (oxide #B4452F for LATE, oxide-20% tint for AT_RISK, moss #3E6B4F for ON_TIME).
  Disruption event text in #5A5D66 italic.

═══════════════════════════════════════════
TAB 4: ESG — Carbon Accounting Ledger
═══════════════════════════════════════════

SECTION A — ESG Summary Header (1px hairline card, #FFFFFF background, corner ticks [ ]):
  Title: "CARBON ACCOUNTING LEDGER · ACTIVE FLEET" in Archivo 500 13px.
  Subtitle: "IMO 2024 Marine Fuel Spec · [● CALIBRATED]" in 10px mono.
  Two summary figures side by side:
    "TOTAL CO₂e:  4,812 kg"  in IBM Plex Mono 20px bold ink.
    "vs AIR BASELINE:  -61.4%"  in IBM Plex Mono 20px bold moss #3E6B4F (indicating massive savings over air freight).

SECTION B — Route CO₂ Breakdown Table (full-width, 1px hairline rows):
  Header row (11px uppercase IBM Plex Mono, 1px border-bottom):
    ROUTE · CO₂ kg · CO₂/CONTAINER · vs AIR CO₂ SAVINGS% · vs AIR COST DELTA%
  Data rows (6 routes):
    Row 1: INNSA → NLRTM | 1,842 kg | 18.4 kg/ctr | -62.1% (moss) | -44.8% (moss)
    Row 2: SGSIN → INMAA | 1,204 kg | 24.1 kg/ctr | -58.3% (moss) | -51.2% (moss)
    Row 3: CNSHA → USLAX | 988 kg  | 14.1 kg/ctr | -71.4% (moss) | -63.0% (moss)
    Row 4: DEHAM → INBOM | 512 kg  | 12.8 kg/ctr | -59.7% (moss) | -48.1% (moss)
    Row 5: AEDXB → GBFXT | 198 kg  | 9.9 kg/ctr  | -55.2% (moss) | -41.6% (moss)
    Row 6: JPTYO → MXLZC | 68 kg   | 6.8 kg/ctr  | -73.8% (moss) | -66.4% (moss)
  All CO₂ values in IBM Plex Mono tabular. Percentage savings in moss #3E6B4F.

SECTION C — CO₂ Comparison Note (subtle 1px hairline info card, #FAFBF9 background):
  "AIR FREIGHT BASELINE: ~48 kg CO₂/container per 1,000 km · SEA FREIGHT: ~8–25 kg CO₂/container per 1,000 km"
  In 9px uppercase IBM Plex Mono #5A5D66.

DESIGN RULES (apply globally across all tabs):
- Font pairing: Archivo (UI, headings) + IBM Plex Mono (all numbers, codes, labels).
- Color tokens: paper #F6F7F4, surface-raised #FFFFFF, surface-subtle #FAFBF9, ink #16181D, secondary #5A5D66, hairline #D4D5D0, cobalt #2547C8, oxide #B4452F, moss #3E6B4F.
- Zero box-shadows. Zero border-radius > 4px. Zero gradients on panel fills.
- 1px hairline (#D4D5D0) dividers between all rows, sections, and cards.
- Corner registration L-ticks [ ] on every major panel boundary.
- Currency: USD primary display (e.g. $2,84,000) with Indian Rupee dual-display (₹) where indicated.
- All status chips/pills: flat filled, 2px border-radius, 10px IBM Plex Mono uppercase text.
```

---

## 3. Workflow for Running These in Stitch

1. **Step 1 (Initialize Design System)**: Run `upload_design_md` or `create_design_system` in Stitch using Section 1 above.
2. **Step 2 (Generate Screens)**: Call `generate_screen_from_text` sequentially for Screen 1 through Screen 8 using the exact prompts in Section 2.
3. **Step 3 (Audit & Variants)**: Generate variants for mobile and tablet breakpoints with `generate_variants`.
