# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary:** Logistics operations managers in real-time control tower environments. Their job is to monitor multimodal shipments across global routes, detect disruptions as they occur, evaluate recovery scenarios, and commit decisions within minutes to minimize cost impact and SLA breach. They work 24/7 in high-alert states, scanning dashboards and maps for anomalies, and need to act decisively when disruptions emerge.

Secondary audiences include executive stakeholders monitoring KPIs and financial impact, but the primary design target is the operations manager's workflow.

## Product Purpose

NexaFreight is an autonomous multimodal logistics control tower that provides end-to-end visibility across ocean freight, air cargo, road haulage, and warehouse hubs with real-time decision support.

Success means:
- **Visibility:** Operations managers see the true state of every shipment and know disruptions the moment they occur (not hours later).
- **Autonomy:** The system detects disruptions and generates recovery options without human investigation; managers evaluate and decide, not discover and plan.
- **Action:** Decisions are committed to the network and cascaded across carriers, routes, and modes in real-time.
- **Confidence:** Every metric, alert, and recommendation carries explicit provenance so managers know what is real data vs. derived/forecasted, earning trust in high-stakes decisions.

## Positioning

NexaFreight's differentiation is the full integrated stack:

1. **Real-time autonomous rerouting** with three deterministic recovery options (Accept Delay, Port Divert, Modal Shift) generated automatically when disruptions are detected.
2. **Global multimodal visibility** unified across ocean, air, and road using live AIS telemetry, searoute optimization, and real-time position streams.
3. **AI Operations Copilot** powered by Google Gemini for complex operational queries and root-cause analysis, routed through deterministic rules for precision entity lookups (vessels, shipments, alerts).

Neighboring platforms offer one or two of these; NexaFreight brings all three into a coherent decision-making loop. The value is not in any single capability but in how they compose—disruptions are detected, recovery is automatic, decisions are informed by AI and historical precedent, and outcomes are provable.

## Operating Context

- **Real-time operations:** Managers work in live command-center environments with multiple concurrent shipments in flight. Disruptions arrive without warning (canal blockages, labor stoppages, severe weather, terminal congestion).
- **High-frequency decisions:** When a disruption is detected, managers have minutes to evaluate options and decide. Delays in decision-making cascade into demurrage penalties and SLA breaches.
- **Multimodal complexity:** A single shipment may span ocean, air, and road legs. Disruptions on one mode ripple across others (e.g., port delay triggers re-evaluation of connecting air freight).
- **Audit and compliance:** Every decision is auditable. Managers must explain why they chose a reroute, what the financial trade-offs were, and whether the decision met SLA commitments.
- **Global scale:** Shipments are tracked across dozens of ports, airports, and hubs worldwide. The control tower must render global state at a glance while remaining scannable and not overwhelming.

## Capabilities and Constraints

**Core capabilities:**
- Live vessel tracking with AIS telemetry and position interpolation
- Multimodal route computation (searoute, road/OSRM, air pathfinding)
- Real-time disruption detection (canal blockages, weather, congestion, labor delays)
- Autonomous reroute options (Accept, Divert, Modal Shift) with cost/CO2/time trade-offs
- Predictive ML delay classifier (LightGBM) for risk assessment
- SLA and demurrage monitoring with auto-escalation
- AI Copilot for operational queries and root-cause analysis
- Auditable decision trail with provenance badges (REAL, DERIVED, REPLAYED)

**Technical constraints:**
- Backend runs on FastAPI with SQLite (local dev) or PostgreSQL (production)
- Frontend is Next.js 16 with Server-Sent Events (SSE) for real-time telemetry streams
- All position data must be streamed; no batch delays
- Map rendering uses MapLibre GL for GPU-accelerated performance even with thousands of concurrent entities

**Product constraints:**
- The control tower is the primary surface; other management tools are secondary
- Disruption detection must be real-time; predictive alerts are separate from active disruptions
- Recovery options must be deterministic and explainable; opaque AI decisions are not acceptable in this domain

## Brand Commitments

## Brand Commitments

- **Enterprise SaaS visual identity — "Chartroom":** matte paper #F6F7F4 app
  background, #FFFFFF raised panels, #EDF1FA selected/hover tint; ink #16181D
  primary text, #5F6B7A secondary; 1px hairline borders (rgba(22,24,29,0.14))
  and dashed technical borders; small corner registration ticks; radii 2px
  chips / 4px cards, never larger; shadows, gradients on surfaces, and
  glassmorphism are banned.
- **Single accent — cobalt #2547C8:** active nav, route lines, primary buttons,
  confidence bars, focus rings; pressed #1D3AA6. Semantic colors live in status
  chips/dots only: oxide #B4452F risk, moss #3E6B4F positive.
- **Typography:** Archivo (display, incl. light weight 300 for large headings)
  + IBM Plex Mono for all data, labels, and numerals; tabular figures;
  uppercase mono labels ≤12px with +0.08em tracking. Via next/font.
- **Aurelia atmosphere:** airy shell whitespace, light-weight display headings,
  dot-timeline event feeds. ONE deliberate gradient exception — a 2px spectral
  "live thread" (violet #8B7FD4 → cobalt #2547C8 → teal #3FA796) used ONLY on
  live-streaming indicators (status-strip underline, LIVE chips, SSE-connected
  states); never as surface fill, never on static content.
- **Provenance chips are product law:** every predicted/derived number carries
  an outlined mono chip from the fixed set REAL · CALIBRATED · DERIVED ·
  SIMULATED. Currency ₹. Voice: calm, precise, factual.
- **Reference images:** design_concepts/ (dashboard, hero, ledger, merged) are
  the visual north stars for this identity.

## Evidence on Hand

- Working backend with 608 passing tests
- Working frontend with 234 passing tests
- Live demo capability with seeded data
- Real AIS telemetry integration (aisstream.io) and searoute API integration
- ML models trained and integrated (LightGBM delay classifier, StatsForecast demand)
- Deployed architecture documented (Render.yaml for production)

## Product Principles

1. **Real-time truth over predictions.** Data-driven decisions backed by live telemetry earn trust; forecasts are explicitly labeled and secondary.
2. **Autonomy amplifies operators.** The system discovers and proposes; humans decide and commit. Automation that removes decision-making from humans is failure.
3. **Every action is auditable.** Provenance, decision rationale, and outcome are captured. This is not a black box.
4. **Scannable at a glance.** Global logistics is data-dense; the UI must surface what matters now without overwhelming the operator.
5. **Multimodal is one system, not three tabs.** Ocean, air, and road are integrated in the same workflows, not siloed interfaces.

## Accessibility & Inclusion

Global 24/7 operations require accessibility for diverse operators.- **WCAG 2.1 AA is the committed floor:** all text meets AA contrast against
  paper surfaces; color is never the sole carrier of meaning (status pairs an
  icon/dot with text); full keyboard navigation for rapid operator entry;
  screen-reader labels on live regions. Known needs: color-blind operators, screen reader users, keyboard navigation for rapid command entry.
