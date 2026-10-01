# CHARTER — WAVE 5: "PAGES, NOT PANELS" (IA rebuild, frontend-only)

## Mission
Convert the single-screen overlay cockpit into a multi-page application with dedicated
routes. The globe stays on Overview only. Every sidebar item becomes a real page.
The AI copilot becomes a persistent floating dock on all pages. Backend: UNTOUCHED.

## Hard laws (violations = rejected)
1. Frontend only. No file outside `frontend/` may change. No new npm dependencies
   (next/font, recharts, lucide-react, framer-motion already available).
2. DESIGN.md is visual law: paper/ink/cobalt, hairlines, 2-4px radii, NO shadows,
   NO gradients except the 2px spectral live-thread, Archivo + IBM Plex Mono only,
   tabular numerals, NO box-in-box nesting. The Stitch mock's boxy surfaces and
   font drift are BANNED; port its content (chart types, card structure), never its skin.
3. All data via existing `src/lib/nexafreight/client.ts` wrappers (apiFetch) against
   the FastAPI backend. No mocking. Panels that lack data print NO DATA states —
   never fake zeros.
4. `git add` explicit paths only. Conventional commits. One increment = one PR.
5. Provenance chips (post-3c law config: REAL/CALIBRATED/DERIVED/SIMULATED) on
   every predicted/derived number. Money in ₹ (formatInrCompact exists).

## Target routes
- `/` Overview — globe-centric: KpiBand, status strip, GlobeMap, alerts drawer,
  shipment PEEK drawer (max 360px, scrim + close button, auto-close on navigation).
  REMOVE all permanent right-column panels from this page.
- `/shipments` Ledger — full-page table: ID, lane, mode, status, ETA window,
  confidence bar, risk, cost (₹). Filters (status/mode), provenance chips,
  row click -> /shipments/[id]. Data: getShipments() with pagination.
- `/shipments/[id]` Dossier — full page: header KPI cards (from b5831f7 pattern),
  route map (static path or mini-map), legs timeline, events, financials (₹),
  ETA prediction with confidence + provenance chip. Data: getShipmentDetail,
  getShipmentRoute, /financials, /predict.
- `/insights` Analytics — the operational analytics page (bar/line charts from the
  approved Stitch screen, Chartroom-skinned, recharts): scorecard, SLA, ESG CO2,
  financial. Data: /api/analytics/scorecard, /sla, /esg, /financial.
- `/alerts` Alerts — full-page queue + acknowledge + decision history.
  Data: /api/alerts, /api/decisions.

## Global chrome
- Nav rail: convert every item from state-toggle to Next.js <Link>; active route =
  cobalt text + 2px left rule; badge counts where cheap (alerts count).
- CopilotQuickDock: moved into src/app/layout.tsx (inside the authed area) so it
  floats bottom-right on EVERY page. Width ~380px, collapsible to a round rail button.
- Status strip: shared layout (already exists) — unchanged.

## Increments (each = one PR; do NOT mix)
- 5A: route skeletons + nav conversion + copilot dock to layout + Overview cleanup
  (remove embedded panel zoo, keep drawers with scrim/close).
- 5B: /shipments + /shipments/[id].
- 5C: /insights + /alerts.
After each: `npm run build` green + `npx vitest run` green + impeccable audit, then
explicit-path add -> commit -> push -> PR -> CI green before the next increment.

## 5B ADDENDUM — ILLUSTRATION LAYER (decided 09-30, supersedes paper-texture idea)

Depth comes from LINE-ART ILLUSTRATION, not textures/shadows. All art = inline SVG
components (never raster images), ink + cobalt strokes only, flat per DESIGN.md:
1. LoadingGlobe.tsx — wireframe globe (dotted continents), dashed great-circle
   routes with stroke-dashoffset draw animation, tiny vessel/plane silhouettes,
   mono caption "PLOTTING ACTIVE LANES..." + progress counter. Used as the app
   loading state and long-fetch placeholder.
2. Login illustration — globe + plexus + port dots on /login's left pane (desktop).
3. PlexusHeader.tsx — faint (~8% opacity) hairline network behind page titles on
   /insights, /shipments, /alerts; aria-hidden; reusable.
Reference images: design_concepts/nexafreight_art_*.png. Banned: stock photo
collages, blue photomontage style, raster textures.

4. GlobalBackdrop.tsx — fixed full-viewport ambient SVG behind ALL authenticated
   pages: dotted world graticule + sparse plexus web + 1-2 dashed route arcs with
   tiny ship/plane silhouettes, ~4-5% opacity, pointer-events-none, z-index below
   all content, aria-hidden. Content panels sit on it crisply (ref concept
   nexafreight_art_ambient_backdrop.png).
5. Map-frame ornaments (Overview only): small inline-SVG compass rose + scale bar
   pinned to the map frame corners; ink/cobalt hairline style.
6. (Polish pass, later) EmptyStateVignette.tsx — tiny line sketches for NO DATA
   moments (quiet ship for empty alerts, empty ledger, zero search results).

## Acceptance

- Clicking sidebar items performs real navigation (URL changes).
- No shipment detail column persists over the map; peek drawer closes on navigation.
- /insights shows REAL numbers from the seeded local world or NO DATA states.
- Zero DESIGN.md violations (grep-able: no boxShadow except spectral, no new hex
  outside the palette, no JetBrains/Inter).
- All previous tests stay green.
