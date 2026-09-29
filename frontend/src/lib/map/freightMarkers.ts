/**
 * Chartroom freight markers — flat cobalt, hairline ink ring, no glow.
 *
 * Replaces the neon drop-shadow markers inherited from the template fork
 * (blue/green/purple/orange fills with `filter: drop-shadow(0 0 6px …)`).
 *
 * Design rules, applied uniformly:
 *   · One ink palette. Mode is carried by SHAPE, never by a neon hue.
 *   · Fill is --cobalt. Outline is a 1px hairline in --ink at 55% alpha.
 *   · No drop-shadow, no blur, no glow, no opacity pulsing.
 *   · Interior detail is cut out in --paper so the silhouette reads at 16px.
 *
 * Markers are DOM elements handed to maplibre, so these builders return HTML
 * strings. They are pure and unit tested.
 */

/** Chartroom tokens, mirrored from globals.css :root. */
export const CHARTROOM = {
  paper: '#F6F7F4',
  ink: '#16181D',
  cobalt: '#2547C8',
  cobaltPressed: '#1D3AA6',
  hairline: '#D4D5D0',
} as const

export type FreightAsset = 'VESSEL' | 'TRUCK' | 'FLIGHT' | 'TRAIN'

/** Ring treatment communicates SLA state without introducing a new colour. */
export type MarkerState = 'nominal' | 'at_risk' | 'breached'

function ringFor(state: MarkerState): { stroke: string; dash: string; width: number } {
  switch (state) {
    case 'at_risk':
      return { stroke: CHARTROOM.ink, dash: '2 1.5', width: 1.25 }
    case 'breached':
      return { stroke: CHARTROOM.ink, dash: 'none', width: 2 }
    default:
      return { stroke: `${CHARTROOM.ink}8C`, dash: 'none', width: 1 }
  }
}

/**
 * Mode silhouettes on a 24×24 grid. Each path is a solid cobalt body; the
 * `paper` cut-outs give the shape internal structure at small sizes.
 */
function bodyFor(asset: FreightAsset): string {
  const fill = CHARTROOM.cobalt
  const cut = CHARTROOM.paper

  switch (asset) {
    case 'VESSEL':
      // Bow-up hull with a deck block — reads as a ship from directly above.
      return `
        <path d="M12 3 C9.6 7.6 8.2 13 8.2 18.2 C8.2 20 9.8 20.9 12 20.9 C14.2 20.9 15.8 20 15.8 18.2 C15.8 13 14.4 7.6 12 3 Z" fill="${fill}"/>
        <rect x="10.3" y="12.2" width="3.4" height="4.3" rx="0.4" fill="${cut}"/>
        <rect x="10.9" y="7.6" width="2.2" height="2.2" rx="0.3" fill="${cut}"/>
      `
    case 'TRUCK':
      // Tractor + box trailer, viewed from above.
      return `
        <rect x="7.4" y="2.8" width="9.2" height="5.2" rx="0.8" fill="${fill}"/>
        <rect x="8.8" y="4.1" width="6.4" height="2.2" rx="0.3" fill="${cut}"/>
        <rect x="6.6" y="9" width="10.8" height="12.2" rx="0.8" fill="${fill}"/>
        <path d="M8.4 12.2 H15.6 M8.4 15.2 H15.6 M8.4 18.2 H15.6" stroke="${cut}" stroke-width="0.9"/>
      `
    case 'TRAIN':
      // Locomotive with a rail beneath.
      return `
        <rect x="5.6" y="3.2" width="12.8" height="12.4" rx="1.6" fill="${fill}"/>
        <rect x="7.8" y="5.4" width="8.4" height="4.2" rx="0.4" fill="${cut}"/>
        <rect x="7.8" y="11.2" width="3.6" height="2.4" rx="0.3" fill="${cut}"/>
        <path d="M5.4 18.6 H18.6" stroke="${fill}" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M8 20.6 H16" stroke="${fill}" stroke-width="1.1" stroke-linecap="round"/>
      `
    case 'FLIGHT':
    default:
      // Swept-wing planform.
      return `
        <path d="M21 15.4v-1.7l-7.6-4.6V3.6c0-.8-.6-1.4-1.4-1.4s-1.4.6-1.4 1.4v5.5L3 13.7v1.7l7.6-2.3v5.1l-2 1.4v1.3l3.4-.9 3.4.9v-1.3l-2-1.4v-5.1L21 15.4z" fill="${fill}"/>
      `
  }
}

/**
 * Full marker HTML for a moving freight asset.
 *
 * @param asset  mode silhouette to draw
 * @param heading  degrees clockwise from north; the marker rotates to match
 * @param state  SLA treatment applied to the hairline ring
 * @param size  outer box in px (default 28)
 */
export function freightMarkerHtml(
  asset: FreightAsset,
  heading = 0,
  state: MarkerState = 'nominal',
  size = 28
): string {
  const ring = ringFor(state)
  const rot = Number.isFinite(heading) ? heading : 0
  const dashAttr = ring.dash === 'none' ? '' : ` stroke-dasharray="${ring.dash}"`

  return `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;pointer-events:none;">` +
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="transform:rotate(${rot}deg);transform-origin:50% 50%;">` +
      `<circle cx="12" cy="12" r="10.6" fill="none" stroke="${ring.stroke}" stroke-width="${ring.width}"${dashAttr}/>` +
      bodyFor(asset) +
    `</svg>` +
  `</div>`
}

/**
 * Static node marker (port / warehouse / airport): a hairline ink square with
 * a cobalt core. Deliberately geometric so it never competes with a vessel.
 */
export function freightNodeHtml(kind: 'PORT' | 'WAREHOUSE' | 'AIRPORT', size = 14): string {
  const s = size
  const core = kind === 'PORT' ? CHARTROOM.cobalt : kind === 'AIRPORT' ? CHARTROOM.cobaltPressed : CHARTROOM.ink
  const shape =
    kind === 'WAREHOUSE'
      ? `<rect x="3" y="3" width="10" height="10" fill="${core}"/>`
      : kind === 'AIRPORT'
        ? `<path d="M8 2.6 L13.4 13.4 H2.6 Z" fill="${core}"/>`
        : `<circle cx="8" cy="8" r="4.6" fill="${core}"/>`

  return `<div style="width:${s}px;height:${s}px;pointer-events:none;">` +
    `<svg width="${s}" height="${s}" viewBox="0 0 16 16">` +
      `<rect x="0.5" y="0.5" width="15" height="15" fill="${CHARTROOM.paper}" stroke="${CHARTROOM.hairline}" stroke-width="1"/>` +
      shape +
    `</svg>` +
  `</div>`
}

/**
 * Paint spec for maplibre circle layers that used to glow.
 * Flat cobalt, hairline ink stroke, constant opacity — no `circle-blur`.
 */
export function flatCirclePaint(opts?: {
  radius?: number
  color?: string
  strokeColor?: string
  strokeWidth?: number
}): Record<string, unknown> {
  return {
    'circle-radius': opts?.radius ?? 4,
    'circle-color': opts?.color ?? CHARTROOM.cobalt,
    'circle-opacity': 1,
    'circle-stroke-width': opts?.strokeWidth ?? 1,
    'circle-stroke-color': opts?.strokeColor ?? CHARTROOM.ink,
    'circle-stroke-opacity': 0.55,
  }
}
