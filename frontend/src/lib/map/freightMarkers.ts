/**
 * Chartroom freight markers — scaled, high-contrast silhouettes with solid
 * light background disc for sharp readability across paper and vector maps.
 *
 * Design rules:
 *   · Consistent ink/cobalt palette for operational precision.
 *   · Fill is --cobalt (#2547C8), outline is --ink (#16181D).
 *   · Solid white/paper circular disc behind silhouette ensures high light-contrast against map tiles.
 *   · Interior cut-outs in --paper (#FFFFFF) provide crisp visual structure.
 *   · SLA ring treatment:
 *       - nominal: 1px ink ring
 *       - at_risk: dashed ink ring
 *       - breached: 2px solid ink ring
 *   · Scaled to 32px for clear readability.
 */

/** Chartroom tokens, mirrored from globals.css :root. */
export const CHARTROOM = {
  paper: '#F6F7F4',
  ink: '#16181D',
  cobalt: '#2547C8',
  cobaltPressed: '#1D3AA6',
  hairline: '#D4D5D0',
} as const;

/** Corridor-matched high-contrast palette for multimodal freight assets. */
export const ASSET_PALETTE = {
  VESSEL: {
    fill: '#1D4ED8', // Maritime Cobalt (matches sea lanes #2547C8)
    ring: '#1E3A8A',
  },
  TRUCK: {
    fill: '#059669', // Highway Emerald (matches road corridors #027A48)
    ring: '#064E3B',
  },
  FLIGHT: {
    fill: '#D97706', // Aviation Gold / Amber (matches air corridors #D97706)
    ring: '#78350F',
  },
  TRAIN: {
    fill: '#475569', // Freight Rail Slate (matches rail tracks #0F172A)
    ring: '#0F172A',
  },
} as const;

export type FreightAsset = 'VESSEL' | 'TRUCK' | 'FLIGHT' | 'TRAIN';

/** Ring treatment communicates SLA state. */
export type MarkerState = 'nominal' | 'at_risk' | 'breached';

function ringFor(state: MarkerState): { stroke: string; dash: string; width: number } {
  switch (state) {
    case 'at_risk':
      return { stroke: CHARTROOM.ink, dash: '2 1.5', width: 1.25 };
    case 'breached':
      return { stroke: CHARTROOM.ink, dash: 'none', width: 2 };
    default:
      return { stroke: CHARTROOM.ink, dash: 'none', width: 1 };
  }
}

/**
 * Bold, high-contrast silhouettes on a 24×24 grid.
 * Solid cobalt body with white cutouts for sharp recognition.
 * All silhouettes are dimensioned to sit comfortably inside the 10.6px radius
 * disc with generous breathing room, preventing any ring collision or rotation clipping.
 */
function bodyFor(asset: FreightAsset): string {
  const fill = CHARTROOM.cobalt;
  const cut = CHARTROOM.paper;

  switch (asset) {
    case 'VESSEL':
      // Distinct container cargo ship: pointed flared bow cutwater, 3 tiers of container cargo bays, aft navigation bridge with wings.
      return `
        <path d="M12 3.6 C11.2 5.0 8.4 7.2 8.4 9.0 V17.4 C8.4 18.8 9.4 19.6 12 19.6 C14.6 19.6 15.6 18.8 15.6 17.4 V9.0 C15.6 7.2 12.8 5.0 12 3.6 Z" fill="${fill}"/>
        <polygon points="12,4.4 11.2,6.2 12.8,6.2" fill="${cut}"/>
        <rect x="9.5" y="7.4" width="2.2" height="2.8" rx="0.3" fill="${cut}"/>
        <rect x="12.3" y="7.4" width="2.2" height="2.8" rx="0.3" fill="${cut}"/>
        <rect x="9.5" y="10.8" width="2.2" height="2.8" rx="0.3" fill="${cut}"/>
        <rect x="12.3" y="10.8" width="2.2" height="2.8" rx="0.3" fill="${cut}"/>
        <rect x="9.5" y="14.2" width="2.2" height="2.6" rx="0.3" fill="${cut}"/>
        <rect x="12.3" y="14.2" width="2.2" height="2.6" rx="0.3" fill="${cut}"/>
        <rect x="9.2" y="17.4" width="5.6" height="1.4" rx="0.3" fill="${cut}"/>
        <rect x="11.2" y="17.8" width="1.6" height="0.8" rx="0.2" fill="${fill}"/>
      `;
    case 'TRUCK':
      // Class-8 heavy cargo semi-truck: tractor cab, aero mirrors, 53ft trailer with container ribs.
      return `
        <path d="M8.2 4.2 C8.2 3.8 8.7 3.5 9.4 3.5 H14.6 C15.3 3.5 15.8 3.8 15.8 4.2 V8.2 H8.2 Z" fill="${fill}"/>
        <rect x="9.3" y="4.5" width="5.4" height="1.8" rx="0.3" fill="${cut}"/>
        <line x1="7.2" y1="5.8" x2="8.2" y2="5.8" stroke="${fill}" stroke-width="1.0" stroke-linecap="round"/>
        <line x1="15.8" y1="5.8" x2="16.8" y2="5.8" stroke="${fill}" stroke-width="1.0" stroke-linecap="round"/>
        <rect x="7.8" y="8.8" width="8.4" height="10.4" rx="0.8" fill="${fill}"/>
        <line x1="8.8" y1="11.2" x2="15.2" y2="11.2" stroke="${cut}" stroke-width="0.8"/>
        <line x1="8.8" y1="13.8" x2="15.2" y2="13.8" stroke="${cut}" stroke-width="0.8"/>
        <line x1="8.8" y1="16.4" x2="15.2" y2="16.4" stroke="${cut}" stroke-width="0.8"/>
      `;
    case 'TRAIN':
      // Locomotive engine and intermodal container consist on scaled rail tracks.
      return `
        <rect x="7.8" y="4.2" width="8.4" height="11.2" rx="1.2" fill="${fill}"/>
        <path d="M9.0 5.2 H15.0 V6.8 C15.0 7.2 14.6 7.5 14.2 7.5 H9.8 C9.4 7.5 9.0 7.2 9.0 6.8 Z" fill="${cut}"/>
        <circle cx="10.2" cy="6.2" r="0.5" fill="${fill}"/>
        <circle cx="13.8" cy="6.2" r="0.5" fill="${fill}"/>
        <rect x="8.8" y="8.6" width="6.4" height="2.4" rx="0.3" fill="${cut}"/>
        <line x1="10.4" y1="8.6" x2="10.4" y2="11.0" stroke="${fill}" stroke-width="0.6"/>
        <line x1="12.0" y1="8.6" x2="12.0" y2="11.0" stroke="${fill}" stroke-width="0.6"/>
        <line x1="13.6" y1="8.6" x2="13.6" y2="11.0" stroke="${fill}" stroke-width="0.6"/>
        <rect x="8.8" y="12.0" width="6.4" height="2.2" rx="0.3" fill="${cut}"/>
        <path d="M6.2 17.2 H17.8" stroke="${fill}" stroke-width="1.3" stroke-linecap="round"/>
        <path d="M6.2 19.4 H17.8" stroke="${fill}" stroke-width="1.3" stroke-linecap="round"/>
        <line x1="8.0" y1="16.5" x2="8.0" y2="20.1" stroke="${cut}" stroke-width="0.8"/>
        <line x1="10.7" y1="16.5" x2="10.7" y2="20.1" stroke="${cut}" stroke-width="0.8"/>
        <line x1="13.3" y1="16.5" x2="13.3" y2="20.1" stroke="${cut}" stroke-width="0.8"/>
        <line x1="16.0" y1="16.5" x2="16.0" y2="20.1" stroke="${cut}" stroke-width="0.8"/>
      `;
    case 'FLIGHT':
    default:
      // High-aspect swept-wing widebody cargo freighter with twin turbofan engines, safely scaled to avoid clipping.
      return `
        <path d="M12 3.8 C11.3 3.8 10.8 4.6 10.8 5.6 V9.6 L4.6 13.8 V15.2 L10.8 12.8 V17.4 L8.6 19.0 V20.2 L12 19.5 L15.4 20.2 V19.0 L13.2 17.4 V12.8 L19.4 15.2 V13.8 L13.2 9.6 V5.6 C13.2 4.6 12.7 3.8 12 3.8 Z" fill="${fill}"/>
        <rect x="7.8" y="11.6" width="1.4" height="2.6" rx="0.5" fill="${cut}"/>
        <rect x="14.8" y="11.6" width="1.4" height="2.6" rx="0.5" fill="${cut}"/>
        <polygon points="12,4.8 11.4,6.4 12.6,6.4" fill="${cut}"/>
      `;
  }
}

/**
 * Full marker HTML for a moving freight asset.
 *
 * @param asset    mode silhouette to draw
 * @param heading  degrees clockwise from north; the marker rotates to match
 * @param state    SLA treatment applied to the hairline ring
 * @param size     outer box in px (default 32)
 */
export function freightMarkerHtml(
  asset: FreightAsset,
  heading = 0,
  state: MarkerState = 'nominal',
  size = 26
): string {
  const ring = ringFor(state);
  const rot = Number.isFinite(heading) ? heading : 0;
  const dashAttr = ring.dash === 'none' ? '' : ` stroke-dasharray="${ring.dash}"`;

  return (
    `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;pointer-events:none;">` +
      `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="transform:rotate(${rot}deg);transform-origin:50% 50%;overflow:visible;">` +
        `<circle cx="12" cy="12" r="10.6" fill="${CHARTROOM.paper}" stroke="${ring.stroke}" stroke-width="${ring.width}"${dashAttr}/>` +
        bodyFor(asset) +
      `</svg>` +
    `</div>`
  );
}

/**
 * Static node marker (port / warehouse / airport): a hairline ink square with
 * a cobalt core. Deliberately geometric so it never competes with a vessel.
 */
export function freightNodeHtml(kind: 'PORT' | 'WAREHOUSE' | 'AIRPORT', size = 16): string {
  const s = size;
  const core = kind === 'PORT' ? CHARTROOM.cobalt : kind === 'AIRPORT' ? CHARTROOM.cobaltPressed : CHARTROOM.ink;
  const shape =
    kind === 'WAREHOUSE'
      ? `<rect x="3" y="3" width="10" height="10" fill="${core}"/>`
      : kind === 'AIRPORT'
        ? `<path d="M8 2.6 L13.4 13.4 H2.6 Z" fill="${core}"/>`
        : `<circle cx="8" cy="8" r="4.6" fill="${core}"/>`;

  return (
    `<div style="width:${s}px;height:${s}px;pointer-events:none;">` +
      `<svg width="${s}" height="${s}" viewBox="0 0 16 16">` +
        `<rect x="0.5" y="0.5" width="15" height="15" fill="${CHARTROOM.paper}" stroke="${CHARTROOM.hairline}" stroke-width="1"/>` +
        shape +
      `</svg>` +
    `</div>`
  );
}

/**
 * Paint spec for maplibre circle layers that used to glow.
 * Flat cobalt, hairline ink stroke, constant opacity — no `circle-blur`.
 */
export function flatCirclePaint(opts?: {
  radius?: number;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
}): Record<string, unknown> {
  return {
    'circle-radius': opts?.radius ?? 4,
    'circle-color': opts?.color ?? CHARTROOM.cobalt,
    'circle-opacity': 1,
    'circle-stroke-width': opts?.strokeWidth ?? 1,
    'circle-stroke-color': opts?.strokeColor ?? CHARTROOM.ink,
    'circle-stroke-opacity': 0.55,
  };
}
