'use client';

/**
 * useFleetKpis — the headline band's data source.
 *
 * Pulls the four real analytics payloads in parallel and folds them into the
 * derived KPI set. Nothing is synthesised: when a call fails the corresponding
 * KPI reports `available: false` and the tile prints NO DATA.
 *
 * All four endpoints are JWT-protected, so the hook stays idle until a token
 * exists and surfaces an `unauthenticated` state instead of spinning.
 *
 * Auth hydration race fix: the hook listens for the `nexafreight:auth_success`
 * event and auto-retries after 1 second when unauthenticated, so the band
 * always picks up the token after the AuthProvider hydrates from storage.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getAnalyticsEsg,
  getAnalyticsScorecard,
  getAnalyticsSla,
  getAnalyticsSummary,
  hasToken,
} from '@/lib/nexafreight/client';
import type {
  AnalyticsEsgResponse,
  AnalyticsFinancialResponse,
  AnalyticsSlaResponse,
  AnalyticsSummaryResponse,
} from '@/lib/nexafreight/types';
import { deriveKpiSet, type ExposureWindow, type KpiSet } from '@/lib/analytics/kpi';

export interface FleetKpiState {
  kpis: KpiSet;
  /** True during the first load only — refreshes are silent. */
  loading: boolean;
  /** Set when every endpoint failed. Partial failures degrade per-tile. */
  error: string | null;
  /** No token yet; the band invites the operator to sign in. */
  unauthenticated: boolean;
  /** Timestamp of the last completed poll. */
  updatedAt: Date | null;
  refresh: () => void;
}

const EMPTY = deriveKpiSet({ sla: null, financial: null, esg: null, summary: null });

/**
 * @param window  which financial window feeds the exposure tile
 * @param pollMs  refresh cadence; 0 disables polling
 */
export function useFleetKpis(window: ExposureWindow = 'month', pollMs = 30_000): FleetKpiState {
  const [kpis, setKpis] = useState<KpiSet>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthenticated, setUnauthenticated] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);

  const firstLoad = useRef(true);
  const alive = useRef(true);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!hasToken()) {
        if (!cancelled) {
          setUnauthenticated(true);
          setLoading(false);
          setKpis(EMPTY);
        }
        return;
      }
      if (!cancelled) setUnauthenticated(false);

      // Settle all four independently so one 500 does not blank the band.
      const [finR, sumR, slaR, esgR] = await Promise.allSettled([
        getAnalyticsScorecard(),
        getAnalyticsSummary(),
        getAnalyticsSla(),
        getAnalyticsEsg(),
      ]);

      if (cancelled || !alive.current) return;

      const financial = finR.status === 'fulfilled' ? (finR.value as AnalyticsFinancialResponse) : null;
      const summary = sumR.status === 'fulfilled' ? (sumR.value as AnalyticsSummaryResponse) : null;
      const sla = slaR.status === 'fulfilled' ? (slaR.value as AnalyticsSlaResponse) : null;
      const esg = esgR.status === 'fulfilled' ? (esgR.value as AnalyticsEsgResponse) : null;

      const allFailed = !financial && !summary && !sla && !esg;
      setError(allFailed ? 'analytics unreachable' : null);
      setKpis(deriveKpiSet({ sla, financial, esg, summary, window }));
      setUpdatedAt(new Date());

      if (firstLoad.current) {
        firstLoad.current = false;
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [window, tick]);

  // Auth hydration race fix: if we start unauthenticated, retry after 1s to
  // catch the AuthProvider hydrating the token from localStorage/sessionStorage.
  useEffect(() => {
    if (!unauthenticated) return;
    const retry = setTimeout(() => setTick((t) => t + 1), 1000);
    return () => clearTimeout(retry);
  }, [unauthenticated]);

  // Also listen for explicit auth_success events dispatched on login.
  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    if (typeof globalThis.window !== 'undefined') {
      globalThis.window.addEventListener('nexafreight:auth_success', handler);
      return () => globalThis.window.removeEventListener('nexafreight:auth_success', handler);
    }
  }, []);

  // Polling cadence, paused while the tab is hidden so a projector-left-open
  // demo does not hammer the API.
  useEffect(() => {
    if (!pollMs) return;
    const id = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        setTick((t) => t + 1);
      }
    }, pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  return { kpis, loading, error, unauthenticated, updatedAt, refresh };
}
