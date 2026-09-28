"use client";

import { useCallback, useEffect, useState } from "react";
import {
  askCopilot as askCopilotApi,
  getAlerts,
  getShipmentFinancials,
  getShipmentPrediction,
  nexaClient,
  NexaHttpError,
  type Alert,
  type CopilotAskResponse,
  type ShipmentDetail,
  type ShipmentFinancialsResponse,
  type ShipmentPredictResponse,
} from "@/lib/nexafreight";
import ProvenanceBadge from "./ProvenanceBadge";
import { ProvenanceChip } from "./ProvenanceBadge";
import RouteAlternativesPanel from "./RouteAlternativesPanel";


interface ShipmentInspectorPanelProps {
  shipmentId: string | null;
  onClose: () => void;
  /** bump to force a reload of every panel block (e.g. after a decision) */
  refreshKey?: number;
  /** the signed-in user's role letter — financials hidden for VIEWER */
  viewerRole?: string;
}

const fmtRupee = (n: number | null | undefined) =>
  n == null
    ? "—"
    : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

/** Severity → accent color */
const sevColor: Record<string, string> = {
  CRITICAL: "#B4452F",
  HIGH: "#B4452F",
  MEDIUM: "#8B7325",
  LOW: "#5A5D66",
};

const COPILOT_PLACEHOLDER =
  "Why was this shipment rerouted? · Are we on time for SLA? · What is the demurrage on this shipment?";

export default function ShipmentInspectorPanel({
  shipmentId,
  onClose,
  refreshKey = 0,
  viewerRole = "VIEWER",
}: ShipmentInspectorPanelProps) {
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [prediction, setPrediction] = useState<ShipmentPredictResponse | null>(null);
  const [financials, setFinancials] = useState<ShipmentFinancialsResponse | null>(null);
  const [financialsDenied, setFinancialsDenied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [copilotQuestion, setCopilotQuestion] = useState("");
  const [copilotAnswer, setCopilotAnswer] = useState<CopilotAskResponse | null>(null);
  const [copilotBusy, setCopilotBusy] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);

  const canSeeFinancials = viewerRole === "ADMIN" || viewerRole === "OPERATOR";

  useEffect(() => {
    if (!shipmentId) {
      setShipment(null);
      setAlerts([]);
      setPrediction(null);
      setFinancials(null);
      setCopilotAnswer(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    nexaClient
      .getShipmentDetail(shipmentId)
      .then((data) => {
        if (!cancelled) setShipment(data as ShipmentDetail);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to load shipment");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Alerts for this shipment (queue-wide list, filtered client-side)
    getAlerts()
      .then((data) => {
        if (!cancelled) setAlerts(data.alerts.filter((a) => a.shipment_id === shipmentId));
      })
      .catch(() => undefined);

    // ML delay prediction — null when the registry is offline
    getShipmentPrediction(shipmentId)
      .then((p) => {
        if (!cancelled) setPrediction(p);
      })
      .catch(() => undefined);

    // Financials — gated to non-VIEWER roles; 403 hides the section quietly
    if (canSeeFinancials) {
      setFinancialsDenied(false);
      getShipmentFinancials(shipmentId)
        .then((f) => {
          if (!cancelled) setFinancials(f);
        })
        .catch((err) => {
          if (!cancelled && err instanceof NexaHttpError && err.status === 403) {
            setFinancialsDenied(true);
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [shipmentId, refreshKey, canSeeFinancials]);

  const askCopilot = useCallback(async () => {
    const question = copilotQuestion.trim();
    if (!shipmentId || !question) return;
    setCopilotBusy(true);
    setCopilotError(null);
    try {
      const res = await askCopilotApi(shipmentId, question);
      setCopilotAnswer(res);
    } catch (err) {
      setCopilotError(err instanceof Error ? err.message : String(err));
    } finally {
      setCopilotBusy(false);
    }
  }, [shipmentId, copilotQuestion]);

  if (!shipmentId) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 text-[var(--ink)] overflow-y-auto p-4 border-l z-50" style={{
      backgroundColor: 'var(--paper)',
      borderLeftColor: 'var(--border-hairline)',
      boxShadow: 'none',
    }}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-ui)', color: 'var(--ink)' }}>Shipment Detail</h2>
        <button onClick={onClose} className="p-1" aria-label="Close inspector" style={{ color: 'var(--text-secondary)' }}>
          ✕
        </button>
      </div>

      {loading && <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Loading...</p>}
      {error && <p style={{ color: 'var(--oxide-risk)', fontFamily: 'var(--font-ui)' }}>{error}</p>}

      {shipment && (
        <div className="space-y-4">
          <div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Reference</p>
            <p style={{ fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>
              {shipment.reference ?? `NF-${String(shipment.id).slice(0, 8).toUpperCase()}`}
            </p>
          </div>

          <div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Route</p>
            <p style={{ fontFamily: 'var(--font-ui)', color: 'var(--ink)' }}>
              {shipment.origin} → {shipment.dest ?? shipment.destination}
            </p>
          </div>

          <div className="flex gap-4">
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Mode</p>
              <p style={{ fontFamily: 'var(--font-ui)', color: 'var(--ink)' }}>{shipment.mode}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Status</p>
              <p style={{ fontFamily: 'var(--font-ui)', color: 'var(--ink)' }}>{shipment.status}</p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Containers</p>
              <p style={{ fontFamily: 'var(--font-ui)', color: 'var(--ink)' }}>{shipment.container_count ?? "—"}</p>
            </div>
          </div>

          {/* ─── Alerts ─────────────────────────── */}
          <section aria-label="Alerts">
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
              Alerts ({alerts.length})
            </p>
            {alerts.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>No alerts attached to this shipment.</p>
            )}
            <ul className="space-y-1">
              {alerts.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-2 text-sm rounded px-2 py-1"
                  style={{
                    border: '1px solid var(--border-hairline)',
                    backgroundColor: 'var(--paper)',
                  }}
                >
                  <span
                    className="text-[10px] font-bold px-1.5 rounded"
                    style={{
                      color: 'var(--ink)',
                      background: 'transparent',
                      border: '1px solid var(--border-hairline)',
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    {a.severity}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'var(--font-ui)' }}>{a.status}</span>
                  <span className="ml-auto text-xs font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                    {fmtRupee(a.financial_exposure)}
                  </span>
                  <ProvenanceBadge provenance={a.provenance} size="xs" />
                </li>
              ))}
            </ul>
          </section>

          {/* ─── ML prediction ──────────────────── */}
          <section aria-label="Delay prediction">
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
              ML delay prediction
            </p>
            {prediction ? (
              <div className="text-sm space-y-1 rounded p-2" style={{ border: '1px solid var(--border-hairline)', backgroundColor: 'var(--paper)' }}>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>P50 delay</span>
                  <div className="flex items-center gap-2">
                    <ProvenanceChip provenance={prediction.provenance} size="xs" />
                    <span className="font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{prediction.delay_p50_hours.toFixed(1)} h</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>SLA risk</span>
                  <span
                    className="font-semibold"
                    style={{
                      color:
                        prediction.sla_risk_level === "BREACH"
                          ? "var(--oxide-risk)"
                          : prediction.sla_risk_level === "HIGH"
                            ? "#8B3D28"
                            : "var(--moss-positive)",
                      fontFamily: 'var(--font-ui)',
                    }}
                  >
                    {prediction.sla_risk_level}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span></span>
                  {prediction.model_version && (
                    <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>v{prediction.model_version}</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Prediction unavailable (model offline).</p>
            )}
          </section>

          {/* ─── Financials (ADMIN / OPERATOR only) */}
          <section aria-label="Financials">
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
              Financials
            </p>
            {!canSeeFinancials || financialsDenied ? (
              <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Financial detail requires an operator role.</p>
            ) : financials ? (
              <div className="text-sm space-y-1 rounded p-2" style={{ border: '1px solid var(--border-hairline)', backgroundColor: 'var(--paper)' }}>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Revenue</span>
                  <span style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{fmtRupee(financials.pnl.revenue_usd)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Shipping</span>
                  <span style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{fmtRupee(financials.pnl.shipping_cost_usd)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Freight</span>
                  <span style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{fmtRupee(financials.pnl.freight_cost_usd)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>SLA penalty</span>
                  <span style={{ color: financials.pnl.sla_penalty_usd > 0 ? 'var(--oxide-risk)' : 'var(--ink)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtRupee(financials.pnl.sla_penalty_usd)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Demurrage</span>
                  <span style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{fmtRupee(financials.pnl.demurrage_usd)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Carbon</span>
                  <span style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>{fmtRupee(financials.pnl.carbon_cost_usd)}</span>
                </div>
                <div className="flex justify-between pt-1 mt-1" style={{ borderTop: '1px solid var(--border-hairline)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Margin</span>
                  <span
                    className="font-bold"
                    style={{
                      color: financials.pnl.margin_usd >= 0 ? 'var(--moss-positive)' : 'var(--oxide-risk)',
                      fontFamily: 'var(--font-mono)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {fmtRupee(financials.pnl.margin_usd)}{" "}
                    {financials.pnl.margin_pct != null &&
                      `(${(financials.pnl.margin_pct * 100).toFixed(1)}%)`}
                  </span>
                </div>
                {financials.orders.length > 0 && (
                  <details className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
                    <summary className="cursor-pointer">
                      {financials.orders.length} order(s) · {financials.container_count}×
                      {financials.container_weight_t}t containers
                    </summary>
                    <ul className="pl-4 mt-1 space-y-0.5">
                      {financials.orders.map((o) => (
                        <li key={o.order_number}>
                          {o.order_number}: {fmtRupee(o.revenue)} — {o.sla_status}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Loading…</p>
            )}
          </section>

          {/* ─── AI Copilot ─────────────────────── */}
          <section aria-label="AI copilot">
            <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
              AI copilot
            </p>
            <div className="space-y-2">
              <div className="flex gap-1">
                <input
                  value={copilotQuestion}
                  onChange={(e) => setCopilotQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && askCopilot()}
                  placeholder={COPILOT_PLACEHOLDER}
                  className="flex-1 rounded px-2 py-1.5 text-sm"
                  style={{
                    backgroundColor: 'var(--paper)',
                    border: '1px solid var(--border-hairline)',
                    color: 'var(--ink)',
                    fontFamily: 'var(--font-ui)',
                  }}
                  disabled={copilotBusy}
                  onFocus={(e) => {
                    (e.target as HTMLElement).style.borderColor = 'var(--cobalt)';
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLElement).style.borderColor = 'var(--border-hairline)';
                  }}
                />
                <button
                  onClick={askCopilot}
                  disabled={copilotBusy || !copilotQuestion.trim()}
                  className="rounded px-3 text-sm font-semibold transition-colors"
                  style={{
                    backgroundColor: 'transparent',
                    border: '1px solid var(--border-hairline)',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-ui)',
                  }}
                  onMouseEnter={(e) => {
                    if (!copilotBusy && copilotQuestion.trim()) {
                      (e.target as HTMLElement).style.borderColor = 'var(--cobalt)';
                      (e.target as HTMLElement).style.color = 'var(--cobalt)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.borderColor = 'var(--border-hairline)';
                    (e.target as HTMLElement).style.color = 'var(--text-secondary)';
                  }}
                >
                  {copilotBusy ? "…" : "Ask"}
                </button>
              </div>
              {copilotError && <p className="text-xs" style={{ color: 'var(--oxide-risk)', fontFamily: 'var(--font-ui)' }}>{copilotError}</p>}
              {copilotAnswer && (
                <div className="rounded p-2 space-y-1" style={{ border: '1px solid var(--border-hairline)', backgroundColor: 'var(--paper)' }}>
                  <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{copilotAnswer.answer}</p>
                  <div className="flex items-center gap-2">
                    <ProvenanceBadge provenance={copilotAnswer.provenance} size="xs" />
                    <span className="text-[10px]" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
                      source: {copilotAnswer.source}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Route version</p>
            <p className="text-sm" style={{ color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{shipment.route_version ?? 1}</p>
          </div>

          {shipment.legs && shipment.legs.length > 0 && (
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>Route plan</p>
              <ul className="space-y-1 text-xs">
                {shipment.legs.map((leg) => (
                  <li
                    key={String(leg.id)}
                    className="rounded p-2"
                    style={{
                      border: '1px solid var(--border-hairline)',
                      backgroundColor: 'var(--paper)',
                    }}
                  >
                    <p className="font-medium" style={{ color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}>{leg.mode}</p>
                    <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                      {leg.planned_departure
                        ? new Date(leg.planned_departure).toLocaleString()
                        : "TBD"}
                      {" → "}
                      {leg.planned_arrival
                        ? new Date(leg.planned_arrival).toLocaleString()
                        : "TBD"}
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
                      {leg.origin} → {leg.destination}
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)' }}>
                      {leg.distance_km ? `${leg.distance_km.toFixed(0)} km · ` : ""}
                      {leg.status}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ─── Route alternatives (multimodal planner) ─── */}
          <section
            aria-label="Route alternatives"
            style={{ borderTop: '1px solid var(--border-hairline)', paddingTop: 12 }}
          >
            <RouteAlternativesPanel
              shipmentId={shipmentId}
              refreshKey={refreshKey}
              showTabs
            />
          </section>
        </div>
      )}
    </div>
  );
}

