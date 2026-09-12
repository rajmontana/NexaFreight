'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ProvenanceBadge from './ProvenanceBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import {
  getAnalyticsEsg,
  getAnalyticsScorecard,
  getAnalyticsSla,
  getAnalyticsSummary,
  getDemandForecast,
  type AnalyticsEsgResponse,
  type AnalyticsFinancialResponse,
  type AnalyticsSlaResponse,
  type AnalyticsSummaryResponse,
  type DemandForecastSeriesPoint,
  type WindowSlice,
} from '@/lib/nexafreight';

export interface AnalyticsDashboardProps {
  openKey?: number;          // bump to reopen/refetch (keyboard 'g')
  onClose?: () => void;
  onOpenInspector?: (shipmentId: string) => void;
}

const TABS = ['Scorecard', 'Fleet', 'SLA risk', 'ESG'] as const;
type Tab = (typeof TABS)[number];

const fmtUsd = (n: number | null | undefined) =>
  n == null ? '—' : `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const fmtPct = (n: number | null | undefined) =>
  n == null ? '—' : `${(n * 100).toFixed(1)}%`;

/** Demand-forecast lanes that exist in the frozen model corpus. */
const SPARKLINE_LANES: Array<{ category: string; region: string; label: string }> = [
  { category: 'Computers', region: 'West Africa', label: 'Computers · W. Africa' },
  { category: 'Clothes', region: 'Western Europe', label: 'Clothes · W. Europe' },
  { category: 'Garden Tools', region: 'Central America', label: 'Garden Tools · C. America' },
];

function Sparkline({
  series,
  height = 40,
}: {
  series: DemandForecastSeriesPoint[];
  height?: number;
}) {
  if (series.length < 2) return null;
  const w = 220;
  const ys = series.map((p) => p.yhat);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const pts = series
    .map(
      (p, i) =>
        `${(i / (series.length - 1)) * w},${height - ((p.yhat - min) / span) * (height - 6) - 3}`,
    )
    .join(' ');
  const split = series.findIndex((p) => p.is_forecast);
  return (
    <svg width={w} height={height} aria-hidden="true">
      {split > 1 && <polyline points={pts.split(' ').slice(0, split + 1).join(' ')} fill="none" stroke="#006E9E" strokeWidth="1.6" />}
      {split >= 1 && <polyline points={pts.split(' ').slice(split).join(' ')} fill="none" stroke="#5AC8FA" strokeWidth="1.6" strokeDasharray="3 2" />}
      {split <= 0 && <polyline points={pts} fill="none" stroke="#5AC8FA" strokeWidth="1.6" strokeDasharray="3 2" />}
    </svg>
  );
}

export default function AnalyticsDashboard({
  openKey = 0,
  onClose,
  onOpenInspector,
}: AnalyticsDashboardProps) {
  const [tab, setTab] = useState<Tab>('Scorecard');
  const [scorecard, setScorecard] = useState<AnalyticsFinancialResponse | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [sla, setSla] = useState<AnalyticsSlaResponse | null>(null);
  const [esg, setEsg] = useState<AnalyticsEsgResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sparkError, setSparkError] = useState<string | null>(null);
  const [sparklines, setSparklines] = useState<Record<string, DemandForecastSeriesPoint[]>>({});

  const load = useCallback(async () => {
    setError(null);
    try {
      const [sc, su, sl, eg] = await Promise.all([
        getAnalyticsScorecard(),
        getAnalyticsSummary(),
        getAnalyticsSla(),
        getAnalyticsEsg(),
      ]);
      setScorecard(sc);
      setSummary(su);
      setSla(sl);
      setEsg(eg);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const loadSparklines = useCallback(async () => {
    setSparkError(null);
    for (const lane of SPARKLINE_LANES) {
      try {
        const res = await getDemandForecast(lane.category, lane.region, 90);
        if (res) {
          setSparklines((prev) => ({ ...prev, [lane.label]: res.series }));
        }
      } catch (err) {
        setSparkError(err instanceof Error ? err.message : String(err));
        return;
      }
    }
  }, []);

  useEffect(() => {
    void load();
    void loadSparklines();
  }, [load, loadSparklines, openKey]);

  const windows = useMemo(
    () => ([scorecard?.day, scorecard?.week, scorecard?.month].filter(Boolean) as WindowSlice[]),
    [scorecard],
  );

  return (
    <section
      aria-label="Analytics dashboard"
      style={{
        position: 'absolute',
        top: 56,
        left: 12,
        bottom: 12,
        width: 700,
        maxWidth: 'calc(100vw - 24px)',
        zIndex: 1055,
        background: 'rgba(8,14,24,0.96)',
        border: '1px solid rgba(148,163,184,0.3)',
        borderRadius: 12,
        color: '#E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(0,0,0,0.7)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          borderBottom: '1px solid rgba(148,163,184,0.15)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700 }}>Analytics</span>
        <ProvenanceBadge provenance="DERIVED" size="xs" title="Server-computed rollup" />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                background: tab === t ? 'rgba(0,110,158,0.4)' : 'transparent',
                color: tab === t ? '#E2E8F0' : '#94A3B8',
                border: '1px solid rgba(148,163,184,0.25)',
                borderRadius: 6,
                padding: '3px 10px',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close analytics"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                fontSize: 18,
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          )}
        </div>
      </header>

      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {error && (
          <div role="alert" style={{ fontSize: 12, color: '#FCA5A5' }}>
            Analytics backend offline: {error}
          </div>
        )}

        {!error && scorecard == null && (
          <div style={{ fontSize: 12, color: '#94A3B8' }}>Loading analytics…</div>
        )}

        {tab === 'Scorecard' && scorecard && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {windows.map((w) => (
                <div
                  key={w.period}
                  style={{
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: 10,
                    background: 'rgba(15,23,42,0.6)',
                    padding: 10,
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
                    Next {w.period === 'day' ? '24h' : w.period === 'week' ? '7d' : '30d'} ·{' '}
                    {w.shipments} shipments
                  </div>
                  <dl
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      rowGap: 4,
                      fontSize: 10,
                      margin: 0,
                    }}
                  >
                    <dt style={{ color: '#94A3B8' }}>Revenue</dt>
                    <dd style={{ margin: 0 }}>{fmtUsd(w.total_revenue)}</dd>
                    <dt style={{ color: '#94A3B8' }}>Shipping cost</dt>
                    <dd style={{ margin: 0 }}>{fmtUsd(w.total_shipping_cost)}</dd>
                    <dt style={{ color: '#94A3B8' }}>Decided margin</dt>
                    <dd style={{ margin: 0, color: '#34D399' }}>{fmtUsd(w.decided_margin)}</dd>
                    <dt style={{ color: '#94A3B8' }}>Undecided rev</dt>
                    <dd style={{ margin: 0 }}>{fmtUsd(w.undecided_revenue)}</dd>
                    <dt style={{ color: '#94A3B8' }}>Pending SLA est</dt>
                    <dd style={{ margin: 0, color: '#FCA5A5' }}>
                      {fmtUsd(w.undecided_pending_sla_est)}
                    </dd>
                    <dt style={{ color: '#94A3B8' }}>Pending demurrage</dt>
                    <dd style={{ margin: 0, color: '#FCA5A5' }}>
                      {fmtUsd(w.undecided_pending_demurrage_est)}
                    </dd>
                    <dt style={{ color: '#94A3B8' }}>Total pending</dt>
                    <dd style={{ margin: 0, color: '#FCA5A5' }}>
                      {fmtUsd(w.undecided_total_pending_est)}
                    </dd>
                  </dl>
                </div>
              ))}
            </div>

            
            {/* Recharts Financial Graph */}
            <div style={{ width: '100%', height: 250, marginBottom: 16 }}>
              <ResponsiveContainer>
                <BarChart data={scorecard.rows.slice(0, 15)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="shipment_id" tick={{ fill: '#94A3B8', fontSize: 10 }} tickFormatter={(val) => val.slice(0,6)} />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', borderColor: 'rgba(148,163,184,0.3)', color: '#fff' }}
                    itemStyle={{ fontSize: 12 }}
                    formatter={(val: any) => fmtUsd(val)} 
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="revenue_usd" name="Revenue" fill="#34D399" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total_costs_usd" name="Total Costs" fill="#FCA5A5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* P&L rail table */}

            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 10.5,
              }}
            >
              <thead>
                <tr style={{ textAlign: 'left', color: '#94A3B8' }}>
                  {['Shipment', 'Mode', 'Status', 'Revenue', 'Cost', 'Freight', 'SLA pen', 'Demurrage', 'Margin', 'Margin %'].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: '4px 6px',
                          borderBottom: '1px solid rgba(148,163,184,0.2)',
                          fontWeight: 600,
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {scorecard.rows.map((row) => (
                  <tr
                    key={row.shipment_id}
                    onClick={() => onOpenInspector?.(row.shipment_id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ padding: '4px 6px', color: '#5AC8FA' }}>
                      {row.shipment_id.slice(0, 8)}…
                    </td>
                    <td style={{ padding: '4px 6px' }}>{row.mode}</td>
                    <td style={{ padding: '4px 6px' }}>{row.status}</td>
                    <td style={{ padding: '4px 6px' }}>{fmtUsd(row.revenue_usd)}</td>
                    <td style={{ padding: '4px 6px' }}>{fmtUsd(row.total_costs_usd)}</td>
                    <td style={{ padding: '4px 6px' }}>{fmtUsd(row.freight_cost_usd)}</td>
                    <td style={{ padding: '4px 6px', color: row.sla_penalty_usd > 0 ? '#FCA5A5' : '#E2E8F0' }}>
                      {fmtUsd(row.sla_penalty_usd)}
                    </td>
                    <td style={{ padding: '4px 6px' }}>{fmtUsd(row.demurrage_usd)}</td>
                    <td
                      style={{
                        padding: '4px 6px',
                        color: row.margin_usd >= 0 ? '#34D399' : '#FCA5A5',
                      }}
                    >
                      {fmtUsd(row.margin_usd)}
                    </td>
                    <td style={{ padding: '4px 6px' }}>{fmtPct(row.margin_pct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'Fleet' && summary && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
                fontSize: 11,
              }}
            >
              {[
                ['Total', summary.total_shipments],
                ['In transit', summary.in_transit],
                ['Delivered', summary.delivered],
                ['Delayed', summary.delayed],
                ['SLA breaches', summary.sla_breach_count],
                ['Open alerts', summary.open_alerts],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: 8,
                    padding: 8,
                    background: 'rgba(15,23,42,0.6)',
                  }}
                >
                  <div style={{ color: '#94A3B8' }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>
              By status:{' '}
              {Object.entries(summary.summary_by_status)
                .map(([k, v]) => `${k} ${v}`)
                .join(' · ')}
            </div>

            {/* Demand sparklines (frozen 79-lane Prophet corpus) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {SPARKLINE_LANES.map((lane) => (
                <div
                  key={lane.label}
                  style={{
                    border: '1px solid rgba(148,163,184,0.2)',
                    borderRadius: 8,
                    padding: 8,
                    background: 'rgba(15,23,42,0.6)',
                  }}
                >
                  <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>
                    {lane.label}
                  </div>
                  {sparklines[lane.label] ? (
                    <Sparkline series={sparklines[lane.label]} />
                  ) : (
                    <div style={{ fontSize: 10, color: '#64748B', height: 40 }}>
                      {sparkError ? 'forecast unavailable' : 'loading…'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'SLA risk' && sla && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#94A3B8' }}>
                {['Shipment', 'SLA status', 'Days to deadline', 'Delay (d)', 'Disruption'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '4px 6px',
                      borderBottom: '1px solid rgba(148,163,184,0.2)',
                      fontWeight: 600,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sla.rows.map((row) => (
                <tr
                  key={row.shipment_id}
                  onClick={() => onOpenInspector?.(row.shipment_id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td style={{ padding: '4px 6px', color: '#5AC8FA' }}>
                    {row.shipment_id.slice(0, 8)}…
                  </td>
                  <td
                    style={{
                      padding: '4px 6px',
                      color:
                        row.sla_status === 'LATE'
                          ? '#FCA5A5'
                          : row.sla_status === 'AT_RISK'
                            ? '#FDE68A'
                            : '#34D399',
                    }}
                  >
                    {row.sla_status}
                  </td>
                  <td style={{ padding: '4px 6px' }}>
                    {row.days_to_deadline == null ? '—' : row.days_to_deadline.toFixed(1)}
                  </td>
                  <td style={{ padding: '4px 6px' }}>{row.delay_days ?? 0}</td>
                  <td style={{ padding: '4px 6px' }}>
                    {row.disruption_description ?? (row.disrupted ? 'disrupted' : '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'ESG' && esg && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, color: '#94A3B8' }}>
              Route breakdown:{' '}
              {Object.entries(esg.route_breakdown)
                .map(([k, v]) => `${k} ${v}`)
                .join(' · ')}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#94A3B8' }}>
                  {['Shipment', 'Mode', 'CO2 (kg)', 'CO2/container', 'vs air CO2 saving', 'vs air freight Δ'].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: '4px 6px',
                          borderBottom: '1px solid rgba(148,163,184,0.2)',
                          fontWeight: 600,
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {esg.rows.map((row) => (
                  <tr key={row.shipment_id}>
                    <td style={{ padding: '4px 6px', color: '#5AC8FA' }}>
                      {row.shipment_id.slice(0, 8)}…
                    </td>
                    <td style={{ padding: '4px 6px' }}>{row.mode}</td>
                    <td style={{ padding: '4px 6px' }}>
                      {row.kg_co2.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      {row.kg_co2e_per_container.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </td>
                    <td
                      style={{
                        padding: '4px 6px',
                        color: (row.vs_air_co2_saving_pct ?? 0) > 0 ? '#34D399' : '#FCA5A5',
                      }}
                    >
                      {row.vs_air_co2_saving_pct == null
                        ? '—'
                        : `${row.vs_air_co2_saving_pct.toFixed(1)}%`}
                    </td>
                    <td style={{ padding: '4px 6px' }}>
                      {row.vs_air_freight_delta_pct == null
                        ? '—'
                        : `${row.vs_air_freight_delta_pct.toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
