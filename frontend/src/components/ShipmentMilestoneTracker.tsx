'use client';

import { memo } from 'react';
import { Ship, Truck, Train, Plane, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import type { Leg, TransportMode, Alert } from '@/lib/nexafreight';
import ProvenanceBadge from './ProvenanceBadge';

interface ShipmentMilestoneTrackerProps {
  legs: Leg[];
  alerts?: Alert[];
  origin?: string | null;
  destination?: string | null;
  status?: string | null;
}

const getModeIcon = (mode: TransportMode | string) => {
  switch (mode) {
    case 'SEA':
      return Ship;
    case 'ROAD':
      return Truck;
    case 'RAIL':
      return Train;
    case 'AIR':
      return Plane;
    default:
      return Ship;
  }
};

const formatLegDate = (iso?: string | null) => {
  if (!iso) return 'TBD';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '—';
  }
};

function ShipmentMilestoneTracker({
  legs,
  alerts = [],
  origin,
  destination,
  status,
}: ShipmentMilestoneTrackerProps) {
  if (!legs || legs.length === 0) {
    return (
      <div className="p-3 rounded-[2px] border border-[var(--border-hairline)] bg-[var(--paper)] text-xs text-[var(--text-secondary)] font-mono">
        No multimodal transit legs registered for this shipment.
      </div>
    );
  }

  const hasCriticalAlert = alerts.some(
    (a) => a.severity === 'CRITICAL' || a.severity === 'HIGH'
  );

  return (
    <div className="flex flex-col gap-2.5">
      {/* Title & Overall Corridor Bar */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold tracking-[0.16em] uppercase text-[var(--text-secondary)]">
          TRANSIT MILESTONES ({legs.length} LEGS)
        </span>
        <span
          className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] border"
          style={{
            backgroundColor: hasCriticalAlert
              ? 'rgba(180, 69, 47, 0.1)'
              : 'rgba(37, 71, 200, 0.08)',
            borderColor: hasCriticalAlert ? 'var(--oxide-risk)' : 'var(--cobalt)',
            color: hasCriticalAlert ? 'var(--oxide-risk)' : 'var(--cobalt)',
          }}
        >
          {status || 'IN-TRANSIT'}
        </span>
      </div>

      {/* Disruption Alert Warning (if applicable) */}
      {alerts.length > 0 && (
        <div
          className="p-2 rounded-[2px] border flex items-start gap-2"
          style={{
            backgroundColor: 'rgba(180, 69, 47, 0.06)',
            borderColor: 'var(--oxide-risk)',
          }}
        >
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-[var(--oxide-risk)]" />
          <div className="flex flex-col text-[11px] leading-tight">
            <span className="font-bold text-[var(--oxide-risk)] font-mono">
              {alerts[0].disruption_type || 'DISRUPTION DETECTED'}
            </span>
            <span className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">
              Financial Exposure: ₹{alerts[0].financial_exposure.toLocaleString('en-IN')} · Active security / bottleneck alert
            </span>
          </div>
        </div>
      )}

      {/* Project44-style Connected Milestone Sequence */}
      <div className="relative pl-3 border-l-2 border-[var(--border-hairline)] flex flex-col gap-3 py-1 my-1">
        {legs.map((leg, idx) => {
          const ModeIcon = getModeIcon(leg.mode);
          const isCompleted = leg.status === 'COMPLETED';
          const isCurrent = leg.status === 'IN_PROGRESS' || (leg.status as string) === 'IN_TRANSIT' || (!leg.status && idx === 0);
          const legAlert = alerts.length > 0 && (isCurrent || idx === 0);

          return (
            <div key={String(leg.id || idx)} className="relative flex flex-col gap-1.5 group">
              {/* Stepper node circle */}
              <div
                className="absolute -left-[19px] top-1 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: isCompleted
                    ? 'var(--moss-positive)'
                    : isCurrent
                    ? 'var(--cobalt)'
                    : 'var(--paper)',
                  borderColor: isCompleted
                    ? 'var(--moss-positive)'
                    : isCurrent
                    ? 'var(--cobalt)'
                    : 'var(--border-hairline)',
                }}
              >
                {isCompleted && (
                  <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                )}
                {isCurrent && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                )}
              </div>

              {/* Leg Card */}
              <div
                className="p-2.5 rounded-[2px] border transition-colors"
                style={{
                  backgroundColor: isCurrent ? 'rgba(37, 71, 200, 0.03)' : 'var(--paper)',
                  borderColor: isCurrent
                    ? 'var(--cobalt)'
                    : legAlert
                    ? 'var(--oxide-risk)'
                    : 'var(--border-hairline)',
                }}
              >
                {/* Leg Header */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="p-1 rounded-[2px] border"
                      style={{
                        backgroundColor: 'var(--paper-contrast)',
                        borderColor: 'var(--border-hairline)',
                        color: 'var(--ink)',
                      }}
                    >
                      <ModeIcon className="w-3 h-3" />
                    </span>
                    <span className="text-[11px] font-bold font-mono tracking-wider text-[var(--ink)]">
                      LEG {idx + 1}: {leg.mode}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {leg.provenance && (
                      <ProvenanceBadge provenance={leg.provenance} size="xs" />
                    )}
                    <span
                      className="text-[9px] font-mono uppercase px-1 py-0.2 rounded"
                      style={{
                        color: isCompleted
                          ? 'var(--moss-positive)'
                          : isCurrent
                          ? 'var(--cobalt)'
                          : 'var(--text-secondary)',
                      }}
                    >
                      {leg.status || (isCurrent ? 'IN-TRANSIT' : 'SCHEDULED')}
                    </span>
                  </div>
                </div>

                {/* Origin -> Destination UN/LOCODE */}
                <div className="flex items-center gap-2 text-[12px] font-bold font-mono text-[var(--ink)] mb-1">
                  <span>{leg.origin || origin || 'ORIGIN'}</span>
                  <ArrowRight className="w-3 h-3 text-[var(--text-secondary)]" />
                  <span>{leg.destination || destination || 'DEST'}</span>
                  {leg.vessel && (
                    <span className="text-[10px] font-normal text-[var(--text-secondary)] ml-auto truncate max-w-[120px]">
                      {leg.vessel.name || `MMSI: ${leg.vessel.mmsi}`}
                    </span>
                  )}
                  {leg.flight_number && (
                    <span className="text-[10px] font-normal text-[var(--text-secondary)] ml-auto">
                      FLIGHT {leg.flight_number}
                    </span>
                  )}
                </div>

                {/* Timeline and Distance */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--border-hairline)] text-[10px] font-mono text-[var(--text-secondary)]">
                  <div>
                    <span className="opacity-70">DEP: </span>
                    <span className="text-[var(--ink)] tabular-nums">
                      {formatLegDate(leg.actual_departure || leg.planned_departure)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="opacity-70">ARR: </span>
                    <span className="text-[var(--ink)] tabular-nums">
                      {formatLegDate(leg.actual_arrival || leg.planned_arrival)}
                    </span>
                  </div>
                </div>

                {/* Auxiliary Telemetry (Distance & CO2) */}
                {(leg.distance_km != null || leg.co2_kg != null) && (
                  <div className="flex items-center justify-between text-[9px] font-mono text-[var(--text-secondary)] mt-1 pt-1 border-t border-[var(--border-hairline)]">
                    {leg.distance_km != null && (
                      <span>DIST: {Number(leg.distance_km).toLocaleString()} km</span>
                    )}
                    {leg.co2_kg != null && (
                      <span>CO2: {Number(leg.co2_kg).toLocaleString()} kg</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(ShipmentMilestoneTracker);
