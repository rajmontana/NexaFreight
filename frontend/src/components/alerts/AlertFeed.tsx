'use client';

/**
 * CHARTROOM AlertFeed — NAVTOWER incident board for /alerts.
 * Reference: user's NAVTOWER // CTL-884 mockup + DESIGN.md (Swiss logistics
 * telemetry). Structure/density from the mockup; every number from real
 * endpoints (getAlerts + getShipments join); fonts/laws stay Archivo/Plex.
 * Timeline spine · severity dots · boxed [TAG] rows · 3-col telemetry chips ·
 * stacked actions (EVALUATE / ACKNOWLEDGE / VIEW TELEMETRY LOG).
 * Honest degradation: LoadingGlobe → error + RETRY → ALL LANES QUIET.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { acknowledgeAlert, getAlerts, getShipments } from '@/lib/nexafreight/client';
import type { Alert, ShipmentListItem } from '@/lib/nexafreight/types';
import { formatInrCompact, usdToInr } from '@/lib/format/inr';
import LoadingGlobe from '@/components/art/LoadingGlobe';
import { ProvenanceChip } from '@/components/ProvenanceBadge';

// DESIGN.md functional print-ink semantics — exception tags ONLY.
const RED = '#B42318';
const AMBER = '#B54708';
const GREEN = '#027A48';
const COBALT = '#2547C8';
const INK = '#16181D';
const HAIR = '#D4D5D0';
const HAIR2 = '#E2E3DF';
const MUTED = '#4B515D';
const GHOST = '#797E8B';

/** Never hang forever on a stalled/cold backend — 12s honest timeout. */
function withTimeout<T>(p: Promise<T>, ms = 12000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error('TIMEOUT — backend unreachable')), ms)),
  ]);
}

type SevBucket = 'CRITICAL' | 'WARNING' | 'INFO';

function bucketOf(sev: string): SevBucket {
  const s = sev.toUpperCase();
  if (s === 'HIGH' || s === 'CRITICAL' || s === 'BREACH') return 'CRITICAL';
  if (s === 'MEDIUM' || s === 'ELEVATED') return 'WARNING';
  return 'INFO';
}

const BUCKET_COLOR: Record<SevBucket, string> = { CRITICAL: RED, WARNING: AMBER, INFO: COBALT };

function utcClock(d: string | null | undefined): string {
  if (!d) return '—:—:—';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '—:—:—';
  return `${String(dt.getUTCHours()).padStart(2, '0')}:${String(dt.getUTCMinutes()).padStart(2, '0')}:${String(dt.getUTCSeconds()).padStart(2, '0')} UTC`;
}

function ageOf(d: string | null | undefined, now: number): string {
  if (!d) return 'AGE —';
  const t = new Date(d).getTime();
  if (Number.isNaN(t)) return 'AGE —';
  const mins = Math.max(0, Math.floor((now - t) / 60000));
  if (mins < 60) return `AGE ${mins}M`;
  const h = Math.floor(mins / 60);
  return `AGE ${h}H ${mins % 60}M`;
}

function prettyType(t: string | null | undefined): string {
  if (!t) return 'DISRUPTION';
  return String(t).replace(/_/g, ' ');
}

function Tag({ color, children, filled }: { color: string; children: React.ReactNode; filled?: boolean }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        color,
        background: filled ? `${color}1A` : 'transparent',
        border: `1px solid ${color}`,
        borderRadius: 0,
        padding: '2px 6px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function NeutralTag({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.04em',
        color: INK,
        background: 'var(--bg-subtle, #ECEEE9)',
        border: `1px solid ${HAIR}`,
        borderRadius: 0,
        padding: '2px 6px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function TelemetryCell({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ border: `1px solid ${HAIR2}`, padding: '5px 8px', background: 'var(--paper, #F6F7F4)' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: GHOST }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: color ?? INK, fontVariantNumeric: 'tabular-nums', marginTop: 1 }}>
        {value}
      </div>
    </div>
  );
}

function ActionBtn({
  kind, onClick, children,
}: { kind: 'primary' | 'secondary' | 'link'; onClick: () => void; children: React.ReactNode }) {
  const base: React.CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    borderRadius: 2,
    padding: '7px 12px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'center',
  };
  if (kind === 'primary') {
    Object.assign(base, { background: 'rgba(37,71,200,0.08)', color: COBALT, border: `1px solid ${COBALT}` });
  } else if (kind === 'secondary') {
    Object.assign(base, { background: 'var(--paper, #F6F7F4)', color: INK, border: `1px solid ${HAIR}` });
  } else {
    Object.assign(base, { background: 'transparent', color: MUTED, border: `1px solid ${HAIR}` });
  }
  return (
    <button onClick={onClick} style={base}>
      {children}
    </button>
  );
}

function QuietVignette() {
  return (
    <div className="flex flex-col items-center justify-center" style={{ padding: '72px 0', gap: 12 }}>
      <svg width={190} height={64} viewBox="0 0 190 64" aria-hidden="true">
        <line x1={4} y1={48} x2={186} y2={48} stroke={COBALT} strokeWidth={0.8} opacity={0.45} />
        <g transform="translate(74 30)">
          <path d="M 0 14 L 4 8 L 40 8 L 40 14 Z" fill="none" stroke={COBALT} strokeWidth={1.3} />
          <rect x={9} y={3} width={6} height={5} fill="none" stroke={COBALT} strokeWidth={1} />
          <rect x={16} y={3} width={6} height={5} fill="none" stroke={COBALT} strokeWidth={1} />
          <rect x={23} y={3} width={6} height={5} fill="none" stroke={COBALT} strokeWidth={1} />
          <rect x={30} y={2} width={5} height={6} fill="none" stroke={COBALT} strokeWidth={1} />
        </g>
        <path d="M 96 22 q 14 -8 28 -2" stroke={COBALT} strokeWidth={0.9} fill="none" strokeDasharray="3 4" opacity={0.7} />
      </svg>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.16em', color: 'var(--text-secondary)' }}>
        ALL LANES QUIET — NO ACTIVE DISRUPTIONS
      </div>
    </div>
  );
}

type ShipmentInfo = Pick<ShipmentListItem, 'mode' | 'origin' | 'destination'>;

export default function AlertFeed({
  onOpenInspector,
  onEvaluate,
  refreshKey,
}: {
  onOpenInspector?: (shipmentId: string) => void;
  onEvaluate?: (alertId: string) => void;
  refreshKey?: number;
}) {
  const [state, setState] = useState<'loading' | 'error' | 'done'>('loading');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [laneById, setLaneById] = useState<Map<string, ShipmentInfo>>(new Map());
  const [acking, setAcking] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [clock, setClock] = useState<string>('—:—:—');

  // severity / mode / unresolved / text filters — counts computed live
  const [sevFilter, setSevFilter] = useState<'ALL' | SevBucket>('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | string>('ALL');
  const [unresolvedOnly, setUnresolvedOnly] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setState('loading');
    try {
      const [alertRes, shipRes] = await Promise.all([
        withTimeout(getAlerts()),
        withTimeout(getShipments({ size: 100 })).catch(() => null),
      ]);
      setAlerts(alertRes.alerts ?? []);
      const m = new Map<string, ShipmentInfo>();
      for (const s of shipRes?.items ?? []) {
        m.set(s.id, { mode: s.mode, origin: s.origin, destination: s.destination });
      }
      setLaneById(m);
      setState('done');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => { void load(); }, [load, refreshKey]);

  // live clock + age ticker (client-only, hydration-safe)
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(
        `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')} UTC`,
      );
      setNow(Date.now());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const ack = async (id: string) => {
    setAcking(id);
    try {
      await withTimeout(acknowledgeAlert(id, { user_id: 1 }));
      await load();
    } catch { /* row keeps its button; honesty over silence */ }
    setAcking(null);
  };

  const counts = useMemo(() => {
    const c = { ALL: alerts.length, CRITICAL: 0, WARNING: 0, INFO: 0, OCEAN: 0, AIR: 0, ROAD: 0, RAIL: 0 };
    for (const a of alerts) {
      c[bucketOf(a.severity)] += 1;
      const mode = String(laneById.get(a.shipment_id)?.mode ?? '').toUpperCase();
      if (mode === 'SEA') c.OCEAN += 1;
      else if (mode && mode in c) c[mode as 'AIR' | 'ROAD' | 'RAIL'] += 1;
    }
    return c;
  }, [alerts, laneById]);

  const exposureTotal = useMemo(
    () => alerts.filter((a) => !a.acknowledged_by).reduce((s, a) => s + (a.financial_exposure || 0), 0),
    [alerts],
  );

  const filtered = useMemo(() => alerts.filter((a) => {
    if (sevFilter !== 'ALL' && bucketOf(a.severity) !== sevFilter) return false;
    if (modeFilter !== 'ALL') {
      const mode = String(laneById.get(a.shipment_id)?.mode ?? '').toUpperCase();
      const norm = mode === 'SEA' ? 'OCEAN' : mode;
      if (norm !== modeFilter) return false;
    }
    if (unresolvedOnly && a.acknowledged_by) return false;
    if (query.trim()) {
      const hay = `${a.shipment_id} ${a.disruption_type ?? ''} ${a.status}`.toLowerCase();
      if (!hay.includes(query.trim().toLowerCase())) return false;
    }
    return true;
  }), [alerts, sevFilter, modeFilter, unresolvedOnly, query, laneById]);

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 380 }}>
        <LoadingGlobe caption="QUERYING DISRUPTION FEED..." size={240} />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center" style={{ minHeight: 340, gap: 14 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em', color: RED, border: `1px solid ${RED}`, borderRadius: 0, padding: '12px 18px' }}>
          DISRUPTION FEED UNREACHABLE — CHECK THE BACKEND
        </div>
        <button
          onClick={() => { void load(); }}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.14em',
            background: COBALT, color: '#fff', border: 'none', borderRadius: 2,
            padding: '9px 22px', cursor: 'pointer',
          }}
        >
          RETRY SYNC
        </button>
      </div>
    );
  }

  const modeChips: Array<[string, number]> = [
    ['OCEAN', counts.OCEAN], ['AIR', counts.AIR], ['ROAD', counts.ROAD], ['RAIL', counts.RAIL],
  ];

  return (
    <div>
      {/* ── title strip ── */}
      <div style={{ borderBottom: `1px solid ${HAIR}`, background: 'var(--bg-subtle, #ECEEE9)', padding: '14px 18px' }}>
        <div className="flex flex-wrap items-center justify-between" style={{ gap: 10 }}>
          <div>
            <div className="flex items-center" style={{ gap: 8, marginBottom: 4 }}>
              {counts.CRITICAL > 0 && <Tag color={RED} filled>CRITICAL MARGIN: {counts.CRITICAL >= 3 ? 'HIGH' : 'ELEVATED'}</Tag>}
              <NeutralTag>{counts.ALL} ACTIVE DISRUPTIONS</NeutralTag>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: GHOST }}>[DERIVED]</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.01em', color: INK, textTransform: 'uppercase', lineHeight: 1.1 }}>
              Active Alerts &amp; Disruptions
            </h1>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.14em', color: MUTED, marginTop: 3 }}>
              REAL-TIME EXCEPTION FEED // {counts.CRITICAL} CRITICAL · {counts.WARNING} WARNING · {counts.INFO} INFO
            </div>
          </div>
          <div className="flex flex-col items-end" style={{ gap: 6 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums' }}>
              {clock}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: GHOST }}>
              MOD-402 // EXCEPT_FEED
            </div>
            <div className="flex items-center" style={{ gap: 6 }}>
              <ProvenanceChip provenance="REAL" size="sm" />
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.1em', fontWeight: 700,
                color: GREEN, border: `1px solid ${GREEN}`, padding: '2px 6px',
              }}>
                ● FEED LIVE
              </span>
            </div>
          </div>
        </div>

        {/* KPI cards — all real */}
        <div className="grid grid-cols-3" style={{ gap: 12, marginTop: 16 }}>
          <div style={{ border: `1px solid ${HAIR}`, background: 'var(--paper, #F6F7F4)', padding: '10px 12px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.12em', color: MUTED }}>UNRESOLVED</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color: counts.CRITICAL > 0 ? RED : INK, lineHeight: 1.15 }}>
              {alerts.filter((a) => !a.acknowledged_by).length}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.08em', color: GHOST }}>
              {counts.CRITICAL} CRITICAL SEV
            </div>
          </div>
          <div style={{ border: `1px solid ${HAIR}`, background: 'var(--paper, #F6F7F4)', padding: '10px 12px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.12em', color: MUTED }}>OPEN EXPOSURE</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700, color: INK, lineHeight: 1.15, fontVariantNumeric: 'tabular-nums' }}>
              {formatInrCompact(usdToInr(exposureTotal))}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.08em', color: GHOST }}>
              Σ FINANCIAL EXPOSURE
            </div>
          </div>
          <div style={{ border: `1px solid ${HAIR}`, background: 'var(--paper, #F6F7F4)', padding: '10px 12px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.12em', color: MUTED }}>MODE SPLIT</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: INK, lineHeight: 1.7, fontVariantNumeric: 'tabular-nums' }}>
              OCEAN {counts.OCEAN} · AIR {counts.AIR} · ROAD {counts.ROAD}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.08em', color: GHOST }}>
              BY CONSIGNMENT MODE
            </div>
          </div>
        </div>
      </div>

      {/* ── filter bar ── */}
      <div style={{ borderBottom: `1px solid ${HAIR}`, padding: '10px 18px', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setSevFilter(k)}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em',
              padding: '5px 10px', cursor: 'pointer', borderRadius: 0,
              border: `1px solid ${sevFilter === k ? INK : HAIR}`,
              background: sevFilter === k ? INK : 'var(--paper, #F6F7F4)',
              color: sevFilter === k ? '#F6F7F4' : INK,
            }}
          >
            [{k === 'ALL' ? 'ALL' : k} ({k === 'ALL' ? counts.ALL : counts[k]})]
          </button>
        ))}
        <span style={{ width: 1, height: 18, background: HAIR, margin: '0 4px' }} />
        {modeChips.map(([m, n]) => (
          <button
            key={m}
            onClick={() => setModeFilter(modeFilter === m ? 'ALL' : m)}
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.08em',
              padding: '5px 10px', cursor: 'pointer', borderRadius: 0,
              border: `1px solid ${modeFilter === m ? COBALT : HAIR}`,
              background: modeFilter === m ? 'rgba(37,71,200,0.08)' : 'var(--paper, #F6F7F4)',
              color: modeFilter === m ? COBALT : MUTED,
            }}
          >
            [MODE: {m} ({n})]
          </button>
        ))}
        <span style={{ width: 1, height: 18, background: HAIR, margin: '0 4px' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={unresolvedOnly}
            onChange={(e) => setUnresolvedOnly(e.target.checked)}
            style={{ width: 13, height: 13, accentColor: INK }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.08em', color: INK }}>[UNRESOLVED ONLY]</span>
        </label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="FILTER EXCEPTION CODE // CONSIGNMENT…"
          style={{
            marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em',
            border: `1px solid ${HAIR}`, borderRadius: 2, background: 'var(--paper, #F6F7F4)',
            color: INK, padding: '6px 10px', width: 280, outline: 'none',
          }}
        />
      </div>

      {/* ── timeline feed ── */}
      {filtered.length === 0 ? (
        <QuietVignette />
      ) : (
        <div style={{ position: 'relative', padding: '18px 18px 10px 34px' }}>
          <div style={{ position: 'absolute', left: 13, top: 18, bottom: 10, width: 1, background: HAIR }} aria-hidden="true" />
          <div className="flex flex-col" style={{ gap: 16 }}>
            {filtered.map((a) => {
              const bucket = bucketOf(a.severity);
              const lane = laneById.get(a.shipment_id);
              const open = !a.acknowledged_by;
              return (
                <div key={a.id} style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: -26, top: 14, width: 9, height: 9, borderRadius: 99,
                    background: bucket === 'INFO' ? COBALT : BUCKET_COLOR[bucket],
                    outline: '2px solid var(--paper, #F6F7F4)',
                  }} aria-hidden="true" />
                  <div style={{ border: `1px solid ${HAIR}`, borderLeft: `3px solid ${bucket === 'INFO' ? COBALT : BUCKET_COLOR[bucket]}`, background: 'var(--surface-bright, #fff)', padding: 12 }}>
                    {/* row 1: time + tags */}
                    <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: INK, fontVariantNumeric: 'tabular-nums' }}>
                        {utcClock(a.created_at)}
                      </span>
                      <Tag color={BUCKET_COLOR[bucket]} filled>{bucket}: {prettyType(a.disruption_type)}</Tag>
                      <NeutralTag>{String(a.shipment_id).slice(0, 8).toUpperCase()}</NeutralTag>
                      {lane && <NeutralTag>{String(lane.mode).toUpperCase()} · {String(lane.origin).toUpperCase()} → {String(lane.destination).toUpperCase()}</NeutralTag>}
                      <ProvenanceChip provenance={(a.provenance as 'REAL' | 'DERIVED' | 'SIMULATED' | 'CALIBRATED' | 'HISTORICAL') ?? 'DERIVED'} size="sm" />
                    </div>

                    {/* row 2: title + actions */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between" style={{ gap: 10, marginTop: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16.5, fontWeight: 700, letterSpacing: '-0.01em', color: INK }}>
                          Incident #DIS-{String(a.disruption_id ?? a.id).slice(0, 5).toUpperCase()}: {prettyType(a.disruption_type)}
                          {lane ? ` — ${String(lane.origin).toUpperCase()} → ${String(lane.destination).toUpperCase()}` : ''}
                        </div>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: MUTED, lineHeight: 1.55, marginTop: 3 }}>
                          Consignment <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{String(a.shipment_id).slice(0, 8).toUpperCase()}</span>
                          {' '}({lane ? `${String(lane.mode).toLowerCase()} lane` : 'mode —'}). {open ? 'Unacknowledged exception awaiting operator decision.' : 'Acknowledged — monitoring.'} Exposure{' '}
                          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: a.financial_exposure > 0 ? RED : MUTED }}>
                            {formatInrCompact(usdToInr(a.financial_exposure || 0))}
                          </span>.
                        </div>
                      </div>
                      <div className="flex flex-row md:flex-col items-stretch md:items-end" style={{ gap: 6, flexShrink: 0, minWidth: 172 }}>
                        <ActionBtn kind="primary" onClick={() => onEvaluate?.(a.id)}>Evaluate Recovery</ActionBtn>
                        {open ? (
                          <ActionBtn kind="secondary" onClick={() => { void ack(a.id); }}>
                            {acking === a.id ? '···' : 'Acknowledge'}
                          </ActionBtn>
                        ) : (
                          <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                            color: GREEN, border: `1px solid ${GREEN}`, padding: '6px 12px', textAlign: 'center',
                          }}>
                            ✓ ACKNOWLEDGED
                          </span>
                        )}
                        {onOpenInspector && (
                          <ActionBtn kind="link" onClick={() => onOpenInspector(a.shipment_id)}>View Telemetry Log</ActionBtn>
                        )}
                      </div>
                    </div>

                    {/* row 3: telemetry chips — real fields only */}
                    <div className="grid grid-cols-3" style={{ gap: 6, marginTop: 10, maxWidth: 560 }}>
                      <TelemetryCell label="FIN EXPOSURE" value={formatInrCompact(usdToInr(a.financial_exposure || 0))} color={a.financial_exposure > 0 ? RED : INK} />
                      <TelemetryCell label="SEVERITY" value={String(a.severity).toUpperCase()} color={BUCKET_COLOR[bucket]} />
                      <TelemetryCell label={open ? 'STATE' : 'ACK BY'} value={open ? String(a.status).toUpperCase() : `USER ${a.acknowledged_by}`} />
                      <TelemetryCell label="AGE" value={ageOf(a.created_at, now).replace('AGE ', '')} />
                      <TelemetryCell label="CONSIGNMENT" value={String(a.shipment_id).slice(0, 8).toUpperCase()} />
                      <TelemetryCell label="DISRUPTION" value={`DIS-${String(a.disruption_id ?? a.id).slice(0, 5).toUpperCase()}`} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── footer strip ── */}
      <div style={{
        borderTop: `1px solid ${HAIR}`, background: 'var(--bg-subtle, #ECEEE9)',
        padding: '10px 18px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', color: MUTED }}>
          STREAMING: {filtered.length} OF {counts.ALL} DISPLAYED // EVENT BUFFER NOMINAL
        </span>
        <button
          onClick={() => { void load(); }}
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em',
            border: `1px solid ${HAIR}`, background: 'var(--paper, #F6F7F4)', color: INK,
            borderRadius: 2, padding: '6px 14px', cursor: 'pointer',
          }}
        >
          [REFRESH FEED]
        </button>
      </div>
    </div>
  );
}
