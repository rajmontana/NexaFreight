/**
 * Indian-currency formatting for the Chartroom surfaces.
 *
 * The backend reports money in USD (`revenue_usd`, `undecided_total_pending_est`,
 * …). The control tower presents money in ₹ using the same FX parameter the
 * backend prices with (`fx.usd_inr`, pinned at 95.8 by OPS-FIX-1).
 *
 * Every figure rendered through here is a CONVERTED value, not a native-INR
 * measurement — callers should pair it with a provenance chip so the operator
 * can see that the rupee number is derived from a USD base at a pinned rate.
 */

/** Pinned USD→INR rate. Mirrors backend `core/params.py: fx.usd_inr = 95.8`. */
export const DEFAULT_USD_INR = 95.8

/**
 * Resolve the FX rate. Reads NEXT_PUBLIC_USD_INR when present so a demo can be
 * re-pinned without a rebuild; otherwise falls back to the backend default.
 */
export function usdInrRate(): number {
  const raw = process.env.NEXT_PUBLIC_USD_INR
  if (raw) {
    const n = Number(raw)
    if (Number.isFinite(n) && n > 0) return n
  }
  return DEFAULT_USD_INR
}

/** Convert a USD amount to INR at the pinned rate. */
export function usdToInr(usd: number, rate: number = usdInrRate()): number {
  if (!Number.isFinite(usd)) return 0
  return usd * rate
}

/**
 * Group an integer with the Indian digit system (last 3, then pairs):
 *   1234567 -> "12,34,567"
 */
export function groupIndian(value: number): string {
  const neg = value < 0
  const whole = Math.abs(Math.trunc(value)).toString()

  let out: string
  if (whole.length <= 3) {
    out = whole
  } else {
    const last3 = whole.slice(-3)
    const rest = whole.slice(0, -3)
    out = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3
  }
  return neg ? '-' + out : out
}

/**
 * Compact rupee display for KPI tiles: ₹1.43 Cr / ₹12.4 L / ₹8,200.
 * Crore at >= 1e7, lakh at >= 1e5, else grouped rupees.
 */
export function formatInrCompact(inr: number): string {
  if (!Number.isFinite(inr)) return '—'
  const abs = Math.abs(inr)
  const sign = inr < 0 ? '-' : ''

  if (abs >= 1e7) return `${sign}₹${(abs / 1e7).toFixed(2)} Cr`
  if (abs >= 1e5) return `${sign}₹${(abs / 1e5).toFixed(2)} L`
  if (abs >= 1000) return `${sign}₹${groupIndian(abs)}`
  return `${sign}₹${abs.toFixed(0)}`
}

/** Full precision rupee display for ledger rows: ₹14,28,000. */
export function formatInr(inr: number): string {
  if (!Number.isFinite(inr)) return '—'
  return `₹${groupIndian(Math.round(inr))}`
}

/** USD amount rendered directly as compact rupees. */
export function formatUsdAsInr(usd: number, rate: number = usdInrRate()): string {
  return formatInrCompact(usdToInr(usd, rate))
}

/** Percentage with one decimal, or an em dash when undefined. */
export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${value.toFixed(digits)}%`
}

/**
 * CO2 mass for the Scope-3 tile. Backend reports kg; operators read tonnes
 * once the number gets large.
 */
export function formatCo2(kg: number): string {
  if (!Number.isFinite(kg)) return '—'
  const abs = Math.abs(kg)
  if (abs >= 1_000_000) return `${(kg / 1_000_000).toFixed(2)} kt`
  if (abs >= 1000) return `${(kg / 1000).toFixed(1)} t`
  return `${kg.toFixed(0)} kg`
}

/** Plain integer with Indian grouping, for counts. */
export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return groupIndian(Math.round(n))
}
