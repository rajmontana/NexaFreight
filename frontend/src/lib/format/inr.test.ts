import { describe, it, expect } from 'vitest'
import {
  DEFAULT_USD_INR,
  groupIndian,
  formatInr,
  formatInrCompact,
  formatUsdAsInr,
  formatCo2,
  formatPct,
  formatCount,
  usdToInr,
} from './inr'

describe('groupIndian', () => {
  it('groups with the Indian digit system', () => {
    expect(groupIndian(1234567)).toBe('12,34,567')
    expect(groupIndian(100000)).toBe('1,00,000')
    expect(groupIndian(1000)).toBe('1,000')
  })

  it('leaves short numbers alone', () => {
    expect(groupIndian(999)).toBe('999')
    expect(groupIndian(0)).toBe('0')
  })

  it('handles negatives', () => {
    expect(groupIndian(-1234567)).toBe('-12,34,567')
  })
})

describe('formatInrCompact', () => {
  it('uses crore above 1e7', () => {
    expect(formatInrCompact(14_280_000)).toBe('₹1.43 Cr')
  })

  it('uses lakh above 1e5', () => {
    expect(formatInrCompact(1_240_000)).toBe('₹12.40 L')
  })

  it('uses grouped rupees below a lakh', () => {
    expect(formatInrCompact(8200)).toBe('₹8,200')
  })

  it('renders an em dash for non-finite input', () => {
    expect(formatInrCompact(Number.NaN)).toBe('—')
  })

  it('keeps the sign on negative exposure', () => {
    expect(formatInrCompact(-14_280_000)).toBe('-₹1.43 Cr')
  })
})

describe('formatInr', () => {
  it('renders full precision with Indian grouping', () => {
    expect(formatInr(1428000)).toBe('₹14,28,000')
  })
})

describe('usdToInr / formatUsdAsInr', () => {
  it('converts at the pinned backend rate by default', () => {
    expect(usdToInr(100)).toBeCloseTo(100 * DEFAULT_USD_INR)
  })

  it('accepts an explicit rate', () => {
    expect(usdToInr(100, 100)).toBe(10_000)
  })

  it('formats a USD figure straight to compact rupees', () => {
    expect(formatUsdAsInr(1000, 100)).toBe('₹1.00 L')
  })

  it('treats non-finite USD as zero rather than NaN', () => {
    expect(usdToInr(Number.NaN)).toBe(0)
  })
})

describe('formatCo2', () => {
  it('uses kilotonnes above 1e6 kg', () => {
    expect(formatCo2(2_500_000)).toBe('2.50 kt')
  })

  it('uses tonnes above 1000 kg', () => {
    expect(formatCo2(9200.5)).toBe('9.2 t')
  })

  it('uses kilograms below a tonne', () => {
    expect(formatCo2(640)).toBe('640 kg')
  })
})

describe('formatPct / formatCount', () => {
  it('formats a percentage to one decimal', () => {
    expect(formatPct(92.456)).toBe('92.5%')
  })

  it('renders an em dash for null', () => {
    expect(formatPct(null)).toBe('—')
    expect(formatPct(undefined)).toBe('—')
  })

  it('groups counts', () => {
    expect(formatCount(1234567)).toBe('12,34,567')
  })
})
