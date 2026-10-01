'use client';

/**
 * OPERATOR PULSE — control-tower micro-insights strip (bottom-right of the map).
 * Sits to the left of the AI Copilot trigger pill (right-[180px]).
 * Three distinct reads NOT duplicated in the top KpiBand:
 *   EXCEPTIONS       open alerts, worst severity, ₹ stake    (/api/alerts?status=OPEN)
 *   DEMURRAGE · 30D  incurred this month + charged count     (/api/analytics/scorecard rows)
 *   MODAL DISPATCH   breakdown across Sea, Air, and Road     (/api/analytics/summary)
 *
 * Law: paper 0.95 cards, hairlines, mono numerals, ₹ helpers, radii 2-4.
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getAlerts,
  getAnalyticsScorecard,
  getAnalyticsSummary,
  hasToken,
} from '@/lib/nexafreight/client';
import type {
  Alert,
  AnalyticsFinancialResponse,
  AnalyticsSummaryResponse,
} from '@/lib/nexafreight/types';
import { formatInrCompact, usdToInr } from '@/lib/format/inr';

function withTimeout<T>(p: Promise<T>, ms = 12000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('TIMEOUT — backend unreachable')), ms)),
  ]);
}

const INK = '#16181D';
const COBALT = '#2547C8';
const HAIR = '#D4D5D0';
const MUTED = '#4B515D';
const GHOST = '#797E8B';
const GREEN = '#027A48';
const AMBER = '#B54708';
const RED = '#B42318';

function Card({
  label,
  value,
  sub,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left transition-colors hover:border-[var(--cobalt)]"
      style={{
        pointerEvents: 'auto',
        cursor: onClick ? 'pointer' : 'default',
        background: 'rgba(246, 247, 244, 0.95)',
        border: `1px solid ${HAIR}`,
        borderRadius: 3,
        padding: '8px 12px',
        minWidth: 156,
        maxWidth: 200,
        fontFamily: 'var(--font-mono)',
        boxShadow: 'none',
      }}
      title={`${label} — click to inspect`}
    >
      <div style={{ fontSize: 8.5, letterSpacing: '0.14em', color: GHOST, marginBottom: 3 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: tone ?? INK,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 9,
            color: MUTED,
            letterSpacing: '0.05em',
            marginTop: 2,
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {sub}
        </div>
      )}
    </button>
  );
}

export default function OperatorInsightsStrip() {
  const router = useRouter();
  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [score, setScore] = useState<AnalyticsFinancialResponse | null>(null);
  const [unauthenticated, setUnauthenticated] = useState(false);

  const load = useCallback(async () => {
    if (!hasToken()) {
      setUnauthenticated(true);
      return;
    }
    setUnauthenticated(false);
    const [rSummary, rAlerts, rScore] = await Promise.allSettled([
      withTimeout(getAnalyticsSummary()),
      withTimeout(getAlerts({ status: 'OPEN' })),
      withTimeout(getAnalyticsScorecard()),
    ]);
    setSummary(rSummary.status === 'fulfilled' ? rSummary.value : null);
    setAlerts(rAlerts.status === 'fulfilled' ? rAlerts.value.alerts : null);
    setScore(rScore.status === 'fulfilled' ? rScore.value : null);
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => {
      void load();
    }, 60_000);
    return () => clearInterval(t);
  }, [load]);

  // Auth hydration race fix: retry after 1s if unauthenticated
  useEffect(() => {
    if (!unauthenticated) return;
    const retry = setTimeout(() => {
      void load();
    }, 1000);
    return () => clearTimeout(retry);
  }, [unauthenticated, load]);

  // Listen for auth_success events
  useEffect(() => {
    const handler = () => {
      void load();
    };
    if (typeof globalThis.window !== 'undefined') {
      globalThis.window.addEventListener('nexafreight:auth_success', handler);
      return () => globalThis.window.removeEventListener('nexafreight:auth_success', handler);
    }
  }, [load]);

  if (!summary && !alerts && !score) return null;

  // 1. EXCEPTIONS (Alert incident count, severity & stake — links to /alerts)
  const open = alerts ?? [];
  const rank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const worstSev = open.reduce<string>((w, a) => ((rank[a.severity] ?? 0) > (rank[w] ?? 0) ? a.severity : w), '');
  const exposure = open.reduce((s, a) => s + (a.financial_exposure || 0), 0);
  const excTone = worstSev === 'CRITICAL' || worstSev === 'HIGH' ? RED : open.length ? AMBER : GREEN;

  // 2. DEMURRAGE (Real realized container detention charges — links to /insights)
  const fRows = score?.rows ?? [];
  const demRows = fRows.filter((r) => (r.demurrage_usd || 0) > 0);
  const demTotal = demRows.reduce((s, r) => s + (r.demurrage_usd || 0), 0);

  // 3. MODAL DISPATCH (Breakdown across active transport modes — links to /shipments)
  const shipList = summary?.shipments ?? [];
  let seaCount = 0;
  let airCount = 0;
  let roadCount = 0;
  for (const s of shipList) {
    const m = (s.mode || '').toUpperCase();
    if (m === 'SEA' || m === 'OCEAN') seaCount++;
    else if (m === 'AIR') airCount++;
    else if (m === 'ROAD' || m === 'RAIL') roadCount++;
  }
  const hasModes = seaCount + airCount + roadCount > 0;

  return (
    <div
      className="absolute bottom-4 right-[180px] z-[1035] hidden md:flex items-stretch gap-2 select-none"
      style={{ pointerEvents: 'none' }}
      aria-label="Operator pulse — live operational insights"
    >
      <div className="flex items-center" style={{ pointerEvents: 'auto', paddingRight: 2 }}>
        <span
          className="flex items-center"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontFamily: 'var(--font-mono)',
            fontSize: 8.5,
            letterSpacing: '0.22em',
            color: GHOST,
            borderRight: `1px solid ${HAIR}`,
            paddingRight: 6,
          }}
        >
          OPERATOR PULSE
        </span>
      </div>

      <Card
        label="EXCEPTIONS · OPEN"
        value={open.length ? `${open.length} OPEN` : 'CLEAR'}
        sub={
          open.length
            ? `WORST ${worstSev || '—'} · ${formatInrCompact(usdToInr(exposure))} AT STAKE`
            : 'NO OPEN ALERTS'
        }
        tone={excTone}
        onClick={() => router.push('/alerts')}
      />

      <Card
        label="DEMURRAGE · 30D"
        value={demTotal ? formatInrCompact(usdToInr(demTotal)) : '₹0'}
        sub={demRows.length ? `${demRows.length} SHIPMENTS CHARGED` : 'NO DEMURRAGE CHARGES'}
        tone={demTotal ? AMBER : GREEN}
        onClick={() => router.push('/insights')}
      />

      <Card
        label="MODAL DISPATCH"
        value={hasModes ? `${seaCount} SEA · ${airCount} AIR · ${roadCount} ROAD` : `${summary?.total_shipments ?? 0} ACTIVE`}
        sub={`${summary?.in_transit ?? 0} IN TRANSIT · ${summary?.delivered ?? 0} DELIVERED`}
        tone={COBALT}
        onClick={() => router.push('/shipments')}
      />
    </div>
  );
}
