'use client';

import React, { useEffect, useState } from 'react';

interface LoadingGlobeProps {
  caption?: string;
  progress?: number;
  className?: string;
  size?: number;
}

export default function LoadingGlobe({
  caption = 'PLOTTING ACTIVE LANES...',
  progress: externalProgress,
  className = '',
  size = 280,
}: LoadingGlobeProps) {
  const [internalProgress, setInternalProgress] = useState(0);

  useEffect(() => {
    if (externalProgress !== undefined) {
      setInternalProgress(Math.min(100, Math.max(0, externalProgress)));
      return;
    }

    // Auto-advancing counter simulation for indeterminate loading
    const interval = setInterval(() => {
      setInternalProgress((prev) => {
        if (prev >= 98) return 98;
        const jump = Math.floor(Math.random() * 8) + 3;
        return Math.min(prev + jump, 98);
      });
    }, 180);

    return () => clearInterval(interval);
  }, [externalProgress]);

  const displayProgress = externalProgress !== undefined ? externalProgress : internalProgress;

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 select-none ${className}`}
      role="status"
      aria-label={`${caption} ${Math.round(displayProgress)}%`}
      style={{ backgroundColor: 'transparent' }}
    >
      <style>{`
        @keyframes arcDraw1 {
          0% { stroke-dashoffset: 180; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes arcDraw2 {
          0% { stroke-dashoffset: 180; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes arcDraw3 {
          0% { stroke-dashoffset: 180; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes dashDrift {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -48; }
        }
        @keyframes fadeInNode {
          0% { opacity: 0; transform: scale(0.6); }
          100% { opacity: 1; transform: scale(1); }
        }

        .globe-arc-1 {
          stroke-dasharray: 6 6;
          animation: arcDraw1 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0ms both, dashDrift 6s linear 1.2s infinite;
        }
        .globe-arc-2 {
          stroke-dasharray: 6 6;
          animation: arcDraw2 1.2s cubic-bezier(0.16, 1, 0.3, 1) 150ms both, dashDrift 6s linear 1.35s infinite;
        }
        .globe-arc-3 {
          stroke-dasharray: 6 6;
          animation: arcDraw3 1.2s cubic-bezier(0.16, 1, 0.3, 1) 300ms both, dashDrift 6s linear 1.5s infinite;
        }

        .globe-clip-1 {
          stroke-dasharray: 180;
          stroke-dashoffset: 180;
          animation: arcDraw1 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0ms forwards;
        }
        .globe-clip-2 {
          stroke-dasharray: 180;
          stroke-dashoffset: 180;
          animation: arcDraw2 1.2s cubic-bezier(0.16, 1, 0.3, 1) 150ms forwards;
        }
        .globe-clip-3 {
          stroke-dasharray: 180;
          stroke-dashoffset: 180;
          animation: arcDraw3 1.2s cubic-bezier(0.16, 1, 0.3, 1) 300ms forwards;
        }

        .globe-node-1 { animation: fadeInNode 0.4s ease-out 400ms both; }
        .globe-node-2 { animation: fadeInNode 0.4s ease-out 550ms both; }
        .globe-node-3 { animation: fadeInNode 0.4s ease-out 700ms both; }

        @media (prefers-reduced-motion: reduce) {
          .globe-arc-1,
          .globe-arc-2,
          .globe-arc-3,
          .globe-clip-1,
          .globe-clip-2,
          .globe-clip-3,
          .globe-node-1,
          .globe-node-2,
          .globe-node-3 {
            animation: none !important;
            stroke-dashoffset: 0 !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>

      <svg
        width={size}
        height={size}
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {/* Clip paths for the 3 draw transitions */}
          <clipPath id="clip-globe-arc-1">
            <path
              d="M 122 88 Q 140 128 174 124"
              stroke="#000"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
              className="globe-clip-1"
            />
          </clipPath>
          <clipPath id="clip-globe-arc-2">
            <path
              d="M 78 92 Q 98 64 122 72"
              stroke="#000"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
              className="globe-clip-2"
            />
          </clipPath>
          <clipPath id="clip-globe-arc-3">
            <path
              d="M 164 102 Q 132 152 94 140"
              stroke="#000"
              strokeWidth="12"
              strokeLinecap="round"
              fill="none"
              className="globe-clip-3"
            />
          </clipPath>
        </defs>

        {/* 1. Receding Graticule: Hairline (0.6px), 30% Opacity */}
        <g stroke="#16181D" strokeWidth="0.6" opacity="0.30" fill="none">
          {/* Outer concentric reference ring */}
          <circle cx="120" cy="120" r="95" strokeDasharray="3 4" />

          {/* Latitude Parallels */}
          <ellipse cx="120" cy="62" rx="63" ry="10" strokeDasharray="2 3" />
          <ellipse cx="120" cy="90" rx="80" ry="14" strokeDasharray="2 3" />
          <ellipse cx="120" cy="120" rx="86" ry="18" strokeDasharray="2 3" />
          <ellipse cx="120" cy="150" rx="80" ry="14" strokeDasharray="2 3" />
          <ellipse cx="120" cy="178" rx="63" ry="10" strokeDasharray="2 3" />

          {/* Longitude Meridians */}
          <ellipse cx="120" cy="120" rx="20" ry="86" strokeDasharray="2 3" />
          <ellipse cx="120" cy="120" rx="44" ry="86" strokeDasharray="2 3" />
          <ellipse cx="120" cy="120" rx="70" ry="86" strokeDasharray="2 3" />

          {/* Equatorial & Prime Meridian Center Axes */}
          <line x1="34" y1="120" x2="206" y2="120" strokeDasharray="3 3" />
          <line x1="120" y1="34" x2="120" y2="206" strokeDasharray="3 3" />
        </g>

        {/* 2. Leading Globe Outline: 1.5px Ink */}
        <circle
          cx="120"
          cy="120"
          r="86"
          stroke="#16181D"
          strokeWidth="1.5"
          fill="none"
        />

        {/* 3. Continents: Dense Dot-Stipple Fills (1.6px dots, ~0.55 opacity ink) */}
        <g fill="#16181D" opacity="0.55">
          {/* North America */}
          <circle cx="56" cy="76" r="1.6" />
          <circle cx="62" cy="72" r="1.6" />
          <circle cx="68" cy="70" r="1.6" />
          <circle cx="74" cy="72" r="1.6" />
          <circle cx="80" cy="74" r="1.6" />
          <circle cx="60" cy="78" r="1.6" />
          <circle cx="66" cy="76" r="1.6" />
          <circle cx="72" cy="78" r="1.6" />
          <circle cx="78" cy="80" r="1.6" />
          <circle cx="84" cy="78" r="1.6" />
          <circle cx="58" cy="86" r="1.6" />
          <circle cx="64" cy="84" r="1.6" />
          <circle cx="70" cy="84" r="1.6" />
          <circle cx="76" cy="86" r="1.6" />
          <circle cx="82" cy="86" r="1.6" />
          <circle cx="88" cy="84" r="1.6" />
          <circle cx="94" cy="86" r="1.6" />
          <circle cx="62" cy="92" r="1.6" />
          <circle cx="68" cy="90" r="1.6" />
          <circle cx="74" cy="92" r="1.6" />
          <circle cx="80" cy="92" r="1.6" />
          <circle cx="86" cy="90" r="1.6" />
          <circle cx="92" cy="92" r="1.6" />
          <circle cx="66" cy="98" r="1.6" />
          <circle cx="72" cy="98" r="1.6" />
          <circle cx="78" cy="100" r="1.6" />
          <circle cx="84" cy="98" r="1.6" />
          <circle cx="90" cy="98" r="1.6" />
          <circle cx="70" cy="106" r="1.6" />
          <circle cx="76" cy="106" r="1.6" />
          <circle cx="82" cy="104" r="1.6" />
          <circle cx="88" cy="104" r="1.6" />
          <circle cx="72" cy="112" r="1.6" />
          <circle cx="76" cy="114" r="1.6" />
          <circle cx="80" cy="116" r="1.6" />
          <circle cx="84" cy="122" r="1.6" />

          {/* South America */}
          <circle cx="86" cy="128" r="1.6" />
          <circle cx="92" cy="128" r="1.6" />
          <circle cx="98" cy="126" r="1.6" />
          <circle cx="104" cy="128" r="1.6" />
          <circle cx="88" cy="134" r="1.6" />
          <circle cx="94" cy="134" r="1.6" />
          <circle cx="100" cy="134" r="1.6" />
          <circle cx="106" cy="136" r="1.6" />
          <circle cx="90" cy="140" r="1.6" />
          <circle cx="96" cy="140" r="1.6" />
          <circle cx="102" cy="142" r="1.6" />
          <circle cx="108" cy="142" r="1.6" />
          <circle cx="112" cy="144" r="1.6" />
          <circle cx="92" cy="148" r="1.6" />
          <circle cx="98" cy="148" r="1.6" />
          <circle cx="104" cy="150" r="1.6" />
          <circle cx="108" cy="152" r="1.6" />
          <circle cx="92" cy="156" r="1.6" />
          <circle cx="96" cy="156" r="1.6" />
          <circle cx="102" cy="158" r="1.6" />
          <circle cx="90" cy="164" r="1.6" />
          <circle cx="94" cy="164" r="1.6" />
          <circle cx="98" cy="166" r="1.6" />
          <circle cx="92" cy="172" r="1.6" />
          <circle cx="94" cy="176" r="1.6" />

          {/* Europe */}
          <circle cx="110" cy="68" r="1.6" />
          <circle cx="116" cy="68" r="1.6" />
          <circle cx="122" cy="66" r="1.6" />
          <circle cx="128" cy="68" r="1.6" />
          <circle cx="108" cy="74" r="1.6" />
          <circle cx="114" cy="74" r="1.6" />
          <circle cx="120" cy="74" r="1.6" />
          <circle cx="126" cy="76" r="1.6" />
          <circle cx="112" cy="80" r="1.6" />
          <circle cx="118" cy="80" r="1.6" />
          <circle cx="124" cy="82" r="1.6" />
          <circle cx="130" cy="82" r="1.6" />
          <circle cx="114" cy="86" r="1.6" />
          <circle cx="120" cy="88" r="1.6" />
          <circle cx="126" cy="88" r="1.6" />

          {/* Africa */}
          <circle cx="106" cy="96" r="1.6" />
          <circle cx="112" cy="96" r="1.6" />
          <circle cx="118" cy="96" r="1.6" />
          <circle cx="124" cy="96" r="1.6" />
          <circle cx="130" cy="96" r="1.6" />
          <circle cx="104" cy="104" r="1.6" />
          <circle cx="110" cy="102" r="1.6" />
          <circle cx="116" cy="102" r="1.6" />
          <circle cx="122" cy="102" r="1.6" />
          <circle cx="128" cy="104" r="1.6" />
          <circle cx="134" cy="104" r="1.6" />
          <circle cx="106" cy="110" r="1.6" />
          <circle cx="112" cy="110" r="1.6" />
          <circle cx="118" cy="110" r="1.6" />
          <circle cx="124" cy="110" r="1.6" />
          <circle cx="130" cy="112" r="1.6" />
          <circle cx="108" cy="118" r="1.6" />
          <circle cx="114" cy="118" r="1.6" />
          <circle cx="120" cy="118" r="1.6" />
          <circle cx="126" cy="120" r="1.6" />
          <circle cx="132" cy="122" r="1.6" />
          <circle cx="112" cy="126" r="1.6" />
          <circle cx="118" cy="126" r="1.6" />
          <circle cx="124" cy="126" r="1.6" />
          <circle cx="130" cy="128" r="1.6" />
          <circle cx="114" cy="134" r="1.6" />
          <circle cx="120" cy="134" r="1.6" />
          <circle cx="126" cy="136" r="1.6" />
          <circle cx="116" cy="144" r="1.6" />
          <circle cx="122" cy="144" r="1.6" />
          <circle cx="128" cy="146" r="1.6" />
          <circle cx="118" cy="152" r="1.6" />
          <circle cx="124" cy="152" r="1.6" />
          <circle cx="120" cy="160" r="1.6" />

          {/* Eurasia, Middle East & South Asia */}
          <circle cx="136" cy="68" r="1.6" />
          <circle cx="144" cy="68" r="1.6" />
          <circle cx="152" cy="70" r="1.6" />
          <circle cx="160" cy="72" r="1.6" />
          <circle cx="168" cy="74" r="1.6" />
          <circle cx="174" cy="76" r="1.6" />
          <circle cx="138" cy="76" r="1.6" />
          <circle cx="146" cy="76" r="1.6" />
          <circle cx="154" cy="78" r="1.6" />
          <circle cx="162" cy="80" r="1.6" />
          <circle cx="170" cy="82" r="1.6" />
          <circle cx="142" cy="84" r="1.6" />
          <circle cx="150" cy="84" r="1.6" />
          <circle cx="158" cy="86" r="1.6" />
          <circle cx="166" cy="88" r="1.6" />
          <circle cx="174" cy="90" r="1.6" />
          <circle cx="132" cy="98" r="1.6" />
          <circle cx="136" cy="104" r="1.6" />
          <circle cx="140" cy="108" r="1.6" />
          <circle cx="134" cy="112" r="1.6" />
          <circle cx="138" cy="114" r="1.6" />
          <circle cx="142" cy="94" r="1.6" />
          <circle cx="148" cy="94" r="1.6" />
          <circle cx="154" cy="96" r="1.6" />
          <circle cx="144" cy="102" r="1.6" />
          <circle cx="150" cy="102" r="1.6" />
          <circle cx="156" cy="104" r="1.6" />
          <circle cx="142" cy="110" r="1.6" />
          <circle cx="146" cy="110" r="1.6" />
          <circle cx="150" cy="112" r="1.6" />
          <circle cx="144" cy="118" r="1.6" />
          <circle cx="148" cy="118" r="1.6" />
          <circle cx="146" cy="126" r="1.6" />

          {/* East Asia & Japan */}
          <circle cx="160" cy="94" r="1.6" />
          <circle cx="166" cy="96" r="1.6" />
          <circle cx="172" cy="98" r="1.6" />
          <circle cx="178" cy="100" r="1.6" />
          <circle cx="184" cy="94" r="1.6" />
          <circle cx="162" cy="102" r="1.6" />
          <circle cx="168" cy="104" r="1.6" />
          <circle cx="174" cy="106" r="1.6" />
          <circle cx="180" cy="104" r="1.6" />
          <circle cx="186" cy="100" r="1.6" />
          <circle cx="160" cy="110" r="1.6" />
          <circle cx="166" cy="112" r="1.6" />
          <circle cx="172" cy="114" r="1.6" />
          <circle cx="178" cy="114" r="1.6" />
          <circle cx="162" cy="120" r="1.6" />
          <circle cx="168" cy="122" r="1.6" />
          <circle cx="174" cy="124" r="1.6" />

          {/* Australia */}
          <circle cx="170" cy="146" r="1.6" />
          <circle cx="176" cy="144" r="1.6" />
          <circle cx="182" cy="146" r="1.6" />
          <circle cx="168" cy="154" r="1.6" />
          <circle cx="174" cy="152" r="1.6" />
          <circle cx="180" cy="154" r="1.6" />
          <circle cx="186" cy="154" r="1.6" />
          <circle cx="172" cy="162" r="1.6" />
          <circle cx="178" cy="162" r="1.6" />
          <circle cx="184" cy="160" r="1.6" />
        </g>

        {/* 4. Exactly 3 Great-Circle Arcs (Cobalt, 1.5px, Dash 6/6) */}
        {/* Arc 1: Middle East -> Indian Ocean -> Southeast Asia */}
        <path
          d="M 122 88 Q 140 128 174 124"
          fill="none"
          stroke="#2547C8"
          strokeWidth="1.5"
          strokeLinecap="round"
          clipPath="url(#clip-globe-arc-1)"
          className="globe-arc-1"
        />

        {/* Arc 2: North America -> North Atlantic -> Northwest Europe */}
        <path
          d="M 78 92 Q 98 64 122 72"
          fill="none"
          stroke="#2547C8"
          strokeWidth="1.5"
          strokeLinecap="round"
          clipPath="url(#clip-globe-arc-2)"
          className="globe-arc-2"
        />

        {/* Arc 3: East Asia/Pacific -> South Pacific -> South America */}
        <path
          d="M 164 102 Q 132 152 94 140"
          fill="none"
          stroke="#2547C8"
          strokeWidth="1.5"
          strokeLinecap="round"
          clipPath="url(#clip-globe-arc-3)"
          className="globe-arc-3"
        />

        {/* 5-6 Waypoint Dots (3px Cobalt) Placed Directly ON the Arcs */}
        <g fill="#2547C8">
          {/* Arc 1 Waypoints (Start, Mid, End) */}
          <circle cx="122" cy="88" r="3" className="globe-node-1" />
          <circle cx="145" cy="116" r="3" className="globe-node-1" />
          <circle cx="174" cy="124" r="3" className="globe-node-1" />

          {/* Arc 2 Waypoints (Start, End) */}
          <circle cx="78" cy="92" r="3" className="globe-node-2" />
          <circle cx="122" cy="72" r="3" className="globe-node-2" />

          {/* Arc 3 Waypoint (Mid-crossing) */}
          <circle cx="130" cy="142" r="3" className="globe-node-3" />
        </g>

        {/* Single-Weight Line Style Silhouettes */}
        {/* Container Ship on Ocean Arc 1 (Indian Ocean corridor) */}
        <g transform="translate(138, 113) rotate(-18)" className="globe-node-1">
          {/* Hull outline */}
          <path
            d="M -7 -1.5 L 5 -1.5 L 8 1 L -6 1 Z"
            stroke="#2547C8"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="var(--paper)"
          />
          {/* Bridge / Deckhouse */}
          <path
            d="M -5 -1.5 L -5 -4.5 L -2 -4.5 L -2 -1.5"
            stroke="#2547C8"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Container stacks */}
          <rect x="-1" y="-3.5" width="3" height="2" stroke="#2547C8" strokeWidth="1.2" fill="none" />
          <rect x="2.5" y="-3.5" width="3" height="2" stroke="#2547C8" strokeWidth="1.2" fill="none" />
        </g>

        {/* Plane on Atlantic Arc 2 */}
        <g transform="translate(98, 70) rotate(16)" className="globe-node-2">
          <path
            d="M 0 -7 L 1.5 -2 L 7 1 L 1.5 2 L 1 6 L 3 7.5 L 0 7 L -3 7.5 L -1 6 L -1.5 2 L -7 1 L -1.5 -2 Z"
            stroke="#2547C8"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="var(--paper)"
          />
        </g>

        {/* Technical Corner Registration Ticks */}
        <g stroke="#16181D" strokeWidth="1" opacity="0.4">
          <path d="M 28 28 L 38 28 M 28 28 L 28 38" />
          <path d="M 212 28 L 202 28 M 212 28 L 212 38" />
          <path d="M 28 212 L 38 212 M 28 212 L 28 202" />
          <path d="M 212 212 L 202 212 M 212 212 L 212 202" />
        </g>
      </svg>

      {/* Monospace Caption & Progress Counter */}
      <div className="mt-4 flex flex-col items-center gap-1.5 font-mono text-[11px] tracking-wider text-[var(--ink)]">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--cobalt)] animate-pulse" />
          <span className="font-semibold">{caption}</span>
        </div>
        <div className="flex items-center gap-2 text-[var(--text-secondary)] text-[10px]">
          <span>TELEMETRY SYNC</span>
          <span className="font-bold text-[var(--cobalt)] tabular-nums">
            {Math.round(displayProgress)}%
          </span>
        </div>
      </div>
    </div>
  );
}
