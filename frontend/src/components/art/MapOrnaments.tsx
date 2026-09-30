'use client';

/**
 * CHARTROOM MapOrnaments — chart furniture for the Overview map frame.
 * CompassRose + ScaleBar as pure inline SVG (ink/cobalt hairlines).
 * Position absolutely over the map container corners by the consumer.
 */

export function CompassRose({ size = 74 }: { size?: number }) {
  const petals = [0, 45, 90, 135, 180, 225, 270, 315];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" role="presentation">
      <circle cx={50} cy={50} r={44} fill="none" stroke="#16181D" strokeWidth={0.8} opacity={0.5} />
      <circle cx={50} cy={50} r={36} fill="none" stroke="#16181D" strokeWidth={0.5} opacity={0.35} />
      {petals.map((deg, i) => {
        const long = i % 2 === 0;
        const len = long ? 40 : 24;
        const w = long ? 5 : 3.4;
        return (
          <g key={deg} transform={`rotate(${deg} 50 50)`}>
            <path d={`M 50 ${50 - len} L ${50 - w} 50 L 50 ${50 + w * 0.6} Z`} fill={i % 4 === 0 ? '#2547C8' : '#16181D'} opacity={i % 4 === 0 ? 0.9 : 0.55} />
            <path d={`M 50 ${50 - len} L ${50 + w} 50 L 50 ${50 + w * 0.6} Z`} fill="#16181D" opacity={0.22} />
          </g>
        );
      })}
      <circle cx={50} cy={50} r={2.6} fill="#16181D" />
      <text x={50} y={9} textAnchor="middle" fontSize={9} fontFamily="var(--font-mono)" fill="#16181D" opacity={0.75}>N</text>
    </svg>
  );
}

export function ScaleBar({ width = 150 }: { width?: number }) {
  const seg = width / 4;
  return (
    <svg width={width} height={26} viewBox={`0 0 ${width} 26`} aria-hidden="true" role="presentation">
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={i * seg}
          y={6}
          width={seg}
          height={6}
          fill={i % 2 === 0 ? '#16181D' : 'none'}
          stroke="#16181D"
          strokeWidth={0.8}
          opacity={0.7}
        />
      ))}
      <text x={0} y={24} fontSize={8.5} fontFamily="var(--font-mono)" fill="#16181D" opacity={0.7}>0</text>
      <text x={width} y={24} textAnchor="end" fontSize={8.5} fontFamily="var(--font-mono)" fill="#16181D" opacity={0.7}>2,000 KM</text>
    </svg>
  );
}
