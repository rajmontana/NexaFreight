'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ProvenanceBadge from './ProvenanceBadge';
import {
  acknowledgeAlert,
  getAlerts,
  type Alert,
  type AlertSeverity,
  type AlertStatus,
} from '@/lib/nexafreight';

export interface AlertCenterProps {
  /** Poll interval in ms (default 30s). Set to 0 to disable polling. */
  pollIntervalMs?: number;
  /** Bump to force an immediate reload of the queue. */
  refreshKey?: number;
  /** Called when the user asks to open the alert's shipment inspector. */
  onOpenInspector?: (shipmentId: string) => void;
  /** Called when the user wants the scored reroute-option drawer for an alert. */
  onOpenOptions?: (alertId: string) => void;
  /** Rendering quality: LiveAlerts is reused for the feed strip. */
  compact?: boolean;
  /** Open the new-report drawer by default (used by demos). */
  defaultOpen?: boolean;
}

const SEVERITY_ORDER: AlertSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function AlertCenter({
  pollIntervalMs = 30_000,
  refreshKey = 0,
  onOpenInspector,
  onOpenOptions,
  compact = false,
  defaultOpen = false,
}: AlertCenterProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'ALL'>('ALL');
  const [ackBusyId, setAckBusyId] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getAlerts({
        severity: severityFilter === 'ALL' ? undefined : severityFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      if (!mountedRef.current) return;
      setAlerts(data.alerts);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [severityFilter, statusFilter]);

  // Initial load + filter changes + explicit refresh-key bumps
  useEffect(() => {
    setLoading(true);
    void load();
  }, [load, refreshKey]);

  // Polling
  useEffect(() => {
    if (!pollIntervalMs) return;
    const t = setInterval(load, pollIntervalMs);
    return () => clearInterval(t);
  }, [load, pollIntervalMs]);

  const acknowledge = async (alertId: string) => {
    setAckBusyId(alertId);
    try {
      // Operator id is hardwired to 1 until SSO lands — backend stamps it.
      await acknowledgeAlert(alertId, { user_id: 1 });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAckBusyId(null);
    }
  };

  const counts = SEVERITY_ORDER.map((sev) => ({
    sev,
    count: alerts.filter((a) => a.severity === sev && a.status !== 'RESOLVED').length,
  })).filter((c) => c.count > 0);

  if (!open) {
    const openCount = alerts.filter((a) => a.status !== 'RESOLVED').length;
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open alert center"
        style={{
          position: 'absolute',
          top: 60,
          right: 12,
          zIndex: 1060,
          background: 'var(--paper)',
          color: openCount > 0 ? 'var(--oxide-risk)' : 'var(--ink)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 10px',
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'var(--font-ui)',
          cursor: 'pointer',
          boxShadow: 'none',
        }}
      >
        Alerts {openCount > 0 ? `(${openCount})` : ''}
      </button>
    );
  }

  return (
    <section
      aria-label="Alert center"
      style={{
        position: 'absolute',
        top: 56,
        right: 12,
        bottom: 12,
        width: compact ? 300 : 360,
        zIndex: 1060,
        background: 'var(--paper)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'none',
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          borderBottom: '1px solid var(--border-hairline)',
          background: 'var(--paper)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>
            Alert Queue
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
            {alerts.length} total · {counts.map((c) => `${c.sev} ${c.count}`).join(' · ')}
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close alert center"
          style={{
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </header>

      <div style={{ display: 'flex', gap: 6, padding: '8px 10px', flexWrap: 'wrap' }}>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | 'ALL')}
          aria-label="Filter by severity"
          style={{
            background: 'var(--paper)',
            color: 'var(--ink)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-xs)',
            padding: '3px 6px',
            fontSize: 11,
            fontFamily: 'var(--font-ui)',
          }}
        >
          <option value="ALL">All severities</option>
          {SEVERITY_ORDER.map((sev) => (
            <option key={sev} value={sev}>
              {sev}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AlertStatus | 'ALL')}
          aria-label="Filter by status"
          style={{
            background: 'var(--paper)',
            color: 'var(--ink)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-xs)',
            padding: '3px 6px',
            fontSize: 11,
            fontFamily: 'var(--font-ui)',
          }}
        >
          <option value="ALL">All statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
          <option value="RESOLVED">RESOLVED</option>
        </select>
        <button
          onClick={() => void load()}
          style={{
            background: 'var(--paper)',
            color: 'var(--cobalt)',
            border: '1px solid var(--cobalt)',
            borderRadius: 'var(--radius-xs)',
            padding: '3px 8px',
            fontSize: 11,
            fontFamily: 'var(--font-ui)',
            fontWeight: 600,
            cursor: 'pointer',
            marginLeft: 'auto',
            transition: 'border-color 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.borderColor = 'var(--cobalt-pressed)';
            (e.target as HTMLElement).style.color = 'var(--cobalt-pressed)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.borderColor = 'var(--cobalt)';
            (e.target as HTMLElement).style.color = 'var(--cobalt)';
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: '6px 10px',
            fontSize: 11,
            color: 'var(--oxide-risk)',
            background: 'rgba(180, 69, 47, 0.08)',
            fontFamily: 'var(--font-ui)',
          }}
        >
          Failed to load alerts: {error}
        </div>
      )}
      {loading && !error && (
        <div style={{ padding: 10, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Loading…</div>
      )}
      {!loading && error == null && alerts.length === 0 && (
        <div style={{ padding: 10, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
          No alerts — the fleet is quiet.
        </div>
      )}

      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {alerts.map((alert) => (
          <li
            key={alert.id}
            style={{
              borderTop: '1px solid var(--border-hairline)',
              padding: '8px 10px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              backgroundColor: 'var(--paper)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-hairline)',
                  background: 'var(--paper)',
                  color:
                    alert.severity === 'CRITICAL'
                      ? 'var(--oxide-risk)'
                      : alert.severity === 'HIGH'
                        ? '#8B3D28'
                        : 'var(--text-secondary)',
                  fontFamily: 'var(--font-ui)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                {alert.severity}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>{alert.status}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  marginLeft: 'auto',
                  color: 'var(--ink)',
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                ₹{alert.financial_exposure.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
            {alert.disruption_type && (
              <div style={{ fontSize: 11, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>
                {alert.disruption_type.replaceAll('_', ' ')}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <ProvenanceBadge provenance={alert.provenance} size="xs" />
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                {onOpenInspector && (
                  <button
                    onClick={() => onOpenInspector(alert.shipment_id)}
                    style={{
                      background: 'transparent',
                      color: 'var(--ink)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '2px 6px',
                      fontSize: 10,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-ui)',
                      fontWeight: 600,
                      transition: 'border-color 0.15s, color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'var(--cobalt)';
                      (e.target as HTMLElement).style.color = 'var(--cobalt)';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'var(--border-hairline)';
                      (e.target as HTMLElement).style.color = 'var(--ink)';
                    }}
                  >
                    Inspect
                  </button>
                )}
                {onOpenOptions && (
                  <button
                    onClick={() => onOpenOptions(alert.id)}
                    style={{
                      background: 'transparent',
                      color: 'var(--ink)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '2px 6px',
                      fontSize: 10,
                      cursor: 'pointer',
                      fontFamily: 'var(--font-ui)',
                      fontWeight: 600,
                      transition: 'border-color 0.15s, color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'var(--moss-positive)';
                      (e.target as HTMLElement).style.color = 'var(--moss-positive)';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'var(--border-hairline)';
                      (e.target as HTMLElement).style.color = 'var(--ink)';
                    }}
                  >
                    Options
                  </button>
                )}
                {alert.status === 'OPEN' && (
                  <button
                    onClick={() => void acknowledge(alert.id)}
                    disabled={ackBusyId === alert.id}
                    style={{
                      background: 'transparent',
                      color: 'var(--ink)',
                      border: '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-xs)',
                      padding: '2px 6px',
                      fontSize: 10,
                      cursor: ackBusyId === alert.id ? 'wait' : 'pointer',
                      opacity: ackBusyId === alert.id ? 0.5 : 1,
                      fontFamily: 'var(--font-ui)',
                      fontWeight: 600,
                      transition: 'border-color 0.15s, color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (ackBusyId !== alert.id) {
                        (e.target as HTMLElement).style.borderColor = 'var(--cobalt)';
                        (e.target as HTMLElement).style.color = 'var(--cobalt)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.borderColor = 'var(--border-hairline)';
                      (e.target as HTMLElement).style.color = 'var(--ink)';
                    }}
                  >
                    {ackBusyId === alert.id ? 'Ack…' : 'Ack'}
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
