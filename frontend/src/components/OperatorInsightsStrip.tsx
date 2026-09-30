'use client';

/**
 * OPERATOR PULSE — control-tower micro-insights strip (bottom-right of the map).
 * Four small, genuinely useful reads derived from REAL endpoints only:
 *   SLA PULSE        on-time share + worst slip            (/api/analytics/sla)
 *   EXCEPTIONS       open alerts, worst severity, ₹ stake  (/api/alerts?status=OPEN)
 *   DEMURRAGE        incurred this month + charged count   (/api/analytics/scorecard rows)
 *   PENDING EXPOSURE month undecided SLA/demurrage ₹ est  (scorecard.month)
 * Renders nothing when the feeds are absent — the strip must never block the map.
 * Law: paper 0.95 cards, hairlines, mono numerals, ₹ helpers, radii 2-4.
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAlerts, getAnalyticsSla, getAnalyticsScorecard } from '@/lib/nexafreight/client';
import type { Alert, AnalyticsFinancialResponse, AnalyticsSlaResponse } from '@/lib/nexafreight/types';
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

function Card({ label, value, sub, tone, onClick }: {
  label: string; value: string; sub?: string; tone?: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left"
      style={{
        pointerEvents: 'auto', cursor: onClick ? 'pointer' : 'default',
        background: 'rgba(246, 247, 244, 0.95)', border: `1px solid ${HAIR}`,
        borderRadius: 3, padding: '8px 12px', minWidth: 168, maxWidth: 216,
        fontFamily: 'var(--font-mono)', boxShadow: 'none',
      }}
      title={`${label} — from live operations feeds`}
    >
      <div style={{ fontSize: 8.5, letterSpacing: '0.14em', color: GHOST, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: tone ?? INK, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 9, color: MUTED, letterSpacing: '0.05em', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
          {sub}
        </div>
      )}
    </button>
  );
}

export default function OperatorInsightsStrip() {
  const router = useRouter();
  const [sla, setSla] = useState<AnalyticsSlaResponse | null>(null);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [score, setScore] = useState<AnalyticsFinancialResponse | null>(null);

  const load = useCallback(async () => {
    const [rSla, rAlerts, rScore] = await Promise.allSettled([
      withTimeout(getAnalyticsSla()),
      withTimeout(getAlerts({ status: 'OPEN' })),
      withTimeout(getAnalyticsScorecard()),
    ]);
    setSla(rSla.status === 'fulfilled' ? rSla.value : null);
    setAlerts(rAlerts.status === 'fulfilled' ? rAlerts.value.alerts : null);
    setScore(rScore.status === 'fulfilled' ? rScore.value : null);
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => { void load(); }, 60_000);
    return () => clearInterval(t);
  }, [load]);

  if (!sla && !alerts && !score) return null;

  // SLA PULSE
  const rows = sla?.rows ?? [];
  const total = rows.length;
  const onTime = rows.filter((r) => r.sla_status === 'ON_TIME').length;
  const slips = rows.map((r) => r.delay_days ?? 0).filter((d) => d > 0);
  const worstSlip = slips.length ? Math.max(...slips) : 0;
  const slaPct = total ? Math.round((onTime / total) * 100) : null;
  const slaTone = slaPct == null ? GHOST : slaPct >= 90 ? GREEN : slaPct >= 75 ? AMBER : RED;

  // EXCEPTIONS
  const open = alerts ?? [];
  const rank: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const worstSev = open.reduce<string>((w, a) => ((rank[a.severity] ?? 0) > (rank[w] ?? 0) ? a.severity : w), '');
  const exposure = open.reduce((s, a) => s + (a.financial_exposure || 0), 0);
  const excTone = worstSev === 'CRITICAL' || worstSev === 'HIGH' ? RED : open.length ? AMBER : GREEN;

  // DEMURRAGE + PENDING (real P&L rows, USD → ₹)
  const fRows = score?.rows ?? [];
  const demRows = fRows.filter((r) => (r.demurrage_usd || 0) > 0);
  const demTotal = demRows.reduce((s, r) => s + (r.demurrage_usd || 0), 0);
  const pending = score?.month?.undecided_total_pending_est ?? null;

  return (
    <div
      className="absolute bottom-4 right-4 z-[1035] hidden md:flex items-stretch gap-2 select-none"
      style={{ pointerEvents: 'none' }}
      aria-label="Operator pulse — live operational insights"
    >
      <div className="flex items-center" style={{ pointerEvents: 'auto', paddingRight: 2 }}>
        <span
          className="flex items-center"
          style={{
            writingMode: 'vertical-rl', transform: 'rotate(180deg)',
            fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.22em',
            color: GHOST, borderRight: `1px solid ${HAIR}`, paddingRight: 6,
          }}
        >
          OPERATOR PULSE
        </span>
      </div>
      <Card
        label="SLA PULSE · ALL"
        value={slaPct == null ? '—' : `${slaPct}% ON TIME`}
        sub={total ? `${onTime}/${total} LANES · WORST +${worstSlip} D` : 'FEED EMPTY'}
        tone={slaTone}
        onClick={() => router.push('/insights')}
      />
      <Card
        label="EXCEPTIONS · OPEN"
        value={open.length ? `${open.length} OPEN` : 'CLEAR'}
        sub={open.length ? `WORST ${worstSev || '—'} · ${formatInrCompact(usdToInr(exposure))} AT STAKE` : 'NO OPEN ALERTS'}
        tone={excTone}
        onClick={() => router.push('/alerts')}
      />
      <Card
        label="DEMURRAGE · 30D"
        value={demTotal ? formatInrCompact(usdToInr(demTotal)) : '—'}
        sub={demRows.length ? `${demRows.length} SHIPMENTS CHARGED` : 'NO CHARGES INCURRED'}
        tone={demTotal ? AMBER : GREEN}
        onClick={() => router.push('/insights')}
      />
      <Card
        label="PENDING EXPOSURE · MONTH"
        value={pending == null ? '—' : formatInrCompact(usdToInr(pending))}
        sub="UNDECIDED SLA + DEMURRAGE EST"
        tone={INK}
        onClick={() => router.push('/insights')}
      />
    </div>
  );
}
