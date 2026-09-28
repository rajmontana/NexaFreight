'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ProvenanceBadge from './ProvenanceBadge';
import {
  approveAlertOption,
  getAlert,
  getAlertOptions,
  type AlertDetail,
  type RerouteOption,
} from '@/lib/nexafreight';

export interface RerouteOptionsProps {
  /** Alert id — replaced whenever the operator opens a different alert. */
  alertId: string | null;
  /** Fired when an approve-and-execute completed (refresh map + alerts). */
  onApproved?: () => void;
  /** Close handler (dismiss drawer). */
  onClose?: () => void;
  /** Append mock outcome notes to the audit view (dev flag). */
  showMockOutcome?: boolean;
}

const fmtRupee = (n: number) =>
  n == null
    ? "—"
    : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'n/a';

export default function RerouteOptions({
  alertId,
  onApproved,
  onClose,
  showMockOutcome = false,
}: RerouteOptionsProps) {
  const [options, setOptions] = useState<RerouteOption[]>([]);
  const [alert, setAlert] = useState<AlertDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackMissing, setFallbackMissing] = useState(false);
  const [approvingKey, setApprovingKey] = useState<string | null>(null);
  const [approvedKey, setApprovedKey] = useState<string | null>(null);
  const [hasDecision, setHasDecision] = useState(false);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const [opts, detail] = await Promise.all([getAlertOptions(id), getAlert(id)]);
      setOptions(opts.options);
      setAlert(detail);
      setFallbackMissing(false);
    } catch (err) {
      // A deleted/resolved alert is close-worthy rather than an error state.
      setFallbackMissing(true);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setApprovedKey(null);
    setHasDecision(false);
    if (!alertId) return;
    void load(alertId);
  }, [alertId, load]);

  const approve = async (alertId_: string, option: RerouteOption) => {
    setApprovingKey(option.option_key);
    setError(null);
    try {
      await approveAlertOption(alertId_, option.option_key);
      setApprovedKey(option.option_key);
      setHasDecision(true);
      onApproved?.();
    } catch (err) {
      // Duplicate approvals come back 409 (ConflictError) — treat as approved.
      const status = (err as { status?: number }).status;
      if (status === 409) {
        setApprovedKey(option.option_key);
        setHasDecision(true);
      } else {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setApprovingKey(null);
    }
  };

  if (!alertId) return null;

  return (
    <section
      aria-label="Reroute options"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1070,
        background: 'rgba(246, 247, 244, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--paper)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-sm)',
          width: 'min(920px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          color: 'var(--ink)',
          padding: 14,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 8,
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-ui)', color: 'var(--ink)' }}>
              Reroute options
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
              Alert {alertId.slice(0, 8)}…
              {alert?.disruption && (
                <>
                  {' '}
                  · {alert.disruption.disruption_type.replaceAll('_', ' ')}
                  {alert.disruption.description &&
                    ` — ${alert.disruption.description}`}
                </>
              )}
              {alert && ' · severity ' + alert.severity}
            </span>
            {fallbackMissing && (
              <span style={{ fontSize: 11, color: 'var(--oxide-risk)', fontFamily: 'var(--font-ui)' }}>
                Options unavailable (mock-mode delivery — connection degraded): {error}
              </span>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              aria-label="Close reroute options"
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </header>

        {loading && <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Generating scored options…</div>}
        {error && !fallbackMissing && (
          <div role="alert" style={{ fontSize: 12, color: 'var(--oxide-risk)', fontFamily: 'var(--font-ui)' }}>
            {error}
          </div>
        )}
        {hasDecision && (
          <div
            role="status"
            style={{
              fontSize: 12,
              color: 'var(--moss-positive)',
              padding: '6px 8px',
              background: 'rgba(62, 107, 79, 0.1)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 8,
              fontFamily: 'var(--font-ui)',
            }}
          >
            Decision executed{approvedKey ? ` — ${approvedKey}` : ''}. Map route redrawn at the
            new route version; audit log entry written.
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 10,
          }}
        >
          {options.map((opt) => (
            <article
              key={opt.option_key}
              style={{
                border: opt.recommended ? '2px solid var(--cobalt)' : '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-sm)',
                padding: 10,
                background: 'var(--paper)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <header style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-ui)', color: opt.recommended ? 'var(--cobalt)' : 'var(--ink)' }}>{opt.display_name}</span>
                {opt.recommended && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-xs)',
                      background: 'rgba(37, 71, 200, 0.1)',
                      color: 'var(--cobalt)',
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    RECOMMENDED
                  </span>
                )}
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 13,
                    fontWeight: 800,
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-mono)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {fmtRupee(opt.total_impact_usd)}
                </span>
              </header>

              <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, fontFamily: 'var(--font-ui)' }}>{opt.description}</p>

              <dl
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  rowGap: 4,
                  columnGap: 8,
                  fontSize: 10,
                  margin: 0,
                }}
              >
                <dt style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Revised ETA</dt>
                <dd style={{ margin: 0, color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{fmtDate(opt.revised_eta)}</dd>
                <dt style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Freight Δ</dt>
                <dd style={{ margin: 0, color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{fmtRupee(opt.cost_delta_usd)}</dd>
                <dt style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>SLA penalty</dt>
                <dd style={{ margin: 0, color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{fmtRupee(opt.sla_penalty_usd)}</dd>
                <dt style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Demurrage</dt>
                <dd style={{ margin: 0, color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{fmtRupee(opt.demurrage_usd)}</dd>
                <dt style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Carbon</dt>
                <dd style={{ margin: 0, color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{fmtRupee(opt.carbon_cost_usd)}</dd>
                <dt style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>CO2 Δ</dt>
                <dd style={{ margin: 0, color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                  {opt.co2_delta_kg >= 0 ? '+' : ''}
                  {opt.co2_delta_kg.toLocaleString(undefined, { maximumFractionDigits: 0 })} kg
                </dd>
                <dt style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>SLA breaches</dt>
                <dd style={{ margin: 0, color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{opt.sla_breaches}</dd>
                <dt style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Action</dt>
                <dd style={{ margin: 0, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{opt.action}</dd>
              </dl>

              {opt.assumptions.length > 0 && (
                <ul
                  style={{
                    fontSize: 9,
                    color: 'var(--text-secondary)',
                    margin: 0,
                    paddingLeft: 14,
                    lineHeight: 1.4,
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  {opt.assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              )}

              <footer
                style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ProvenanceBadge
                  provenance={'DERIVED'}
                  size="xs"
                  title="Server-computed option slate (never client-supplied costs)"
                />
                <button
                  onClick={() => void approve(alertId, opt)}
                  disabled={approvingKey !== null || hasDecision}
                  aria-label={`Approve option ${opt.display_name}`}
                  style={{
                    marginLeft: 'auto',
                    background: 'transparent',
                    color: opt.recommended ? 'var(--moss-positive)' : 'var(--ink)',
                    border: opt.recommended ? '1px solid var(--moss-positive)' : '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-xs)',
                    padding: '6px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: 'var(--font-ui)',
                    cursor: approvingKey !== null || hasDecision ? 'not-allowed' : 'pointer',
                    opacity: approvingKey !== null || hasDecision ? 0.55 : 1,
                    transition: 'border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (approvingKey === null && !hasDecision) {
                      (e.target as HTMLElement).style.borderColor = opt.recommended ? 'var(--moss-positive)' : 'var(--cobalt)';
                      (e.target as HTMLElement).style.color = opt.recommended ? 'var(--moss-positive)' : 'var(--cobalt)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.borderColor = opt.recommended ? 'var(--moss-positive)' : 'var(--border-hairline)';
                    (e.target as HTMLElement).style.color = opt.recommended ? 'var(--moss-positive)' : 'var(--ink)';
                  }}
                >
                  {hasDecision && approvedKey === opt.option_key
                    ? 'Executed'
                    : approvingKey === opt.option_key
                      ? 'Executing…'
                      : 'Approve & Execute'}
                </button>
              </footer>
            </article>
          ))}
        </div>

        {showMockOutcome && (
          <p style={{ marginTop: 10, fontSize: 9, color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
            Dev only: mock outcome hooks — approval status is read from the Decision row the
            executor writes, regardless of what the UI remembered.
          </p>
        )}
      </div>
    </section>
  );
}
