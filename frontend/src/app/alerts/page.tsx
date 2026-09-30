'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import ErrorBoundary from '@/components/ErrorBoundary';
import AlertCenter from '@/components/AlertCenter';
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
        {/* Cockpit Status Header */}
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
                INCIDENT RECOVERY & 3-WAY DECISION LOG
              </span>
            </div>
            <ProvenanceChip provenance="REAL" size="sm" />
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="px-2 py-0.5 rounded-[2px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
              QUEUE ACTIVE
            </span>
          </div>
        </header>

        {/* Full-Page Queue & Rerouting Desk */}
        <main className="flex-1 p-6 flex flex-col overflow-hidden bg-[var(--paper)]">
          <div className="mb-4">
            <h1 className="font-ui text-[18px] font-semibold text-[var(--ink)]">
              Active Maritime & Multimodal Disruptions
            </h1>
            <p className="font-ui text-[12px] text-[var(--text-secondary)] mt-0.5">
              Review operational exceptions, acknowledge alerts, and compute 3-way recovery trade-offs (Accept Delay, Port Divert, Modal Shift).
            </p>
          </div>

          <div className="flex-1 flex gap-6 overflow-hidden relative">
            {/* Left Column: Full-Height Alert Queue */}
            <div className="w-[420px] flex-shrink-0 flex flex-col">
              <AlertCenter
                onOpenInspector={(shipmentId) => router.push(`/shipments/${shipmentId}`)}
                onOpenOptions={(alertId) => setActiveOptionsAlertId(alertId)}
                refreshKey={opsVersion}
                defaultOpen
              />
            </div>

            {/* Right Column: Reroute Trade-Off Planner / Decision Area */}
            <div
              className="flex-1 border rounded-[3px] p-6 flex flex-col justify-center items-center text-center overflow-y-auto"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-hairline)',
              }}
            >
              {activeOptionsAlertId ? (
                <div className="w-full max-w-xl text-left">
                  <RerouteOptions
                    alertId={activeOptionsAlertId}
                    onApproved={handleDecisionExecuted}
                    onClose={() => setActiveOptionsAlertId(null)}
                  />
                </div>
              ) : (
                <div className="max-w-md flex flex-col items-center">
                  <div className="w-10 h-10 rounded-[3px] flex items-center justify-center mb-3 bg-black/5 text-[var(--text-secondary)]">
                    <Compass className="w-5 h-5" />
                  </div>
                  <h3 className="font-ui text-[14px] font-semibold text-[var(--ink)]">
                    Select an Incident to Evaluate Recovery Alternatives
                  </h3>
                  <p className="font-ui text-[12px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                    Select an alert from the queue to run the multi-objective rerouting engine. 
                    Compare alternative maritime routes, Cape of Good Hope detours, and rail/air shifts.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
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
