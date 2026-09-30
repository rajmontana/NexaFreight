'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Ship,
  Plane,
  Truck,
  Clock,
  AlertTriangle,
  DollarSign,
  Compass,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import ErrorBoundary from '@/components/ErrorBoundary';
import DossierHeaderCards, { buildDossierCards } from '@/components/DossierHeaderCards';
import ShipmentMilestoneTracker from '@/components/ShipmentMilestoneTracker';
import RouteAlternativesPanel from '@/components/RouteAlternativesPanel';
import { ProvenanceChip } from '@/components/ProvenanceBadge';
import {
  nexaClient,
  getAlerts,
  getShipmentFinancials,
  type Alert,
  type ShipmentDetail,
  type ShipmentFinancialsResponse,
} from '@/lib/nexafreight';

function ShipmentDossierPageContent() {
  const router = useRouter();
  const routeParams = useParams();
  const shipmentId = String(routeParams?.id || '');

  const { isAuthenticated, isHydrated, user } = useAuthStore();
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [financials, setFinancials] = useState<ShipmentFinancialsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (!shipmentId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      nexaClient.getShipmentDetail(shipmentId).catch((err) => {
        throw new Error(err?.message || 'Failed to load shipment');
      }),
      getAlerts().catch(() => ({ alerts: [] })),
      getShipmentFinancials(shipmentId).catch(() => null),
    ])
      .then(([detail, alertsResp, finResp]) => {
        if (!cancelled) {
          setShipment(detail as ShipmentDetail);
          setAlerts(alertsResp.alerts.filter((a) => a.shipment_id === shipmentId));
          setFinancials(finResp);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load dossier');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shipmentId]);

  if (!isHydrated || !isAuthenticated) return null;

  const refNumber = `NF-${shipmentId.slice(0, 8).toUpperCase()}`;

  const dossierCards = buildDossierCards({
    origin: shipment?.origin,
    destination: shipment?.dest ?? shipment?.destination,
    status: shipment?.status,
    slaDeadline: (shipment as { sla_deadline?: string })?.sla_deadline ?? null,
    slaStatus: (shipment as { sla_status?: string })?.sla_status ?? null,
    exposureUsd: financials
      ? financials.pnl.sla_penalty_usd + financials.pnl.demurrage_usd
      : null,
    co2Kg: (shipment as { kg_co2?: number })?.kg_co2 ?? null,
    containers: shipment?.container_count,
  });

  return (
    <div
      className="min-h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)]"
    >
      <div className="pl-[58px] min-h-screen flex flex-col relative">
        {/* Cockpit Status Header */}
        <header
          className="h-12 border-b flex items-center justify-between px-4 z-[1040] select-none flex-shrink-0"
          style={{
            backgroundColor: 'var(--paper)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          <div className="flex items-center gap-3">
            <Link
              href="/shipments"
              className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-[var(--text-secondary)] hover:text-[var(--cobalt)] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>MANIFEST</span>
            </Link>

            <span className="text-[var(--border-hairline)]">/</span>

            <div className="flex items-center gap-2">
              <span className="font-ui text-[13px] font-bold tracking-wider text-[var(--ink)]">
                WAYBILL {refNumber}
              </span>
              <span className="hidden sm:inline font-mono text-[10px] text-[var(--text-secondary)]">
                {shipmentId}
              </span>
            </div>

            <ProvenanceChip provenance={shipment?.provenance || 'REAL'} size="sm" />
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span
              className="px-2 py-0.5 rounded-[2px] border font-bold"
              style={{
                borderColor: shipment?.status === 'DELAYED' ? 'var(--oxide-risk)' : 'var(--border-hairline)',
                backgroundColor: 'var(--bg-subtle)',
                color: shipment?.status === 'DELAYED' ? 'var(--oxide-risk)' : 'var(--moss-positive)',
              }}
            >
              {shipment?.status || 'LOADING'}
            </span>
          </div>
        </header>

        {/* Dossier Body Content */}
        <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">
          {error && (
            <div className="p-4 rounded-[3px] border border-[var(--oxide-risk)] bg-red-50 text-[var(--oxide-risk)] font-mono text-[12px]">
              {error}
            </div>
          )}

          {/* 1. Header KPI Cards Strip (Lane, SLA, Exposure, CO2) */}
          <DossierHeaderCards cards={dossierCards} />

          {/* 2. Visual Transit Milestone Stepper */}
          {shipment && (
            <section
              className="p-4 rounded-[3px] border bg-[var(--bg-subtle)]"
              style={{ borderColor: 'var(--border-hairline)' }}
              aria-label="Transit Milestones"
            >
              <div className="text-[11px] font-mono text-[var(--text-secondary)] tracking-wider mb-2 font-bold">
                TRANSIT MILESTONES & DISRUPTION RISKS
              </div>
              <ShipmentMilestoneTracker
                legs={shipment.legs || []}
                alerts={alerts}
                origin={shipment.origin}
                destination={shipment.dest ?? shipment.destination}
                status={shipment.status}
              />
            </section>
          )}

          {/* 3. Multimodal Legs Breakdown */}
          {shipment?.legs && shipment.legs.length > 0 && (
            <section
              className="p-4 rounded-[3px] border bg-[var(--paper)]"
              style={{ borderColor: 'var(--border-hairline)' }}
              aria-label="Multimodal Legs"
            >
              <h3 className="font-ui text-[14px] font-bold text-[var(--ink)] mb-3">
                Multimodal Route Legs ({shipment.legs.length})
              </h3>
              <div className="space-y-2">
                {shipment.legs.map((leg, idx) => (
                  <div
                    key={leg.id || idx}
                    className="p-3 rounded-[2px] border border-[var(--border-hairline)] bg-[var(--bg-subtle)] flex items-center justify-between text-[12px] font-mono"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-[2px] bg-[var(--paper)] border border-[var(--border-hairline)] flex items-center justify-center font-bold text-[10px]">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-[var(--ink)]">
                        {leg.mode}
                      </span>
                      <span className="text-[var(--text-secondary)]">
                        {leg.distance_km ? `${Math.round(leg.distance_km)} km` : '—'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded-[2px] text-[10px] border border-[var(--border-hairline)] bg-[var(--paper)]">
                        {leg.status || 'PLANNED'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 4. Route Alternatives & Recommendation Drawer Block */}
          {shipment && (
            <section
              className="p-4 rounded-[3px] border bg-[var(--paper)]"
              style={{ borderColor: 'var(--border-hairline)' }}
              aria-label="Route Alternatives"
            >
              <RouteAlternativesPanel
                shipmentId={shipmentId}
                showTabs
              />
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ShipmentDossierPage() {
  return (
    <ErrorBoundary name="Shipment Dossier">
      <ShipmentDossierPageContent />
    </ErrorBoundary>
  );
}
