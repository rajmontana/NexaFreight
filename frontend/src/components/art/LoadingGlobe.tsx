'use client';

/**
 * CHARTROOM LoadingGlobe — the brand spinner.
 * Stipple-continents orthographic globe; three great-circle arcs that draw
 * themselves, then carry a sweeping cobalt pulse; vessel + plane silhouettes.
 * Inline SVG only; ink + cobalt; honors prefers-reduced-motion.
 * Reference: design_concepts/nexafreight_art_loading.png
 */
import { landDots } from './landMask';

const CX = 180;
const CY = 182;
const R = 142;
const LON0 = -30; // centered on the Atlantic — the freight hemisphere

const INK = '#16181D';
const COBALT = '#2547C8';

interface LatLon {
  lat: number;
  lon: number;
}

function project({ lat, lon }: LatLon): { x: number; y: number; z: number } | null {
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;
  const rotR = ((lon - LON0) * Math.PI) / 180;
  const z = Math.cos(latR) * Math.cos(rotR);
  if (z <= 0.03) return null; // back hemisphere
  return {
    x: CX + R * Math.cos(latR) * Math.sin(rotR),
    y: CY - R * Math.sin(latR),
    z,
  };
}

// Precompute once at module scope (pure, deterministic — hydration-safe).
// Each 5 deg land cell renders 4 sub-dots (fixed offsets) for a denser stipple.
const SUB = [
  [-1.4, -1.2], [1.3, -1.4], [-1.2, 1.3], [1.4, 1.2],
] as const;
const DOTS = landDots()
  .flatMap((c) => SUB.map(([dlon, dlat]) => project({ lon: c.lon + dlon, lat: c.lat + dlat })))
  .filter((p): p is { x: number; y: number; z: number } => p !== null)
  .map((p) => ({ ...p, r: 1.0 + 0.9 * p.z, o: 0.28 + 0.42 * p.z }));

// Graticule (lat0 = 0): parallels = concentric circles, meridians = concentric ellipses
const PARALLELS = [-60, -30, 0, 30, 60].map(
  (lat) => R * Math.cos((lat * Math.PI) / 180)
);
const MERIDIANS = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map(
  (lon) => R * Math.abs(Math.sin((((lon - LON0) * Math.PI) / 180)))
);

// Great-circle arcs (decorative, hand-tuned inside the disc)
const ARCS = [
  'M 96 142 Q 168 78 252 118', // N Atlantic: NY → Rotterdam
  'M 128 258 Q 186 302 262 238', // S Atlantic: Santos → Cape Town
  'M 150 232 Q 234 262 296 196', // Gulf → Cape long haul
];

const WAYPOINTS: LatLon[][] = [];

export default function LoadingGlobe({
  caption = 'PLOTTING ACTIVE LANES...',
  progress,
  size = 360,
}: {
  caption?: string;
  progress?: string;
  size?: number;
}) {
  return (
    <div className="lg-wrap" style={{ width: size }} aria-hidden="true">
      <style>{`
        .lg-wrap { position: relative; display: flex; flex-direction: column; align-items: center; }
        .lg-draw { stroke-dasharray: 1 1; stroke-dashoffset: 1; animation: lg-draw 1.2s ease-out forwards; }
        .lg-draw.d2 { animation-delay: .15s } .lg-draw.d3 { animation-delay: .3s }
        @keyframes lg-draw { to { stroke-dashoffset: 0 } }
        .lg-sweep { stroke-dasharray: 0.12 0.88; stroke-dashoffset: 1; animation: lg-sweep 5s linear infinite; }
        .lg-sweep.s2 { animation-delay: 1.6s } .lg-sweep.s3 { animation-delay: 3.2s }
        @keyframes lg-sweep { to { stroke-dashoffset: -1 } }
        .lg-wp { opacity: 0; animation: lg-wp .5s ease-out forwards; }
        @keyframes lg-wp { to { opacity: 1 } }
        .lg-float { animation: lg-float 5s ease-in-out infinite alternate; }
        @keyframes lg-float { from { transform: translateY(0) } to { transform: translateY(-4px) } }
        @media (prefers-reduced-motion: reduce) {
          .lg-draw { animation: none; stroke-dashoffset: 0; }
          .lg-sweep, .lg-float { animation: none; }
          .lg-sweep { opacity: 0; }
          .lg-wp { animation: none; opacity: 1; }
        }
      `}</style>

      <svg viewBox="0 0 360 372" width={size} height={(size * 372) / 360} role="presentation">
        {/* frame corner ticks */}
        {[
          [14, 14, 1, 1],
          [346, 14, -1, 1],
          [14, 358, 1, -1],
          [346, 358, -1, -1],
        ].map(([x, y, dx, dy], i) => (
          <path
            key={i}
            d={`M ${x} ${y + 12 * dy} L ${x} ${y} L ${x + 12 * dx} ${y}`}
            fill="none"
            stroke="var(--border-hairline)"
            strokeWidth="1"
          />
        ))}

        {/* graticule — recedes */}
        <g fill="none" stroke={INK} opacity={0.13} strokeWidth={0.6}>
          {PARALLELS.map((r, i) => (
            <circle key={`p${i}`} cx={CX} cy={CY} r={r} />
          ))}
          {MERIDIANS.map((rx, i) => (
            <ellipse key={`m${i}`} cx={CX} cy={CY} rx={Math.max(rx, 0.5)} ry={R} />
          ))}
        </g>

        {/* rim — leads */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={INK} strokeWidth={1.4} opacity={0.85} />

        {/* stipple continents */}
        <g fill={INK}>
          {DOTS.map((d, i) => (
            <circle key={i} cx={d.x.toFixed(1)} cy={d.y.toFixed(1)} r={d.r.toFixed(2)} opacity={d.o.toFixed(2)} />
          ))}
        </g>

        {/* arcs: base line → draw-in → sweep pulse */}
        {ARCS.map((d, i) => (
          <g key={i} fill="none">
            <path d={d} stroke={COBALT} strokeWidth={1} opacity={0.25} pathLength={1} />
            <path d={d} stroke={COBALT} strokeWidth={1.6} pathLength={1} className={`lg-draw ${i === 1 ? 'd2' : i === 2 ? 'd3' : ''}`} />
            <path d={d} stroke={COBALT} strokeWidth={2.2} pathLength={1} className={`lg-sweep ${i === 1 ? 's2' : i === 2 ? 's3' : ''}`} strokeLinecap="round" />
          </g>
        ))}

        {/* waypoints */}
        {[
          [96, 142], [168, 100], [252, 118],
          [128, 258], [186, 296], [262, 238],
          [234, 254], [296, 196],
        ].map(([x, y], i) => (
          <circle key={`w${i}`} className="lg-wp" style={{ animationDelay: `${0.9 + i * 0.12}s` }} cx={x} cy={y} r={2.6} fill={COBALT} />
        ))}

        {/* vessel silhouettes riding the network */}
        <g className="lg-float">
          {/* container ship on the S Atlantic arc */}
          <g transform="translate(150 268) scale(0.9)">
            <path d="M 0 6 L 3 2 L 26 2 L 26 6 Z" fill="none" stroke={COBALT} strokeWidth={1.4} />
            <rect x={6} y={-2} width={4} height={4} fill="none" stroke={COBALT} strokeWidth={1.1} />
            <rect x={11} y={-2} width={4} height={4} fill="none" stroke={COBALT} strokeWidth={1.1} />
            <rect x={16} y={-2} width={4} height={4} fill="none" stroke={COBALT} strokeWidth={1.1} />
            <rect x={21} y={-3} width={3} height={5} fill="none" stroke={COBALT} strokeWidth={1.1} />
          </g>
          {/* plane on the N Atlantic arc */}
          <g transform="translate(210 96) rotate(18)">
            <path d="M -9 0 L 9 0 M 0 -4 L 0 5 M -3 5 L 3 5" stroke={COBALT} strokeWidth={1.5} fill="none" strokeLinecap="round" />
          </g>
        </g>
      </svg>

      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.14em',
          color: 'var(--ink)',
          marginTop: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: 99, background: COBALT, display: 'inline-block' }} />
        {caption}
      </div>
      {progress && (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-secondary)', marginTop: 6 }}>
          {progress}
        </div>
      )}
    </div>
  );
}
