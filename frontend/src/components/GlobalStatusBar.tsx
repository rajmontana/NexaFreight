'use client';

import { useState, useEffect } from 'react';

interface SSEState {
  connected: boolean;
}

interface ReadoutProps {
  inTransit?: number | null;
  atRisk?: number | null;
  demurrageRs?: number | null;
}

/**
 * Chartroom top status strip.
 * HONESTY LAW: readouts render '--' until real values are passed in;
 * the live-thread underline animates ONLY when /api/health answers OK.
 * No hardcoded numbers, no fake connected state.
 */
export default function GlobalStatusBar({ inTransit = null, atRisk = null, demurrageRs = null }: ReadoutProps) {
  const [time, setTime] = useState('');
  const [sseState, setSSEState] = useState<SSEState>({ connected: false });

  useEffect(() => {
    const iv = setInterval(() => {
      const now = new Date();
      setTime(
        `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}Z`
      );
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // Real liveness check: /api/health must answer OK for the LIVE thread to show.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store', signal: AbortSignal.timeout(8000) });
        if (!cancelled) setSSEState({ connected: res.ok });
      } catch {
        if (!cancelled) setSSEState({ connected: false });
      }
    };
    check();
    const iv = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  const fmt = (v: number | null) => (v === null || v === undefined ? '--' : String(v));
  const fmtRs = (v: number | null) =>
    v === null || v === undefined ? '--' : `\u20B9${v.toLocaleString('en-IN')}`;

  return (
    <div className="status-strip">
      <div className="status-strip__section-left">
        <span>UTC {time || '--:--:--Z'}</span>
      </div>

      <div className="status-strip__section-center">
        <div
          className={`status-strip__live-indicator ${sseState.connected ? 'status-strip__live-indicator--connected' : ''}`}
          title={sseState.connected ? 'Feed connected' : 'Feed disconnected \u2014 showing last known state'}
        />
      </div>

      <div className="status-strip__section-right">
        <span>IN TRANSIT {fmt(inTransit)}</span>
        <span className="status-strip__at-risk">AT RISK {fmt(atRisk)}</span>
        <span>DEMURRAGE {fmtRs(demurrageRs)}</span>
      </div>
    </div>
  );
}
