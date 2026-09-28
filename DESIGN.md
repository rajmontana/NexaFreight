---
name: NexaFreight
description: Enterprise logistics control tower with nautical chart aesthetic and calm precision
colors:
  paper: "#F6F7F4"
  ink: "#16181D"
  cobalt: "#2547C8"
  cobalt-pressed: "#1D3AA6"
  oxide-risk: "#B4452F"
  moss-positive: "#3E6B4F"
  alert-red: "#DC3545"
  alert-orange: "#FFC107"
  alert-green: "#28A745"
  alert-blue: "#007BFF"
  border-hairline: "#D4D5D0"
  text-secondary: "#5A5D66"
  bg-subtle: "#FAFBF9"
typography:
  display:
    fontFamily: "'Archivo', -apple-system, sans-serif"
    fontSize: "32px"
    fontWeight: 300
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "'Archivo', -apple-system, sans-serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "'Archivo', -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0"
  body:
    fontFamily: "'Archivo', -apple-system, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  label:
    fontFamily: "'IBM Plex Mono', monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.02em"
rounded:
  xs: "2px"
  sm: "3px"
  md: "4px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.cobalt-pressed}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "8px 16px"
  input-default:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
  card-default:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
---

# Design System: NexaFreight

## Overview

**Creative North Star: "Nautical Chart & Technical Waybill"**

NexaFreight adopts the aesthetic of printed maritime charts and logistics documents—paper surfaces, precisely ruled ink text, hairline separations, and corner registration ticks. The metaphor is intentional: charts are documents operators trust with lives and cargo. They distill complexity into legible layers. They're calm, not urgent. They've been refined across centuries.

The interface is light-first. Paper-white backgrounds (#F6F7F4) with ink-dark text (#16181D) and a single, confident cobalt accent (#2547C8) for interactive and live elements. Semantic colors (oxide for risk, moss for positive) appear only in narrow, purposeful contexts—chips, small badges, specific data cells. No gradients except one: a spectral thread (violet → cobalt → teal) marks live data streams, a single visual currency for "this is streaming now."

Hierarchy lives in surface shifts and hairline rules, never in depth cues or shadows. Surfaces are flat. Radii are minimal (2–4px). Components are generous with whitespace but densely populated with scannable data. The shell is calm; the panels are tactically dense.

**Key Characteristics:**
- Light paper aesthetic, not dark ops
- Hairline rules and registration marks, not glass and gloss
- Single cobalt accent + semantic oxide/moss palette
- Flat design: no shadows, no depth, no skeuomorphism
- Spectral thread accent for live streams only
- Generous spacing around dense data tables
- Monospace data (coordinates, times, IDs); humanist UI text (Archivo)

## Colors

The palette is derived from printed nautical charts: opaque paper, crisp ink, the cobalt of traditional chart printing, and reserved semantic reds and greens for alert contexts.

### Primary

- **Cobalt Primary** (#2547C8): Interactive elements, buttons, links, active tabs, live indicators. Used sparingly—the restraint is the point. Never more than 10% of any surface.
- **Cobalt Pressed** (#1D3AA6): Hover, active, and focused states. Deliberately darker for tactile feedback.
- **Paper** (#F6F7F4): Background for all surfaces, cards, panels, and primary reading context.

### Secondary

- **Oxide Risk** (#B4452F): Severity chips, risk badges, critical alerts. Warm, earthy red borrowed from maritime charts' hazard notation.
- **Moss Positive** (#3E6B4F): Completion states, positive confirmations, health indicators. Cool, muted green for calm affirmation.

### Tertiary

- **Alert Red** (#DC3545): Critical disruptions, SLA breaches, system errors. Higher chroma than oxide for truly urgent exceptions.
- **Alert Orange** (#FFC107): Warnings, pending actions, attention needed.
- **Alert Green** (#28A745): Success confirmations and positive outcomes.
- **Alert Blue** (#007BFF): Informational messages and secondary alerts.

### Neutral

- **Ink** (#16181D): Primary text, body copy, labels, headings. Dark enough for WCAG AAA contrast on paper.
- **Text Secondary** (#5A5D66): Metadata, timestamps, secondary content, supporting information. Intentionally muted.
- **Border Hairline** (#D4D5D0): Rules, dividers, table separations, cell borders. Minimal visual weight—present but not demanding.
- **Background Subtle** (#FAFBF9): Alt rows in tables, subtle surface shifts for nested grouping. Barely perceptible; no distinct container needed.

### Named Rules

**The Restraint Rule.** Cobalt is used on ≤10% of any given screen. Its rarity signals that an element is interactive and consequential. Overuse flattens the hierarchy.

**The Spectral Thread Rule.** A single gradient (violet #8B7FD4 → cobalt #2547C8 → teal #3FA796) appears exclusively on live data stream indicators and "streaming now" badges. It is the only gradient in the system, reserved for this single purpose.

**The Paper First Rule.** Every surface defaults to paper background (#F6F7F4) with ink text. No dark mode presets, no neon, no theme switcher. One durable aesthetic.

## Typography

**UI Font:** Archivo (variable, 300–600 weights; sans-serif)
**Data Font:** IBM Plex Mono (with tabular figures; monospace for coordinates, times, IDs, numerals)
**Fallback:** System fonts (-apple-system for UI; system monospace for data)

**Character:** Archivo is geometric and measured—a technical typeface without coldness. Its variable weight range (300 light for large headings, 600 bold for emphasis) lets you breathe space into typography without adding visual weight. IBM Plex Mono with tabular figures aligns numerical columns precisely, critical for dense operational data. Together they reinforce the split personality: measured UI decisions over machine-precise data facts. **Inter is banned.** "Inter Everywhere" is an anti-pattern in this system.

### Hierarchy

- **Display** (300, 32px, 1.2 line-height, -0.02em tracking): Hero headlines, page titles. Light weight creates breath; used only for the main dashboard title or major surface transitions. Rare.
- **Headline** (500, 20px, 1.3 line-height, -0.01em tracking): Panel titles, section headers, drawer headings. Mid-weight for authority without density.
- **Title** (600, 14px, 1.4 line-height): Subsection headers, card titles, data group labels. Bold for clear hierarchy within dense layouts.
- **Body** (400, 13px, 1.5 line-height): Primary reading text, descriptions, help copy. Optimized for 65–75 characters per line (approximately 500px on desktop).
- **Label** (500, 11px, 1.4 line-height, 0.02em tracking, monospace, tabular figures): Data labels, timestamps, coordinates, shipment IDs, numerals. Tabular figures align columns precisely.

### Named Rules

**The Archivo-Only Rule.** All UI text (buttons, labels, instruction copy, headers) uses Archivo. No Inter. "Inter Everywhere" is a banned anti-pattern.

**The Mono-Data Rule.** All user-facing data that operators need to act on (coordinates, times, shipment IDs, vessel names, port codes, numerals) is rendered in IBM Plex Mono with tabular figures. This creates a visual signal: "this is a fact you can cite." UI chrome (buttons, labels, instruction text) stays in Archivo.

**The Weight Hierarchy Rule.** Font weight is the only weight-based signal (no color shifts for hierarchy). Archivo's variable weight range (300–600) provides visual distinction without adding density. Display uses 300 light; headlines use 500; titles use 600 bold. Body text is always 400 regular.

## Layout

NexaFreight uses a flexible grid with generous gutters around a central data panel. The control tower is single-column on mobile, multi-panel on desktop.

**Desktop (≥1024px):**
- Left panel: Shipment search, active filters (4–6 items, sparse)
- Center panel: Globe map or detailed table view (60% width)
- Right panel: Alert stack, shipment inspector (3–4 alerts visible, rest scroll)
- Gutters: 16px between panels, 20px from edges

**Tablet (640–1023px):**
- Single column, full-bleed panels
- Panels drawer as overlay (side-slide from right)

**Mobile (<640px):**
- Full-bleed stacked layout
- Map, alerts, inspector as separate scrollable sections
- Bottom navigation or tab switcher

**Spacing rhythm:** 4px base unit. Components use multiples (8, 12, 16, 24) for consistency. Dense data tables compress to 8px vertical rhythm; airy shells use 16px+.

**Container max-width:** 1400px (desktop). Panels grow proportionally; no fixed side widths.

## Elevation & Depth

NexaFreight uses **zero shadows**. Depth and layering are conveyed entirely through surface color shifts and hairline rules.

- **Base surface:** Paper background (#F6F7F4)
- **Elevated surface (cards, panels):** Paper (same color) with hairline border (#D4D5D0) on all sides or strategic sides only
- **Data container (table):** Paper with hairline borders between rows/columns; alt rows use subtle background (#FAFBF9)
- **Focused element:** Hairline border shift to cobalt (#2547C8); no glow or shadow

**No box-shadows.** All visual separation is accomplished via hairlines and surface-color progression. This maintains the printed aesthetic and keeps the interface crisp, not soft.

## Shapes

Corners are minimal: 2–4px max radius throughout the system.

- **Buttons:** 2px radius (xs)
- **Cards & panels:** 3–4px radius (sm–md)
- **Inputs & chips:** 2–3px radius
- **Large containers:** 4px radius (md)

No rounded full-width elements; no pill buttons unless explicitly a chip/tag. Edges stay crisp and geometric, reflecting the technical precision of maritime charts.

**Borders:** Hairlines (1px) only. No thick strokes. Never more than one border per edge unless explicitly creating a sub-grid.

**Registration marks (optional):** Small corner ticks (L-shaped, 1px thick) can appear on major panels for added nautical-chart authenticity. Not required; optional if implementing at higher fidelity.

## Components

### Buttons

- **Shape:** 2px radius (xs)
- **Primary:** Cobalt background (#2547C8), paper text (#F6F7F4), padding 8px 16px. Compact and decisive. Archivo 600 weight.
- **Primary Hover / Focus:** Cobalt Pressed (#1D3AA6), outline shift to cobalt hairline if needed for keyboard navigation.
- **Secondary / Ghost:** Paper background with ink text, hairline border (#D4D5D0). Same padding. Archivo 500 weight.
- **Disabled:** 40% opacity of the active state; never grayed out or desaturated separately.

Buttons are text-only or icon+text. No button-only icons without labels in primary contexts.

### Inputs & Fields

- **Style:** Bordered box with paper background (#F6F7F4) and 2px radius, hairline border (#D4D5D0).
- **Focus:** Border shifts to cobalt (#2547C8, 1px hairline); no inner glow or shadow.
- **Placeholder:** Text Secondary color (#5A5D66), regular weight.
- **Error:** Border shifts to Alert Red (#DC3545); inline error text below in Alert Red.
- **Disabled:** 60% opacity; background shift to Background Subtle (#FAFBF9).

### Chips & Tags

- **Style:** Compact inline badge with paper background, hairline border, 3px radius.
- **Semantic:** Oxide for risk (background #B4452F, text paper), Moss for positive (background #3E6B4F, text paper), Cobalt for neutral/selected.
- **Removable chips:** X icon on the right, hover shifts to pressed state.

### Cards & Containers

- **Corner Style:** 3–4px radius (sm–md)
- **Background:** Paper (#F6F7F4) with hairline border on all sides or strategic sides.
- **Border:** Hairline (#D4D5D0). Optional: subtle background shift (#FAFBF9) for alt rows or grouped cards.
- **Internal Padding:** 12–16px (md–lg). Dense tables: 8px (xs–sm) rhythm for rows.
- **Shadow Strategy:** None. Elevation conveyed through border and subtle background shifts only.

### Tables & Data Panels

- **Header row:** Headline (500, 20px), ink color, optional hairline bottom border. Archivo.
- **Data rows:** Body text (400, 13px) for labels, Label monospace (11px, IBM Plex Mono tabular) for data cells. Alt rows: Background Subtle (#FAFBF9).
- **Cell padding:** 8px horizontal, 6px vertical. Monospace data is left-aligned; numeric data right-aligned (tabular figures handle decimal alignment).
- **Dividers:** Hairline borders between cells, not heavy rules.

### Navigation

- **Primary nav:** Top bar or left sidebar, depending on viewport. Archivo headline (20px, 600).
- **Active state:** Cobalt text or underline; never background color fill.
- **Hover:** Subtle background shift to Background Subtle (#FAFBF9).
- **Mobile:** Bottom tab bar or drawer; same color logic.

### Live Data Indicators

- **Streaming badge:** Spectral gradient background (violet → cobalt → teal), paper text, 3px radius, 6px padding. Monospace label: "STREAMING" or small pulsing dot with "LIVE".
- **Live map markers:** Spectral gradient outline, pulse animation at 1.5s interval. No fill; outline only.

## Do's and Don'ts

### Do:

- **Do** use Archivo for all UI text (buttons, labels, headers, instruction copy). No Inter. Never.
- **Do** use IBM Plex Mono with tabular figures for all operational data: timestamps, coordinates, shipment IDs, vessel names, tracking numbers, numerals.
- **Do** use Archivo's variable weight range for hierarchy: 300 light for large display, 500 for headlines, 600 bold for titles, 400 regular for body.
- **Do** use cobalt sparingly. Never more than 10% of the visible screen.
- **Do** use hairline borders (1px, #D4D5D0) for all divisions and cell separations.
- **Do** use generous whitespace around dense data areas. Airy shell, dense core.
- **Do** use the spectral thread (violet → cobalt → teal) exclusively for live data stream indicators.
- **Do** keep radii small (2–4px max). No fully rounded elements unless they're chips/tags.
- **Do** align numeric data right, text data left. Tabular figures handle decimal alignment.
- **Do** test for WCAG AAA contrast: ink (#16181D) on paper (#F6F7F4) = 16.3:1.

### Don't:

- **Don't** use Inter anywhere. "Inter Everywhere" is a banned anti-pattern. Use Archivo instead.
- **Don't** use JetBrains Mono. Use IBM Plex Mono with tabular figures for all data/operational text.
- **Don't** use shadows or gloss effects. No box-shadow, no inset shadows, no glow. Depth is conveyed via borders and surface shifts only.
- **Don't** use the secondary accent colors (oxide, moss) anywhere except chips, badges, and specific semantic contexts. They're not decorative.
- **Don't** create dark mode presets. Paper-first is the durable system.
- **Don't** exceed 4px corner radius. No pill shapes or overly soft edges.
- **Don't** mix gradients except for the spectral thread on live indicators.
- **Don't** use more than 2 font families (Archivo + IBM Plex Mono). No serif decorative fonts or additional sans-serif faces.
- **Don't** use heavy strokes or thick borders. Keep all rules hairline (1px).
- **Don't** create color palettes beyond the stated primaries, semantics, and alerts. No custom accent variants per surface.
