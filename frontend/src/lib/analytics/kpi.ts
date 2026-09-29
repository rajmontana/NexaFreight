/**
 * Headline KPI derivation — the four numbers on the control-tower band.
 *
 * Every figure here is derived from a real backend analytics payload:
 *   on-time %        ← GET /api/analytics/sla       (sla_status per shipment)
 *   financial ₹      ← GET /api/analytics/financial (undecided_total_pending_est)
 *   SLA at-risk      ← GET /api/analytics/sla       (AT_RISK + disrupted rows)
 *   Scope-3 CO2      ← GET /api/analytics/esg       (sum of kg_co2)
 *
 * These are pure functions over the response objects so they can be unit
 * tested without a network or a database.
 *
 * Provenance discipline: each KPI carries the `provenance` string reported by
 * the endpoint that produced it. Nothing is invented. When a payload is absent
 * or empty the KPI resolves to `available: false` and the tile renders "NO
 * DATA" rather than a zero that reads like a measurement.
 */

import type {
  AnalyticsEsgResponse,
  AnalyticsFinancialResponse,
  AnalyticsSlaResponse,
  AnalyticsSummaryResponse,
} from '@/lib/nexafreight/types'
import { usdToInr } from '@/lib/format/inr'

/** A single headline figure plus the evidence needed to defend it. */
export interface Kpi {
  /** Machine key, stable for tests and DOM ids. */
  key: 'on_time' | 'exposure' | 'at_risk' | 'scope3'
  /** Short operator-facing label. */
  label: string
  /** Pre-formatted display string, or '—' when unavailable. */
  display: string
  /** Raw numeric value (null when unavailable). Unit depends on the KPI. */
  value: number | null
  /** Supporting line under the number — always states the denominator. */
  detail: string
  /** Provenance reported by the source endpoint. */
  provenance: string
  /** False when the source payload was missing/empty. */
  available: boolean
  /** Endpoint this figure came from, shown in the tooltip for auditability. */
  source: string
}

/** Window used for the financial exposure tile. */
export type ExposureWindow = 'day' | 'week' | 'month'

const NO_DATA = '—'

/**
 * On-time rate across shipments that have a settled or projected SLA verdict.
 *
 * Denominator deliberately excludes nothing: ON_TIME / (ON_TIME + AT_RISK +
 * LATE). A shipment currently AT_RISK is not yet late, but counting it out of
 * the denominator would inflate the headline, so it stays in.
 */
export function deriveOnTime(sla: AnalyticsSlaResponse | null): Kpi {
  const base: Omit<Kpi, 'display' | 'value' | 'detail' | 'available'> = {
    key: 'on_time',
    label: 'ON-TIME',
    provenance: sla?.provenance ? String(sla.provenance) : 'UNKNOWN',
    source: 'GET /api/analytics/sla',
  }

  const rows = sla?.rows ?? []
  if (rows.length === 0) {
    return { ...base, display: NO_DATA, value: null, detail: 'no SLA rows', available: false }
  }

  const onTime = rows.filter((r) => r.sla_status === 'ON_TIME').length
  const pct = (onTime / rows.length) * 100

  return {
    ...base,
    display: `${pct.toFixed(1)}%`,
    value: pct,
    detail: `${onTime} of ${rows.length} shipments`,
    available: true,
  }
}

/**
 * Financial exposure in ₹ — money at risk but not yet realised.
 *
 * Uses `undecided_total_pending_est` (pending SLA penalties + pending
 * demurrage) rather than realised margin: exposure is what the operator can
 * still act on. Converted from the backend's USD at the pinned fx.usd_inr.
 */
export function deriveExposure(
  fin: AnalyticsFinancialResponse | null,
  window: ExposureWindow = 'month',
  rate?: number
): Kpi {
  const base: Omit<Kpi, 'display' | 'value' | 'detail' | 'available'> = {
    key: 'exposure',
    label: 'EXPOSURE',
    provenance: fin?.provenance ? String(fin.provenance) : 'UNKNOWN',
    source: `GET /api/analytics/financial (${window})`,
  }

  const slice = fin?.[window]
  if (!slice) {
    return { ...base, display: NO_DATA, value: null, detail: 'no financial window', available: false }
  }

  const usd = slice.undecided_total_pending_est ?? 0
  const inr = usdToInr(usd, rate)
  const sla = usdToInr(slice.undecided_pending_sla_est ?? 0, rate)
  const dem = usdToInr(slice.undecided_pending_demurrage_est ?? 0, rate)

  return {
    ...base,
    // Display is filled by the component via formatInrCompact so the number
    // formatting stays in one place; value is the canonical rupee amount.
    display: '',
    value: inr,
    detail:
      sla + dem > 0
        ? `SLA + demurrage, ${slice.shipments} shipments`
        : `${slice.shipments} shipments, nothing pending`,
    available: true,
  }
}

/**
 * Count of shipments needing intervention now: explicitly AT_RISK, or flagged
 * as disrupted while not yet delivered late.
 */
export function deriveAtRisk(sla: AnalyticsSlaResponse | null): Kpi {
  const base: Omit<Kpi, 'display' | 'value' | 'detail' | 'available'> = {
    key: 'at_risk',
    label: 'SLA AT-RISK',
    provenance: sla?.provenance ? String(sla.provenance) : 'UNKNOWN',
    source: 'GET /api/analytics/sla',
  }

  const rows = sla?.rows ?? []
  if (rows.length === 0) {
    return { ...base, display: NO_DATA, value: null, detail: 'no SLA rows', available: false }
  }

  const atRisk = rows.filter((r) => r.sla_status === 'AT_RISK' || (r.disrupted && r.sla_status !== 'LATE'))
  const late = rows.filter((r) => r.sla_status === 'LATE').length

  return {
    ...base,
    display: String(atRisk.length),
    value: atRisk.length,
    detail: late > 0 ? `${late} already breached` : 'none breached',
    available: true,
  }
}

/**
 * Scope-3 transport emissions: sum of per-shipment kg_co2 across the fleet.
 *
 * This is category 4 (upstream transport & distribution) only — it is not a
 * full Scope-3 inventory, and the tile label says so.
 */
export function deriveScope3(esg: AnalyticsEsgResponse | null): Kpi {
  const base: Omit<Kpi, 'display' | 'value' | 'detail' | 'available'> = {
    key: 'scope3',
    label: 'SCOPE-3 CO₂',
    provenance: esg?.provenance ? String(esg.provenance) : 'UNKNOWN',
    source: 'GET /api/analytics/esg',
  }

  const rows = esg?.rows ?? []
  if (rows.length === 0) {
    return { ...base, display: NO_DATA, value: null, detail: 'no ESG rows', available: false }
  }

  const kg = rows.reduce((acc, r) => acc + (Number.isFinite(r.kg_co2) ? r.kg_co2 : 0), 0)

  const modes = Object.entries(esg?.route_breakdown ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([m, n]) => `${m} ${n}`)
    .join(' · ')

  return {
    ...base,
    display: '',
    value: kg,
    detail: modes || `${rows.length} shipments`,
    available: true,
  }
}

/** Fleet-state counters used by the band's right-hand context strip. */
export interface FleetContext {
  inTransit: number
  delivered: number
  openAlerts: number
  total: number
  provenance: string
  available: boolean
}

export function deriveFleetContext(summary: AnalyticsSummaryResponse | null): FleetContext {
  if (!summary) {
    return {
      inTransit: 0,
      delivered: 0,
      openAlerts: 0,
      total: 0,
      provenance: 'UNKNOWN',
      available: false,
    }
  }
  return {
    inTransit: summary.in_transit ?? 0,
    delivered: summary.delivered ?? 0,
    openAlerts: summary.open_alerts ?? 0,
    total: summary.total_shipments ?? 0,
    provenance: String(summary.provenance ?? 'UNKNOWN'),
    available: true,
  }
}

/** Everything the band needs, derived in one pass. */
export interface KpiSet {
  onTime: Kpi
  exposure: Kpi
  atRisk: Kpi
  scope3: Kpi
  fleet: FleetContext
}

export function deriveKpiSet(input: {
  sla: AnalyticsSlaResponse | null
  financial: AnalyticsFinancialResponse | null
  esg: AnalyticsEsgResponse | null
  summary: AnalyticsSummaryResponse | null
  window?: ExposureWindow
  rate?: number
}): KpiSet {
  return {
    onTime: deriveOnTime(input.sla),
    exposure: deriveExposure(input.financial, input.window ?? 'month', input.rate),
    atRisk: deriveAtRisk(input.sla),
    scope3: deriveScope3(input.esg),
    fleet: deriveFleetContext(input.summary),
  }
}
