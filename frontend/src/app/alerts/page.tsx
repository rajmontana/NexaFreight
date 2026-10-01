'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import ErrorBoundary from '@/components/ErrorBoundary';
import AlertFeed from '@/components/alerts/AlertFeed';
import RerouteOptions from '@/components/RerouteOptions';
import { ProvenanceChip } from '@/components/ProvenanceBadge';

function AlertsPageContent() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuthStore();
  const [activeOptionsAlertId, setActiveOptionsAlertId] = useState<string | null>(null);
  const [opsVersion, setOpsVersion] = useState(0);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  const handleDecisionExecuted = useCallback(() => {
    setOpsVersion((v) => v + 1);
    setActiveOptionsAlertId(null);
  }, []);

  if (!isHydrated || !isAuthenticated) return null;

  return (
    <div
      className="fixed inset-0 overflow-hidden flex flex-col"
      style={{ backgroundColor: 'var(--paper)', color: 'var(--ink)' }}
    >
      <div className="pl-[58px] h-full flex flex-col relative overflow-hidden">
        {/* Cockpit chrome header */}
        <header
          className="h-12 border-b flex items-center justify-between px-4 z-[1040] select-none flex-shrink-0"
          style={{
            backgroundColor: 'var(--paper)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-ui text-[13px] font-bold tracking-wider text-[var(--ink)]">
                DISRUPTION QUEUE
              </span>
              <span className="text-[var(--border-hairline)]">/</span>
              <span className="hidden sm:inline font-mono text-[10px] text-[var(--text-secondary)]">
                INCIDENT RECOVERY &amp; 3-WAY DECISION LOG
              </span>
            </div>
            <ProvenanceChip provenance="REAL" size="sm" />
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--text-secondary)]">
            <span className="px-2 py-0.5 rounded-[2px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)]">
              QUEUE ACTIVE
            </span>
          </div>
        </header>

        {/* Full-width NAVTOWER incident feed */}
        <main className="flex-1 overflow-y-auto bg-[var(--paper)]">
          <AlertFeed
            onOpenInspector={(shipmentId) => router.push(`/shipments/${shipmentId}`)}
            onEvaluate={(alertId) => setActiveOptionsAlertId(alertId)}
            refreshKey={opsVersion}
          />
        </main>

        {/* Reroute trade-off desk — overlay per DESIGN.md modal spec:
            flat paper fill · 1px solid ink border · non-blurred scrim */}
        {activeOptionsAlertId && (
          <div
            className="fixed inset-0 z-[1100] flex items-center justify-center p-6"
            style={{ background: 'rgba(22, 24, 29, 0.4)' }}
            onClick={() => setActiveOptionsAlertId(null)}
            role="presentation"
          >
            <div
              className="w-full max-w-2xl max-h-[85vh] overflow-y-auto"
              style={{
                backgroundColor: 'var(--paper)',
                border: '1px solid var(--ink, #16181D)',
                borderRadius: 0,
              }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Reroute trade-off desk"
            >
              <div
                className="flex items-center justify-between px-4 py-2.5 border-b"
                style={{ borderColor: 'var(--border-hairline)', background: 'var(--bg-subtle)' }}
              >
                <span className="font-mono text-[11px] tracking-[0.14em] text-[var(--text-secondary)]">
                  RECOVERY DESK // 3-WAY TRADE-OFF
                </span>
                <button
                  onClick={() => setActiveOptionsAlertId(null)}
                  className="font-mono text-[11px] tracking-[0.1em]"
                  style={{ border: '1px solid var(--border-hairline)', borderRadius: 2, padding: '4px 10px', cursor: 'pointer', background: 'var(--paper)' }}
                >
                  CLOSE ✕
                </button>
              </div>
              <div className="p-5">
                <RerouteOptions
                  alertId={activeOptionsAlertId}
                  onApproved={handleDecisionExecuted}
                  onClose={() => setActiveOptionsAlertId(null)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AlertsPage() {
  return (
    <ErrorBoundary name="Disruption Alerts Desk">
      <AlertsPageContent />
    </ErrorBoundary>
  );
}
