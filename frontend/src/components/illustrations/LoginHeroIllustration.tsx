'use client';

import React from 'react';

export default function LoginHeroIllustration({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative w-full h-full flex flex-col items-center justify-between p-12 select-none overflow-hidden ${className}`}
      style={{
        backgroundColor: 'var(--bg-subtle)',
        borderRight: '1px solid var(--border-hairline)',
      }}
    >
      <style>{`
        @keyframes pulseDot {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.35); opacity: 1; }
        }
        @keyframes dashDrawGlobe {
          0% { stroke-dashoffset: 400; }
          100% { stroke-dashoffset: 0; }
        }
        .globe-route-anim {
          stroke-dasharray: 6 5;
          animation: dashDrawGlobe 8s linear infinite;
        }
      `}</style>

      {/* Top Header Stamp */}
      <div className="w-full flex items-center justify-between font-mono text-[10px] text-[var(--text-secondary)] border-b border-[var(--border-hairline)] pb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-[1px] bg-[var(--cobalt)]" />
          <span className="font-bold text-[var(--ink)]">NEXAFREIGHT SYSTEM ENGINE</span>
        </div>
        <div className="flex items-center gap-3">
          <span>LAT 18.95°N / LON 72.95°E</span>
          <span className="px-1.5 py-0.5 border border-[var(--border-hairline)] bg-[var(--paper)] text-[var(--moss-positive)] font-semibold">
            TELEMETRY ACTIVE
          </span>
        </div>
      </div>

      {/* Central Interactive Technical Globe & Plexus Network */}
      <div className="relative my-auto flex items-center justify-center max-w-[500px] w-full aspect-square">
        <svg
          viewBox="0 0 460 460"
          className="w-full h-full overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Background Radial Rings */}
          <circle cx="230" cy="230" r="210" stroke="#16181D" strokeWidth="0.75" strokeDasharray="3 6" opacity="0.2" />
          <circle cx="230" cy="230" r="190" stroke="#16181D" strokeWidth="1" opacity="0.3" />
          <circle cx="230" cy="230" r="160" stroke="#16181D" strokeWidth="0.75" opacity="0.25" />

          {/* Latitude Graticules */}
          <ellipse cx="230" cy="230" rx="190" ry="38" stroke="#16181D" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.3" />
          <ellipse cx="230" cy="160" rx="170" ry="30" stroke="#16181D" strokeWidth="0.7" strokeDasharray="3 4" opacity="0.25" />
          <ellipse cx="230" cy="300" rx="170" ry="30" stroke="#16181D" strokeWidth="0.7" strokeDasharray="3 4" opacity="0.25" />
          <ellipse cx="230" cy="100" rx="125" ry="20" stroke="#16181D" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.2" />
          <ellipse cx="230" cy="360" rx="125" ry="20" stroke="#16181D" strokeWidth="0.6" strokeDasharray="2 3" opacity="0.2" />

          {/* Longitude Meridians */}
          <ellipse cx="230" cy="230" rx="85" ry="190" stroke="#16181D" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.3" />
          <ellipse cx="230" cy="230" rx="140" ry="190" stroke="#16181D" strokeWidth="0.7" strokeDasharray="3 4" opacity="0.25" />
          <line x1="230" y1="40" x2="230" y2="420" stroke="#16181D" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.4" />
          <line x1="40" y1="230" x2="420" y2="230" stroke="#16181D" strokeWidth="0.8" strokeDasharray="3 3" opacity="0.4" />

          {/* Dotted Continents Clusters */}
          {/* South Asia & India */}
          <g fill="#16181D" opacity="0.5">
            <circle cx="260" cy="210" r="2" />
            <circle cx="265" cy="215" r="2.2" />
            <circle cx="270" cy="218" r="2" />
            <circle cx="262" cy="225" r="2.2" />
            <circle cx="268" cy="230" r="2.5" />
            <circle cx="272" cy="238" r="2" />
            <circle cx="275" cy="245" r="1.8" />
          </g>

          {/* Middle East & Red Sea */}
          <g fill="#16181D" opacity="0.5">
            <circle cx="232" cy="195" r="2" />
            <circle cx="238" cy="202" r="2.2" />
            <circle cx="244" cy="208" r="2" />
            <circle cx="228" cy="215" r="1.8" />
            <circle cx="234" cy="224" r="2.2" />
          </g>

          {/* Europe */}
          <g fill="#16181D" opacity="0.5">
            <circle cx="205" cy="155" r="2.2" />
            <circle cx="215" cy="150" r="2" />
            <circle cx="225" cy="158" r="2.4" />
            <circle cx="210" cy="165" r="1.8" />
            <circle cx="220" cy="172" r="2.2" />
          </g>

          {/* Southeast & East Asia */}
          <g fill="#16181D" opacity="0.5">
            <circle cx="310" cy="210" r="2.2" />
            <circle cx="320" cy="218" r="2" />
            <circle cx="330" cy="225" r="2.4" />
            <circle cx="305" cy="235" r="2.2" />
            <circle cx="312" cy="248" r="2.5" />
            <circle cx="325" cy="255" r="2" />
          </g>

          {/* Americas */}
          <g fill="#16181D" opacity="0.5">
            <circle cx="120" cy="170" r="2.2" />
            <circle cx="130" cy="175" r="2" />
            <circle cx="140" cy="180" r="2.4" />
            <circle cx="125" cy="210" r="2.2" />
            <circle cx="138" cy="235" r="2.5" />
            <circle cx="145" cy="260" r="2" />
          </g>

          {/* Plexus Hairline Interconnect Lines */}
          <g stroke="#16181D" strokeWidth="0.8" opacity="0.35">
            <line x1="268" y1="230" x2="238" y2="202" />
            <line x1="238" y1="202" x2="215" y2="150" />
            <line x1="268" y1="230" x2="312" y2="248" />
            <line x1="312" y1="248" x2="330" y2="225" />
            <line x1="215" y1="150" x2="130" y2="175" />
            <line x1="130" y1="175" x2="125" y2="210" />
          </g>

          {/* Great Circle Arcs (Cobalt) */}
          <path
            d="M 268 230 Q 252 210 238 202"
            fill="none"
            stroke="#2547C8"
            strokeWidth="2"
            className="globe-route-anim"
          />
          <path
            d="M 238 202 Q 222 170 215 150"
            fill="none"
            stroke="#2547C8"
            strokeWidth="2"
            className="globe-route-anim"
          />
          <path
            d="M 312 248 Q 288 242 268 230"
            fill="none"
            stroke="#2547C8"
            strokeWidth="1.8"
            className="globe-route-anim"
          />
          <path
            d="M 215 150 Q 165 140 130 175"
            fill="none"
            stroke="#2547C8"
            strokeWidth="1.5"
            className="globe-route-anim"
          />

          {/* Pulsing Port Dots & Nodes */}
          {/* Port 1: INNSA / Nhava Sheva (Primary Hub) */}
          <g transform="translate(268, 230)">
            <circle cx="0" cy="0" r="10" stroke="#2547C8" strokeWidth="1" opacity="0.4" />
            <circle cx="0" cy="0" r="4.5" fill="#2547C8" />
            <text x="8" y="3" fill="#16181D" fontFamily="var(--font-mono)" fontSize="9" fontWeight="600">
              INNSA [MUMBAI]
            </text>
          </g>

          {/* Port 2: AEJEA / Jebel Ali */}
          <g transform="translate(238, 202)">
            <circle cx="0" cy="0" r="8" stroke="#16181D" strokeWidth="0.8" opacity="0.3" />
            <circle cx="0" cy="0" r="3.5" fill="#16181D" />
            <text x="-70" y="-6" fill="#5A5D66" fontFamily="var(--font-mono)" fontSize="8.5">
              AEJEA [JEBEL ALI]
            </text>
          </g>

          {/* Port 3: NLRTM / Rotterdam */}
          <g transform="translate(215, 150)">
            <circle cx="0" cy="0" r="7" stroke="#2547C8" strokeWidth="0.8" opacity="0.3" />
            <circle cx="0" cy="0" r="3.5" fill="#2547C8" />
            <text x="8" y="-4" fill="#16181D" fontFamily="var(--font-mono)" fontSize="8.5" fontWeight="600">
              NLRTM [ROTTERDAM]
            </text>
          </g>

          {/* Port 4: SGSIN / Singapore */}
          <g transform="translate(312, 248)">
            <circle cx="0" cy="0" r="8" stroke="#2547C8" strokeWidth="0.8" opacity="0.3" />
            <circle cx="0" cy="0" r="3.5" fill="#2547C8" />
            <text x="8" y="4" fill="#16181D" fontFamily="var(--font-mono)" fontSize="8.5" fontWeight="600">
              SGSIN [SINGAPORE]
            </text>
          </g>

          {/* Port 5: USLAX / Los Angeles */}
          <g transform="translate(130, 175)">
            <circle cx="0" cy="0" r="7" stroke="#16181D" strokeWidth="0.8" opacity="0.3" />
            <circle cx="0" cy="0" r="3" fill="#16181D" />
            <text x="-64" y="12" fill="#5A5D66" fontFamily="var(--font-mono)" fontSize="8.5">
              USLAX [LONG BEACH]
            </text>
          </g>

          {/* Technical Corner Registration Ticks */}
          <path d="M 20 20 L 34 20 M 20 20 L 20 34" stroke="#16181D" strokeWidth="1" opacity="0.5" />
          <path d="M 440 20 L 426 20 M 440 20 L 440 34" stroke="#16181D" strokeWidth="1" opacity="0.5" />
          <path d="M 20 440 L 34 440 M 20 440 L 20 426" stroke="#16181D" strokeWidth="1" opacity="0.5" />
          <path d="M 440 440 L 426 440 M 440 440 L 440 426" stroke="#16181D" strokeWidth="1" opacity="0.5" />
        </svg>
      </div>

      {/* Bottom Technical Description */}
      <div className="w-full flex items-end justify-between font-mono text-[10px] text-[var(--text-secondary)] border-t border-[var(--border-hairline)] pt-4">
        <div className="flex flex-col gap-1 max-w-[280px]">
          <span className="font-ui text-[12px] font-bold text-[var(--ink)]">
            Autonomous Multimodal Dispatch
          </span>
          <span>
            Real-time Great Circle corridors, maritime AIS transponders & SLA risk arbitration.
          </span>
        </div>
        <div className="text-right">
          <div className="font-bold text-[var(--ink)]">SPEC 3.0b</div>
          <div>INSPECTION READY</div>
        </div>
      </div>
    </div>
  );
}
