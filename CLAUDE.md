# CLAUDE.md — NexaFreight working rules (loaded every session)

## Precedence
1. DESIGN.md — visual law (tokens, banned list). No exceptions without human approval.
2. PRODUCT.md — product truth (users, provenance law, voice).
3. This file — workflow law.
The `frontend-design` plugin is a brainstorm aid only; if it ever contradicts
DESIGN.md, DESIGN.md wins.

## Workflow (every wave)
- Branch per wave: feat/chartroom-wave1, wave2, ...
- Stage explicit paths only; `git add .` is forbidden
- Conventional commits (feat:, fix:, chore:), plain English
- PR to main; ALL CI checks green; the PR diff is audited by an external
  reviewer (me, via relay) BEFORE merge
- Merge commits only, never squash; never force-push main
- Never commit secrets (.env, tokens, connection strings)
- .impeccable/ working files stay untracked per .gitignore

## Design quick-law (full detail in DESIGN.md)
- Paper #F6F7F4, ink #16181D, cobalt #2547C8 accent; oxide #B4452F / moss
  #3E6B4F in status chips only
- Banned: shadows, gradients (sole exception: 2px spectral live-thread on
  LIVE indicators), glassmorphism, nested cards, Inter, text below 12px
- Archivo (UI/display, weight 300 for large headings) + IBM Plex Mono
  (all data/labels/numerals), tabular figures
- Provenance chip (REAL / CALIBRATED / DERIVED / SIMULATED) on every
  predicted or derived number; money in ₹; WCAG AA on paper surfaces

## Scope discipline
- Chartroom waves are RESKIN only: no route, data-hook, API, or behavior changes
- Globe stack (GlobeMap.tsx, useSSEPositions, tile proxy) untouched in waves 1-2
- If a task seems to require changing logic, STOP and ask — do not improvise

## Visual references
- design_concepts/*.png are the north stars (dashboard, hero, ledger, merged)