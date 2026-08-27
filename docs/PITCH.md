# NexaFreight — Pitch Kit
**Deck skeleton · 8-minute demo script · Q&A kill-sheet** (companion: `docs/FINAL_AUDIT.md`)

---

## A. Deck skeleton (10 slides)

1. **Title** — NexaFreight Control Tower: multi-modal logistics intelligence with human command. One line: "Real data. Real decisions. Full audit."
2. **The problem** — freight ops drown in spreadsheets; when disruption hits, decisions are made on gut feel with no priced options, no audit trail, no carbon accounting.
3. **The product** — live control tower: map + shipments + alert inbox where **AI recommends with cost math and humans decide** under authority limits. (Screenshot: Alert Inbox.)
4. **The honesty architecture** (differentiator slide) — every number carries provenance: REAL / DERIVED / CALIBRATED / PROJECTED. Data sources table (DataCo 180K real records, NGA ports, UNCTAD dwell, Verschuur disruption DB, live AIS/ADS-B/weather). "Nothing on this screen is fabricated — ask any number where it came from."
5. **Live demo** — run the script below.
6. **The intelligence** — models with honest scores: ETA quantiles (LightGBM, MAE 1.14 days, time-split), demand forecast (MASE 0.996 vs seasonal-naive, backtested), all registered & auditable in the model registry.
7. **The decision engine** — SOP rules as versioned data; options priced from real tariffs; authority matrix enforced server-side (403 demo); immutable audit trail; expedite ROI log.
8. **ESG built-in** — GLEC CO₂e per mode, internal carbon price in every cost stack, green-shift quantified.
9. **Architecture & cost** — FastAPI + Postgres, deployed on free tiers ($0/month), CI-guarded, reproducible env. Scales to real EDI feeds 1:1 (schema ready).
10. **Roadmap & ask** — MILP multi-shipment consolidation, live EDI binding, carrier scorecards; pilot partners.

## B. 8-minute demo script

| Min | Action | Say |
|---|---|---|
| 0:00 | Login as `manager@` | "Role-based access — five roles, approval limits from the company's own SOP matrix." |
| 0:30 | Dashboard | "65,752 real shipments from a published 180K-record dataset — every card tagged with its data source. Lanes follow real maritime geometry, not straight lines." |
| 1:30 | Shipments → filter OCEAN → open a row | "Milestone timeline from real timestamps; cargo lines; every field provenance-labeled." |
| 2:30 | Alerts → Generate | "The rule engine watches operations against the SOP rulebook — 25 exceptions found in the replay window." |
| 3:00 | Open top alert → options table | "AI prices every option with real tariffs: hold, reroute, partial air — expected total cost, probability from our ETA model, not vibes." |
| 3:45 | Ask copilot: "why reroute over air here?" | "Grounded in the SOP rulebook — cites rule codes; it explains, it never decides." |
| 4:15 | Type reason → Approve | "Decision logged permanently — who, when, why, which SOP version." |
| 4:45 | Logout → login as `dispatcher@` → try approving the $12,500 option | "Server rejects: exceeds $2,500 authority. The org chart is enforced in code." |
| 5:30 | Finance | "Exposure from real values; breakeven chart — air becomes optimal above $3,600 of penalty exposure; every approved decision lands in the ROI log with net saved." |
| 6:30 | Analytics | "Control charts on lead times — SPC from the syllabus, operationalized. Forecast with an honest backtest score shown on the chart." |
| 7:15 | ESG | "GLEC-factor emissions by mode, carbon priced at $60/t inside every decision." |
| 7:45 | Close | "Real data, priced options, human authority, full audit — at zero hosting cost. The schema is EDI-ready: plug a real feed in and this becomes production." |

## C. Q&A kill-sheet

| They ask | You answer |
|---|---|
| "Is this real data?" | Provenance system: 180K real published records + live feeds; every screen labels sources; we never fabricate — the UI says EMPTY when a feed is off. |
| "How good is the ML?" | Honest, time-split scores in the registry: ETA MAE 1.14 days; forecast MASE 0.996 vs seasonal-naive baseline. We publish the baseline comparison. |
| "What if the AI is wrong?" | It recommends only; humans decide with mandatory reasons; decisions immutable; outcomes feed back. |
| "Who can spend money?" | SOP authority matrix enforced server-side — dispatcher $2.5k, manager $25k, director $100k (demo shows the 403). |
| "Ships on the map?" | Real lane geometry (searoute) now; live AIS vessels via free AISStream with `FEED_MODE=live` (built + tested; key provisioned). |
| "Cost to run?" | $0/month — Render free + Neon free, kept warm by a health ping; CI on GitHub Actions. |
| "Scale?" | Streaming ingestion (180K rows in ~47s, bounded RAM), stateless container, EDI-ready schema. |
| "SOPs changed?" | They're versioned data — edit the rulebook, no code changes; every decision records the rule version used. |
