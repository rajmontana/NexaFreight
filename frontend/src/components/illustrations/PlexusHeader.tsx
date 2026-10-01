'use client';

import React from 'react';

interface PlexusHeaderProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function PlexusHeader({ className = '', style }: PlexusHeaderProps) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden z-0 ${className}`}
      style={{
        opacity: 0.08,
        ...style,
      }}
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Subtle Background Coordinate Hairlines */}
        <line x1="0" y1="30" x2="1200" y2="30" stroke="#16181D" strokeWidth="0.75" strokeDasharray="4 8" />
        <line x1="0" y1="60" x2="1200" y2="60" stroke="#16181D" strokeWidth="0.5" />
        <line x1="0" y1="90" x2="1200" y2="90" stroke="#16181D" strokeWidth="0.75" strokeDasharray="4 8" />

        {/* Vertical Registration Marks */}
        <line x1="150" y1="0" x2="150" y2="120" stroke="#16181D" strokeWidth="0.5" strokeDasharray="2 6" />
        <line x1="380" y1="0" x2="380" y2="120" stroke="#16181D" strokeWidth="0.5" strokeDasharray="2 6" />
        <line x1="620" y1="0" x2="620" y2="120" stroke="#16181D" strokeWidth="0.5" strokeDasharray="2 6" />
        <line x1="880" y1="0" x2="880" y2="120" stroke="#16181D" strokeWidth="0.5" strokeDasharray="2 6" />
        <line x1="1050" y1="0" x2="1050" y2="120" stroke="#16181D" strokeWidth="0.5" strokeDasharray="2 6" />

        {/* Plexus Hairline Triangular Network (Ink & Cobalt) */}
        <g stroke="#16181D" strokeWidth="0.75">
          <line x1="40" y1="60" x2="120" y2="25" />
          <line x1="120" y1="25" x2="210" y2="75" />
          <line x1="210" y1="75" x2="40" y2="60" />

          <line x1="210" y1="75" x2="320" y2="35" />
          <line x1="320" y1="35" x2="390" y2="85" />
          <line x1="390" y1="85" x2="210" y2="75" />

          <line x1="390" y1="85" x2="520" y2="45" />
          <line x1="520" y1="45" x2="630" y2="70" />
          <line x1="630" y1="70" x2="390" y2="85" />

          <line x1="630" y1="70" x2="740" y2="20" />
          <line x1="740" y1="20" x2="860" y2="65" />
          <line x1="860" y1="65" x2="630" y2="70" />

          <line x1="860" y1="65" x2="980" y2="30" />
          <line x1="980" y1="30" x2="1070" y2="80" />
          <line x1="1070" y1="80" x2="860" y2="65" />

          <line x1="1070" y1="80" x2="1160" y2="40" />
        </g>

        {/* Cobalt Interconnect Strands */}
        <g stroke="#2547C8" strokeWidth="1">
          <line x1="120" y1="25" x2="320" y2="35" />
          <line x1="320" y1="35" x2="520" y2="45" />
          <line x1="520" y1="45" x2="740" y2="20" />
          <line x1="740" y1="20" x2="980" y2="30" />
          <line x1="980" y1="30" x2="1160" y2="40" />

          {/* Arcs */}
          <path d="M 40 60 Q 210 10 390 85" fill="none" strokeDasharray="3 3" />
          <path d="M 390 85 Q 630 15 860 65" fill="none" strokeDasharray="3 3" />
          <path d="M 740 20 Q 950 110 1160 40" fill="none" strokeDasharray="3 3" />
        </g>

        {/* Node Points */}
        <g fill="#16181D">
          <circle cx="40" cy="60" r="2" />
          <circle cx="210" cy="75" r="2.5" />
          <circle cx="390" cy="85" r="2" />
          <circle cx="630" cy="70" r="2.5" />
          <circle cx="860" cy="65" r="2" />
          <circle cx="1070" cy="80" r="2.5" />
        </g>
        <g fill="#2547C8">
          <circle cx="120" cy="25" r="2.5" />
          <circle cx="320" cy="35" r="3" />
          <circle cx="520" cy="45" r="2.5" />
          <circle cx="740" cy="20" r="3" />
          <circle cx="980" cy="30" r="2.5" />
          <circle cx="1160" cy="40" r="2" />
        </g>
      </svg>
    </div>
  );
}
