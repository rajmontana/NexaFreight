'use client';

/**
 * CHARTROOM PlexusHeader — page title floating over a faint line-art network.
 * The ONLY depth device allowed behind headings: hairline plexus at ~8%,
 * fading toward the content. aria-hidden; pure decoration.
 */
export default function PlexusHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div style={{ position: 'relative', padding: '34px 28px 18px', overflow: 'hidden' }}>
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08 }}
        viewBox="0 0 900 120"
        preserveAspectRatio="xMidYMid slice"
        role="presentation"
      >
        <g stroke="#2547C8" strokeWidth={1} fill="none">
          <line x1={30} y1={90} x2={150} y2={30} />
          <line x1={150} y1={30} x2={300} y2={72} />
          <line x1={300} y1={72} x2={452} y2={22} />
          <line x1={452} y1={22} x2={610} y2={64} />
          <line x1={610} y1={64} x2={760} y2={28} />
          <line x1={760} y1={28} x2={878} y2={70} />
          <line x1={150} y1={30} x2={452} y2={22} />
          <line x1={452} y1={22} x2={760} y2={28} />
          <line x1={300} y1={72} x2={610} y2={64} />
          <line x1={60} y1={40} x2={150} y2={30} />
          <line x1={610} y1={64} x2={700} y2={96} />
        </g>
        <g fill="#2547C8">
          {[
            [30, 90], [60, 40], [150, 30], [300, 72], [452, 22],
            [610, 64], [700, 96], [760, 28], [878, 70],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={3} />
          ))}
        </g>
      </svg>
      <h1
        style={{
          position: 'relative',
          margin: 0,
          fontFamily: 'var(--font-ui)',
          fontWeight: 300,
          fontSize: 34,
          letterSpacing: '-0.01em',
          color: 'var(--ink)',
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            position: 'relative',
            margin: '6px 0 0',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.12em',
            color: 'var(--text-secondary)',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
