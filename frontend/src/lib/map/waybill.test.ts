import { describe, it, expect, afterEach } from 'vitest'
import {
  esc,
  provenanceChip,
  waybillCard,
  waybillAction,
  waybillLoading,
  inrRow,
  setWaybillRate,
} from './waybill'
import { freightMarkerHtml, freightNodeHtml, flatCirclePaint, CHARTROOM } from './freightMarkers'

afterEach(() => setWaybillRate(null))

describe('esc', () => {
  it('neutralises HTML metacharacters', () => {
    expect(esc('<script>"x"&\'y\'</script>')).toBe(
      '&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;'
    )
  })
  it('renders null/undefined as empty', () => {
    expect(esc(null)).toBe('')
    expect(esc(undefined)).toBe('')
  })
})

describe('provenanceChip', () => {
  it('prints the raw backend token rather than collapsing it', () => {
    expect(provenanceChip('DERIVED')).toContain('DERIVED')
    expect(provenanceChip('CALIBRATED')).toContain('CALIBRATED')
    expect(provenanceChip('REPLAYED')).toContain('REPLAYED')
  })

  it('does not relabel DERIVED as REPLAY', () => {
    expect(provenanceChip('DERIVED')).not.toContain('REPLAY<')
  })

  it('prints UNKNOWN for missing provenance instead of a flattering default', () => {
    expect(provenanceChip(undefined)).toContain('UNKNOWN')
    expect(provenanceChip('')).toContain('UNKNOWN')
    expect(provenanceChip(null)).toContain('UNKNOWN')
  })

  it('marks measured sources with a solid cobalt rule', () => {
    expect(provenanceChip('REAL')).toContain(`1px solid ${CHARTROOM.cobalt}`)
  })

  it('marks synthetic sources with a dashed rule', () => {
    expect(provenanceChip('MOCK')).toContain('dashed')
    expect(provenanceChip('SIMULATED')).toContain('dashed')
  })

  it('uppercases and trims free-form input', () => {
    expect(provenanceChip('  derived ')).toContain('DERIVED')
  })
})

describe('waybillCard', () => {
  const card = waybillCard({
    kind: 'Maritime · Vessel',
    reference: 'NF-8A2C91F0',
    provenance: 'DERIVED',
    rows: [
      { label: 'lane', value: 'CNSHA → USLAX' },
      { label: 'exposure', value: '₹1.43 Cr', emphasis: true },
    ],
    footer: 'Route is a planner recommendation.',
  })

  it('renders on paper, not a dark translucent panel', () => {
    expect(card).toContain(CHARTROOM.paper)
    expect(card).not.toContain('backdrop-filter')
    expect(card).not.toContain('rgba(12,14,26')
  })

  it('uses a 2px corner, not the old 10px radius', () => {
    expect(card).toContain('border-radius:2px')
    expect(card).not.toContain('border-radius:10px')
  })

  it('sets a mono type stack', () => {
    expect(card).toContain('IBM Plex Mono')
  })

  it('carries a data-waybill hook for the CSS popup override', () => {
    expect(card).toContain('data-waybill')
  })

  it('prints the reference and the provenance chip', () => {
    expect(card).toContain('NF-8A2C91F0')
    expect(card).toContain('DERIVED')
  })

  it('escapes row content', () => {
    const evil = waybillCard({
      kind: 'K', reference: 'R', provenance: 'REAL',
      rows: [{ label: '<b>l</b>', value: '<img src=x onerror=1>' }],
    })
    expect(evil).not.toContain('<img')
    expect(evil).toContain('&lt;img')
  })

  it('omits the chip entirely when provenance is undefined', () => {
    const c = waybillCard({ kind: 'K', reference: 'R', provenance: undefined, rows: [] })
    expect(c).not.toContain('UNKNOWN')
  })
})

describe('inrRow', () => {
  it('converts USD to rupees at the pinned rate', () => {
    setWaybillRate(100)
    expect(inrRow('exposure', 1000).value).toBe('₹1.00 L')
  })
  it('renders an em dash for missing money', () => {
    expect(inrRow('exposure', null).value).toBe('—')
    expect(inrRow('exposure', undefined).value).toBe('—')
  })
})

describe('waybillAction / waybillLoading', () => {
  it('escapes the href', () => {
    expect(waybillAction('open', 'https://x/?a=1&b=2')).toContain('&amp;b=2')
  })
  it('keeps the paper frame while loading', () => {
    const l = waybillLoading('MARITIME', 'NF-1')
    expect(l).toContain('data-waybill')
    expect(l).toContain('retrieving')
  })
})

describe('freightMarkerHtml', () => {
  it('emits no glow, blur or drop-shadow', () => {
    for (const a of ['VESSEL', 'TRUCK', 'FLIGHT', 'TRAIN'] as const) {
      const m = freightMarkerHtml(a)
      expect(m).not.toContain('drop-shadow')
      expect(m).not.toContain('blur')
      expect(m.toLowerCase()).not.toContain('glow')
    }
  })

  it('fills every mode with cobalt rather than a neon hue', () => {
    for (const a of ['VESSEL', 'TRUCK', 'FLIGHT', 'TRAIN'] as const) {
      expect(freightMarkerHtml(a)).toContain(CHARTROOM.cobalt)
    }
    // the old neon palette is gone
    const all = (['VESSEL', 'TRUCK', 'FLIGHT', 'TRAIN'] as const).map((a) => freightMarkerHtml(a)).join('')
    expect(all).not.toContain('#00E676')
    expect(all).not.toContain('#a855f7')
    expect(all).not.toContain('#f97316')
    expect(all).not.toContain('#3b82f6')
  })

  it('draws a hairline ink ring on every marker', () => {
    expect(freightMarkerHtml('VESSEL')).toContain('<circle')
    expect(freightMarkerHtml('VESSEL')).toContain(CHARTROOM.ink)
  })

  it('rotates to the supplied heading', () => {
    expect(freightMarkerHtml('VESSEL', 137)).toContain('rotate(137deg)')
  })

  it('falls back to 0deg for a non-finite heading', () => {
    expect(freightMarkerHtml('VESSEL', Number.NaN)).toContain('rotate(0deg)')
  })

  it('differentiates SLA state by ring treatment, not colour', () => {
    expect(freightMarkerHtml('VESSEL', 0, 'at_risk')).toContain('stroke-dasharray')
    expect(freightMarkerHtml('VESSEL', 0, 'breached')).toContain('stroke-width="2"')
  })
})

describe('freightNodeHtml / flatCirclePaint', () => {
  it('draws nodes as hairline paper tiles', () => {
    expect(freightNodeHtml('PORT')).toContain(CHARTROOM.hairline)
    expect(freightNodeHtml('WAREHOUSE')).toContain('<rect')
    expect(freightNodeHtml('AIRPORT')).toContain('<path')
  })

  it('produces circle paint with no blur', () => {
    const p = flatCirclePaint()
    expect(p).not.toHaveProperty('circle-blur')
    expect(p['circle-color']).toBe(CHARTROOM.cobalt)
    expect(p['circle-opacity']).toBe(1)
  })
})
