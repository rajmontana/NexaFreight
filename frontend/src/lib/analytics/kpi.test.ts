import { describe, it, expect } from 'vitest'
import {
  deriveOnTime,
  deriveExposure,
  deriveAtRisk,
  deriveScope3,
  deriveFleetContext,
  deriveKpiSet,
} from './kpi'
import type {
  AnalyticsEsgResponse,
  AnalyticsFinancialResponse,
  AnalyticsSlaResponse,
  AnalyticsSummaryResponse,
} from '@/lib/nexafreight/types'

const slaFixture: AnalyticsSlaResponse = {
  rows: [
    { shipment_id: 's1', sla_status: 'ON_TIME', days_to_deadline: 9, disrupted: false, delay_days: null },
    { shipment_id: 's2', sla_status: 'ON_TIME', days_to_deadline: 4, disrupted: false, delay_days: null },
    { shipment_id: 's3', sla_status: 'AT_RISK', days_to_deadline: 1, disrupted: true, delay_days: null },
    { shipment_id: 's4', sla_status: 'LATE', days_to_deadline: -2, disrupted: true, delay_days: 2 },
  ],
  provenance: 'DERIVED',
}

const finFixture: AnalyticsFinancialResponse = {
  day: {
    period: 'day', shipments: 2, total_revenue: 1000, total_shipping_cost: 200,
    decided_margin: 100, undecided_revenue: 500,
    undecided_pending_sla_est: 10, undecided_pending_demurrage_est: 5,
    undecided_total_pending_est: 15,
  },
  week: {
    period: 'week', shipments: 6, total_revenue: 4000, total_shipping_cost: 900,
    decided_margin: 400, undecided_revenue: 1500,
    undecided_pending_sla_est: 60, undecided_pending_demurrage_est: 40,
    undecided_total_pending_est: 100,
  },
  month: {
    period: 'month', shipments: 20, total_revenue: 20000, total_shipping_cost: 5000,
    decided_margin: 2000, undecided_revenue: 8000,
    undecided_pending_sla_est: 600, undecided_pending_demurrage_est: 400,
    undecided_total_pending_est: 1000,
  },
  rows: [],
  provenance: 'DERIVED',
}

const esgFixture: AnalyticsEsgResponse = {
  rows: [
    { shipment_id: 's1', mode: 'SEA', kg_co2: 1200.5, kg_co2e_per_container: 600, vs_air_co2_saving_pct: 92, vs_air_freight_delta_pct: -40 },
    { shipment_id: 's2', mode: 'AIR', kg_co2: 8000, kg_co2e_per_container: 8000, vs_air_co2_saving_pct: null, vs_air_freight_delta_pct: null },
  ],
  route_breakdown: { SEA: 1, AIR: 1 },
  provenance: 'DERIVED',
}

const summaryFixture: AnalyticsSummaryResponse = {
  total_shipments: 20,
  in_transit: 7,
  delivered: 11,
  delayed: 2,
  sla_breach_count: 1,
  open_alerts: 3,
  summary_by_status: { IN_TRANSIT: 7, DELIVERED: 11 },
  shipments: [],
  provenance: 'DERIVED',
}

describe('deriveOnTime', () => {
  it('computes on-time over every shipment carrying an SLA verdict', () => {
    const k = deriveOnTime(slaFixture)
    expect(k.available).toBe(true)
    expect(k.value).toBeCloseTo(50) // 2 ON_TIME of 4
    expect(k.display).toBe('50.0%')
    expect(k.detail).toBe('2 of 4 shipments')
  })

  it('keeps AT_RISK in the denominator so the headline is not inflated', () => {
    const k = deriveOnTime({
      rows: [
        { shipment_id: 'a', sla_status: 'ON_TIME', days_to_deadline: 3, disrupted: false, delay_days: null },
        { shipment_id: 'b', sla_status: 'AT_RISK', days_to_deadline: 1, disrupted: false, delay_days: null },
      ],
      provenance: 'DERIVED',
    })
    expect(k.value).toBeCloseTo(50)
  })

  it('reports unavailable rather than 0% on an empty payload', () => {
    const k = deriveOnTime({ rows: [], provenance: 'DERIVED' })
    expect(k.available).toBe(false)
    expect(k.display).toBe('—')
    expect(k.value).toBeNull()
  })

  it('reports unavailable on a null payload', () => {
    expect(deriveOnTime(null).available).toBe(false)
    expect(deriveOnTime(null).provenance).toBe('UNKNOWN')
  })
})

describe('deriveExposure', () => {
  it('converts the pending estimate to rupees at the supplied rate', () => {
    const k = deriveExposure(finFixture, 'month', 100)
    expect(k.available).toBe(true)
    expect(k.value).toBeCloseTo(100_000) // 1000 USD * 100
  })

  it('honours the requested window', () => {
    expect(deriveExposure(finFixture, 'day', 100).value).toBeCloseTo(1_500)
    expect(deriveExposure(finFixture, 'week', 100).value).toBeCloseTo(10_000)
  })

  it('carries the endpoint provenance through', () => {
    expect(deriveExposure(finFixture, 'month', 100).provenance).toBe('DERIVED')
  })

  it('reports unavailable on a null payload', () => {
    expect(deriveExposure(null).available).toBe(false)
  })
})

describe('deriveAtRisk', () => {
  it('counts AT_RISK plus disrupted-not-yet-late', () => {
    const k = deriveAtRisk(slaFixture)
    expect(k.value).toBe(1) // s3 only; s4 is disrupted but already LATE
    expect(k.detail).toBe('1 already breached')
  })

  it('does not double count a row that is both AT_RISK and disrupted', () => {
    const k = deriveAtRisk({
      rows: [{ shipment_id: 'x', sla_status: 'AT_RISK', days_to_deadline: 1, disrupted: true, delay_days: null }],
      provenance: 'DERIVED',
    })
    expect(k.value).toBe(1)
  })

  it('reports unavailable on an empty payload', () => {
    expect(deriveAtRisk({ rows: [], provenance: 'DERIVED' }).available).toBe(false)
  })
})

describe('deriveScope3', () => {
  it('sums kg_co2 across the fleet', () => {
    const k = deriveScope3(esgFixture)
    expect(k.value).toBeCloseTo(9200.5)
    expect(k.available).toBe(true)
  })

  it('summarises the dominant modes in the detail line', () => {
    expect(deriveScope3(esgFixture).detail).toContain('SEA')
  })

  it('ignores non-finite rows instead of producing NaN', () => {
    const k = deriveScope3({
      rows: [
        { shipment_id: 'a', mode: 'SEA', kg_co2: Number.NaN, kg_co2e_per_container: 0, vs_air_co2_saving_pct: null, vs_air_freight_delta_pct: null },
        { shipment_id: 'b', mode: 'SEA', kg_co2: 10, kg_co2e_per_container: 0, vs_air_co2_saving_pct: null, vs_air_freight_delta_pct: null },
      ],
      route_breakdown: {},
      provenance: 'DERIVED',
    })
    expect(k.value).toBe(10)
  })

  it('reports unavailable on a null payload', () => {
    expect(deriveScope3(null).available).toBe(false)
  })
})

describe('deriveFleetContext', () => {
  it('reads the fleet counters straight off the summary', () => {
    const f = deriveFleetContext(summaryFixture)
    expect(f.inTransit).toBe(7)
    expect(f.openAlerts).toBe(3)
    expect(f.available).toBe(true)
  })

  it('degrades to unavailable with zeros, not fabricated counts', () => {
    const f = deriveFleetContext(null)
    expect(f.available).toBe(false)
    expect(f.total).toBe(0)
  })
})

describe('deriveKpiSet', () => {
  it('derives all four headline figures in one pass', () => {
    const set = deriveKpiSet({
      sla: slaFixture,
      financial: finFixture,
      esg: esgFixture,
      summary: summaryFixture,
      rate: 100,
    })
    expect(set.onTime.value).toBeCloseTo(50)
    expect(set.exposure.value).toBeCloseTo(100_000)
    expect(set.atRisk.value).toBe(1)
    expect(set.scope3.value).toBeCloseTo(9200.5)
    expect(set.fleet.inTransit).toBe(7)
  })

  it('stays fully unavailable when the backend is unreachable', () => {
    const set = deriveKpiSet({ sla: null, financial: null, esg: null, summary: null })
    expect(set.onTime.available).toBe(false)
    expect(set.exposure.available).toBe(false)
    expect(set.atRisk.available).toBe(false)
    expect(set.scope3.available).toBe(false)
    expect(set.fleet.available).toBe(false)
  })
})
