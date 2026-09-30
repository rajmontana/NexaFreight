/**
 * Paper waybill cards — the map popup surface.
 *
 * Replaces the dark translucent popups inherited from the template fork
 * (`background:rgba(12,14,26,0.95); backdrop-filter:blur(16px); border-radius:10px`).
 *
 * A waybill card is a printed document, not a HUD panel:
 *   · --paper ground, 1px --border-hairline rule, 2px corner
 *   · mono type throughout, ink on paper
 *   · label/value rows separated by hairlines, values right-aligned
 *   · money in ₹, converted at the pinned fx.usd_inr
 *   · a provenance chip carrying the RAW backend token
 *
 * On the chip: this surface prints the backend's own provenance value
 * (REAL / REPLAYED / DERIVED / CALIBRATED / SIMULATED / MOCK) rather than the
 * three-way LIVE/REPLAY/SIM collapse used by the legacy badge. A waybill is an
 * audit document, so it should not round `DERIVED` up to "replayed AIS".
 *
 * All builders are pure string functions and unit tested.
 */

import { CHARTROOM } from './freightMarkers'
import { formatInrCompact } from '@/lib/format/inr'

/** Escape untrusted values before they enter popup HTML. */
export function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const MONO = `'IBM Plex Mono','JetBrains Mono',ui-monospace,monospace`

/** Known provenance tokens and how confident the chip is allowed to look. */
const PROVENANCE_WEIGHT: Record<string, 'measured' | 'computed' | 'synthetic'> = {
  REAL: 'measured',
  CALIBRATED: 'measured',
  REPLAYED: 'computed',
  DERIVED: 'computed',
  HISTORICAL: 'computed',
  SIMULATED: 'synthetic',
  MOCK: 'synthetic',
}

/**
 * Provenance chip in Chartroom ink. Prints the exact token supplied.
 * Unknown/absent provenance prints UNKNOWN rather than defaulting to a
 * flattering value.
 */
export function provenanceChip(provenance?: string | null): string {
  const token = String(provenance ?? '').trim().toUpperCase() || 'UNKNOWN'
  const weight = PROVENANCE_WEIGHT[token]

  // measured  → solid cobalt rule   (instrument reading)
  // computed  → hairline rule       (calculated from a reading)
  // synthetic → dashed hairline     (no reading behind it)
  const border =
    weight === 'measured'
      ? `1px solid ${CHARTROOM.cobalt}`
      : weight === 'synthetic'
        ? `1px dashed ${CHARTROOM.hairline}`
        : `1px solid ${CHARTROOM.hairline}`
  const color = weight === 'measured' ? CHARTROOM.cobalt : CHARTROOM.ink

  return (
    `<span style="display:inline-block;border:${border};color:${color};` +
    `font-family:${MONO};font-size:9px;letter-spacing:0.1em;line-height:1;` +
    `padding:2px 5px;border-radius:2px;white-space:nowrap;">${esc(token)}</span>`
  )
}

export interface WaybillRow {
  label: string
  value: string
  /** Render the value in cobalt to mark it as the row that matters. */
  emphasis?: boolean
}

/** A label/value row with a hairline rule beneath it. */
function rowHtml(row: WaybillRow, last: boolean): string {
  const rule = last ? '' : `border-bottom:1px solid ${CHARTROOM.hairline};`
  const valueColor = row.emphasis ? CHARTROOM.cobalt : CHARTROOM.ink
  const weight = row.emphasis ? '600' : '400'
  return (
    `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;` +
    `padding:5px 0;${rule}">` +
    `<span style="font-size:9.5px;letter-spacing:0.08em;color:#5A5D66;text-transform:uppercase;">${esc(row.label)}</span>` +
    `<span style="font-size:11px;color:${valueColor};font-weight:${weight};text-align:right;">${esc(row.value)}</span>` +
    `</div>`
  )
}

export interface WaybillCardOptions {
  /** Document kind printed top-left, e.g. "MARITIME · VESSEL". */
  kind: string
  /** Reference number printed top-right, e.g. "NF-8A2C91F0". */
  reference: string
  /** Provenance token for the chip. */
  provenance?: string | null
  /** Body rows. */
  rows: WaybillRow[]
  /** Optional footer note, printed small and grey. */
  footer?: string
  /** Optional call-to-action anchor HTML appended under the footer. */
  action?: string
  /** Minimum card width in px. */
  minWidth?: number
}

/**
 * Render a full paper waybill card.
 *
 * The outer element carries `data-waybill` so globals.css can neutralise
 * maplibre's default popup chrome around it.
 */
export function waybillCard(opts: WaybillCardOptions): string {
  const { kind, reference, provenance, rows, footer, action, minWidth = 268 } = opts

  const header =
    `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;` +
    `padding-bottom:6px;border-bottom:1px solid ${CHARTROOM.ink};margin-bottom:2px;">` +
    `<span style="font-size:9.5px;letter-spacing:0.14em;color:${CHARTROOM.ink};font-weight:700;text-transform:uppercase;">${esc(kind)}</span>` +
    `<span style="font-size:10px;letter-spacing:0.06em;color:#5A5D66;">${esc(reference)}</span>` +
    `</div>`

  const chip = provenance === undefined ? '' :
    `<div style="display:flex;justify-content:flex-end;padding:6px 0 2px;">${provenanceChip(provenance)}</div>`

  const body = rows.map((r, i) => rowHtml(r, i === rows.length - 1)).join('')

  const foot = footer
    ? `<div style="margin-top:8px;padding-top:6px;border-top:1px solid ${CHARTROOM.hairline};` +
      `font-size:9px;line-height:1.45;color:#5A5D66;">${esc(footer)}</div>`
    : ''

  const act = action ? `<div style="margin-top:8px;">${action}</div>` : ''

  return (
    `<div data-waybill style="background:${CHARTROOM.paper};color:${CHARTROOM.ink};` +
    `border:1px solid ${CHARTROOM.hairline};border-radius:2px;padding:11px 12px;` +
    `font-family:${MONO};min-width:${minWidth}px;">` +
    header + chip + body + foot + act +
    `</div>`
  )
}

/** A cobalt text action link sized for a waybill footer. */
export function waybillAction(label: string, href: string): string {
  return (
    `<a href="${esc(href)}" style="display:inline-block;font-family:${MONO};font-size:9.5px;` +
    `letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;color:${CHARTROOM.paper};` +
    `background:${CHARTROOM.cobalt};padding:5px 10px;border-radius:2px;">${esc(label)}</a>`
  )
}

/** Loading state that keeps the paper frame so the popup does not jump. */
export function waybillLoading(kind: string, reference: string): string {
  return waybillCard({
    kind,
    reference,
    provenance: undefined,
    rows: [{ label: 'status', value: 'retrieving…' }],
  })
}

/** Money row helper: takes USD from the backend, prints ₹. */
export function inrRow(label: string, usd: number | null | undefined, emphasis = false): WaybillRow {
  if (usd === null || usd === undefined || !Number.isFinite(usd)) {
    return { label, value: '—', emphasis }
  }
  return { label, value: formatInrCompact(usd * usdRate()), emphasis }
}

/** Indirection so tests can pin the rate without touching process.env. */
let _rate: number | null = null
export function setWaybillRate(rate: number | null): void {
  _rate = rate
}
function usdRate(): number {
  if (_rate !== null) return _rate
  const raw = process.env.NEXT_PUBLIC_USD_INR
  const n = raw ? Number(raw) : Number.NaN
  return Number.isFinite(n) && n > 0 ? n : 95.8
}
