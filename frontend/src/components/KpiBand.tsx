'use client';

/**
 * KpiBand — the headline figures across the top of the control tower.
 *
 *   ON-TIME %   ·   EXPOSURE ₹   ·   SLA AT-RISK   ·   SCOPE-3 CO₂
 *
 * Chartroom treatment: paper ground, hairline rules, mono numerals, cobalt
 * reserved for the one figure that demands action. No gradients, no glow.
 *
 * Every tile is fed by a real analytics endpoint and prints the provenance
 * token it came from. A tile with no data prints NO DATA — never a zero that
 * could be mistaken for a measurement.
 */

import React from 'react';
import { RefreshCw } from 'lucide-react';

import { useFleetKpis } from '@/hooks/useFleetKpis';
import type { Kpi } from '@/lib/analytics/kpi';
import type { ExposureWindow } from '@/lib/analytics/kpi';
import { formatCo2, formatCount, formatInrCompact } from '@/lib/format/inr';

const MONO = "'IBM Plex Mono','JetBrains Mono',ui-monospace,monospace";

/** Render the display string for a tile, formatting by KPI kind. */
function displayFor(kpi: Kpi): string {
  if (!kpi.available || kpi.value === null) return 'NO DATA';
  switch (kpi.key) {
    case 'exposure':
      return formatInrCompact(kpi.value);
    case 'scope3':
      return formatCo2(kpi.value);
    case 'at_risk':
      return formatCount(kpi.value);
    default:
      return kpi.display;
  }
}

/** Chip printing the raw provenance token — matches the waybill treatment. */
function ProvChip({ token, measured }: { token: string; measured: boolean }) {
  return (
    <span
      style={{
        fontFamily: MONO,
        fontSize: 8.5,
        letterSpacing: '0.1em',
        lineHeight: 1,
        padding: '2px 4px',
        borderRadius: 2,
        border: measured ? '1px solid var(--cobalt)' : '1px solid var(--border-hairline)',
        color: measured ? 'var(--cobalt)' : '#5A5D66',
        whiteSpace: 'nowrap',
      }}
    >
      {token}
    </span>
  );
}

function Tile({ kpi, alarm }: { kpi: Kpi; alarm?: boolean }) {
  const value = displayFor(kpi);
  const dead = !kpi.available;
  const measured = kpi.provenance === 'REAL' || kpi.provenance === 'CALIBRATED';

  return (
    <div
      data-kpi={kpi.key}
      title={`${kpi.label} — ${kpi.source}`}
      style={{
        flex: '1 1 0',
        minWidth: 0,
        padding: '8px 14px',
        borderRight: '1px solid var(--border-hairline)',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 9,
            letterSpacing: '0.14em',
            color: '#5A5D66',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {kpi.label}
        </span>
        <ProvChip token={kpi.provenance} measured={measured} />
      </div>

      <div
        style={{
          fontFamily: MONO,
          fontSize: dead ? 15 : 22,
          lineHeight: 1.1,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: dead ? '#9A9DA6' : alarm ? 'var(--cobalt)' : 'var(--ink)',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </div>

      <div
        style={{
          fontFamily: MONO,
          fontSize: 9,
          color: '#5A5D66',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {kpi.detail}
      </div>
    </div>
  );
}

export interface KpiBandProps {
  /** Financial window feeding the exposure tile. */
  window?: ExposureWindow;
  /** Poll cadence in ms; 0 disables. */
  pollMs?: number;
  className?: string;
}

export default function KpiBand({ window = 'month', pollMs = 30_000, className }: KpiBandProps) {
  const { kpis, loading, error, unauthenticated, updatedAt, refresh } = useFleetKpis(window, pollMs);

  const atRiskAlarm = (kpis.atRisk.value ?? 0) > 0;

  return (
    <div
      data-testid="kpi-band"
      className={className}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        background: 'var(--paper)',
        borderBottom: '1px solid var(--border-hairline)',
        borderTop: '1px solid var(--border-hairline)',
      }}
    >
      <Tile kpi={kpis.onTime} />
      <Tile kpi={kpis.exposure} />
      <Tile kpi={kpis.atRisk} alarm={atRiskAlarm} />
      <Tile kpi={kpis.scope3} />

      {/* Right-hand context strip: fleet state + freshness */}
      <div
        style={{
          flex: '0 0 auto',
          padding: '8px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          justifyContent: 'center',
          minWidth: 164,
        }}
      >
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.14em', color: '#5A5D66' }}>
          FLEET
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
          {kpis.fleet.available
            ? `${kpis.fleet.inTransit} in transit · ${kpis.fleet.openAlerts} alerts`
            : 'NO DATA'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: MONO, fontSize: 9, color: '#5A5D66' }}>
            {unauthenticated
              ? 'sign in required'
              : error
                ? error
                : loading
                  ? 'loading…'
                  : updatedAt
                    ? `as of ${updatedAt.toLocaleTimeString('en-GB', { hour12: false })}`
                    : '—'}
          </span>
          <button
            type="button"
            onClick={refresh}
            aria-label="Refresh KPIs"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 18,
              height: 18,
              border: '1px solid var(--border-hairline)',
              borderRadius: 2,
              background: 'var(--paper)',
              color: '#5A5D66',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}
