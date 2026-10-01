'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import ErrorBoundary from '@/components/ErrorBoundary';
import InsightsCharts from '@/components/insights/InsightsCharts';
import { ProvenanceChip } from '@/components/ProvenanceBadge';

function InsightsPageContent() {
  const router = useRouter();
  const { isAuthenticated, isHydrated } = useAuthStore();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

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
                OPERATIONAL INSIGHTS
              </span>
              <span className="text-[var(--border-hairline)]">/</span>
              <span className="hidden sm:inline font-mono text-[10px] text-[var(--text-secondary)]">
                SCORECARD, CARRIER SLA & ESG CO2 LEDGER
              </span>
            </div>
            <ProvenanceChip provenance="REAL" size="sm" />
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px] text-[var(--text-secondary)]">
            <span className="px-2 py-0.5 rounded-[2px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)]">
              REPORTS SYNCED
            </span>
          </div>
        </header>

        {/* Full-width analytics ledger — honest loading / NO DATA / retry */}
        <main className="flex-1 overflow-y-auto bg-[var(--paper)]">
          <InsightsCharts />
        </main>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  return (
    <ErrorBoundary name="Operational Insights">
      <InsightsPageContent />
    </ErrorBoundary>
  );
}
