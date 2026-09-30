'use client';

/**
 * CHARTROOM GlobalBackdrop — ambient line-art behind every authenticated page.
 * Dotted equirectangular world + sparse plexus web + two dashed route arcs.
 * Fixed, ~5% opacity, pointer-events-none, aria-hidden. Depth by drafting.
 * Reference: design_concepts/nexafreight_art_ambient_backdrop.png
 */
import { LAND_MASK } from './landMask';

// Deterministic plexus nodes (hand-seeded — no Math.random: hydration safety)
const NODES: [number, number][] = [
  [4, 18], [11, 9], [18, 26], [26, 7], [33, 21], [41, 12], [48, 30],
  [55, 6], [62, 17], [70, 27], [77, 10], [84, 22], [91, 8], [96, 31],
  [8, 38], [22, 45], [37, 52], [52, 41], [66, 55], [80, 47], [93, 58],
  [15, 62], [30, 70], [45, 66], [60, 74], [75, 68], [88, 78],
];
const EDGES: [number, number][] = [
  [0, 1], [1, 3], [3, 5], [5, 7], [7, 9], [9, 11], [11, 13],
  [0, 2], [2, 4], [4, 6], [6, 8], [8, 10], [10, 12],
  [2, 14], [14, 15], [15, 16], [16, 17], [17, 18], [18, 19], [19, 20],
  [14, 21], [21, 22], [22, 23], [23, 24], [24, 25], [25, 26],
  [4, 17], [8, 19], [12, 20],
];

export default function GlobalBackdrop() {
  const dots: { x: number; y: number }[] = [];
  for (let r = 0; r < LAND_MASK.length; r += 1) {
    const row = LAND_MASK[r];
    for (let c = 0; c < row.length; c += 1) {
      if (row[c] === '#') dots.push({ x: c * 26.4, y: 60 + r * 26.4 });
    }
  }

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.05,
        overflow: 'hidden',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1900 1060"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        <g fill="#16181D">
          {dots.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={3.1} />
          ))}
        </g>
        <g stroke="#2547C8" strokeWidth={1} fill="none">
          {EDGES.map(([a, b], i) => (
            <line key={i} x1={NODES[a][0] * 19} y1={NODES[a][1] * 12} x2={NODES[b][0] * 19} y2={NODES[b][1] * 12} />
          ))}
        </g>
        <g fill="#2547C8">
          {NODES.map(([x, y], i) => (
            <circle key={i} cx={x * 19} cy={y * 12} r={2.4} />
          ))}
        </g>
        <g stroke="#2547C8" strokeWidth={1.6} fill="none" strokeDasharray="7 8" opacity={0.9}>
          <path d="M 240 700 Q 640 520 1030 640" />
          <path d="M 980 780 Q 1320 900 1680 760" />
        </g>
      </svg>
    </div>
  );
}
