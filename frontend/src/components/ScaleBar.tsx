'use client';

import { useMemo } from 'react';

/* ═══════════════════════════════════════════════════════════════
   NexaFreight — Scale Bar
   Nautical chart distance rule with hairline divisions
   ═══════════════════════════════════════════════════════════════ */

interface ScaleBarProps {
  zoom: number;
  latitude: number;
}

const SCALE_STEPS = [5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001];

export function scaleFor(zoom: number, latitude: number): { barWidth: number; label: string } {
  // Meters per pixel at given zoom and latitude
  const metersPerPx = 156543.03392 * Math.cos(latitude * Math.PI / 180) / Math.pow(2, zoom);
  const maxWidth = 100; // Max bar width in pixels
  const maxMeters = metersPerPx * maxWidth;
  const maxKm = maxMeters / 1000;

  // Fall back to the smallest step: past ~z16 nothing in the table fits, and
  // leaving it on the 5000 km head blew the bar out to millions of pixels.
  let bestStep = SCALE_STEPS[SCALE_STEPS.length - 1];
  for (const step of SCALE_STEPS) {
    if (step <= maxKm) { bestStep = step; break; }
  }

  const barWidth = Math.max(24, Math.round((bestStep * 1000) / metersPerPx));
  const label = bestStep >= 1 ? `${bestStep} km` : `${Math.round(bestStep * 1000)} m`;

  return { barWidth, label };
}

/**
 * Wave 4: ScaleBar reskinned as authentic nautical chart distance rule.
 * Hairline divisions, IBM Plex Mono with tabular-nums for km/m labels,
 * Chartroom palette (text-secondary), no background.
 */
export default function ScaleBar({ zoom, latitude }: ScaleBarProps) {
  const scaleInfo = useMemo(() => scaleFor(zoom, latitude), [zoom, latitude]);

  return (
    <div className="flex items-center gap-1.5 pointer-events-none select-none">
      <div className="flex flex-col items-start">
        {/* Scale line with ticks */}
        <div className="relative" style={{ width: scaleInfo.barWidth }}>
          {/* Ticks */}
          <div className="absolute left-0 top-0 w-px h-[5px]" style={{ backgroundColor: 'var(--text-secondary)' }} />
          <div className="absolute right-0 top-0 w-px h-[5px]" style={{ backgroundColor: 'var(--text-secondary)' }} />
          {/* Bar */}
          <div className="mt-[4px] h-px w-full" style={{ backgroundColor: 'var(--text-secondary)' }} />
        </div>
      </div>
      <span
        className="text-[9px] font-mono tracking-widest leading-none"
        style={{
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 500,
        }}
      >
        {scaleInfo.label}
      </span>
    </div>
  );
}
