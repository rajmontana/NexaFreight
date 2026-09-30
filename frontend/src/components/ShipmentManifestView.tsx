'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Ship,
  Plane,
  Truck,
  Search,
  AlertTriangle,
  ArrowRight,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { getShipments, type ShipmentListItem, type TransportMode, type ShipmentStatus } from '@/lib/nexafreight';

interface ShipmentManifestViewProps {
  onSelectShipment: (shipmentId: string) => void;
  selectedShipmentId: string | null;
}

const MODE_ICONS: Record<string, typeof Ship> = {
  SEA: Ship,
  AIR: Plane,
  ROAD: Truck,
  RAIL: Truck,
};

export default function ShipmentManifestView({
  onSelectShipment,
  selectedShipmentId,
}: ShipmentManifestViewProps) {
  const [shipments, setShipments] = useState<ShipmentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ShipmentStatus>('ALL');
  const [modeFilter, setModeFilter] = useState<'ALL' | TransportMode>('ALL');

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getShipments({
        page: 1,
        size: 100,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        mode: modeFilter === 'ALL' ? undefined : modeFilter,
      });
      setShipments(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load shipments manifest';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, modeFilter]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const filteredShipments = useMemo(() => {
    return shipments.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const id = (item.id || '').toLowerCase();
      const origin = (item.origin || '').toLowerCase();
      const dest = (item.destination || '').toLowerCase();
      return id.includes(q) || origin.includes(q) || dest.includes(q);
    });
  }, [shipments, searchQuery]);

  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden select-none"
      style={{
        backgroundColor: 'var(--paper)',
        color: 'var(--ink)',
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
        style={{ borderColor: 'var(--border-hairline)' }}
      >
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h1 className="font-ui text-[18px] font-semibold tracking-tight text-[var(--ink)]">
              Shipment Manifest & Waybill Ledger
            </h1>
            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded-[2px] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--text-secondary)]">
              {filteredShipments.length} ACTIVE
            </span>
          </div>
          <p className="font-ui text-[12px] text-[var(--text-secondary)]">
            Multimodal container tracking across global ocean corridors, air freights, and road haulage.
          </p>
        </div>

        <button
          onClick={fetchList}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] text-[12px] font-mono border transition-colors hover:bg-black/5"
          style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink)' }}
          title="Refresh list"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>REFRESH</span>
        </button>
      </div>

      {/* Control / Filter Bar */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 border-b flex-shrink-0"
        style={{
          borderColor: 'var(--border-hairline)',
          backgroundColor: 'var(--bg-subtle)',
        }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-[400px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="text"
            placeholder="Search by Waybill / Port (e.g. INJNP, SGSIN)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-[12px] font-mono rounded-[2px] border focus:outline-none focus:border-[var(--cobalt)] transition-colors"
            style={{
              backgroundColor: 'var(--paper)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--ink)',
            }}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center rounded-[2px] border overflow-hidden p-0.5 gap-0.5" style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--paper)' }}>
            {(['ALL', 'IN_TRANSIT', 'DELAYED', 'PLANNED', 'DELIVERED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded-[2px] transition-colors ${
                  statusFilter === st
                    ? 'bg-[var(--cobalt)] text-white font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--ink)]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Mode Filter */}
          <div className="flex items-center rounded-[2px] border overflow-hidden p-0.5 gap-0.5" style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--paper)' }}>
            {(['ALL', 'SEA', 'AIR', 'ROAD'] as const).map((md) => (
              <button
                key={md}
                onClick={() => setModeFilter(md)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded-[2px] transition-colors ${
                  modeFilter === md
                    ? 'bg-[var(--ink)] text-white font-semibold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--ink)]'
                }`}
              >
                {md}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table / Ledger */}
      <div className="flex-1 overflow-y-auto">
        {loading && shipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
            <RefreshCw className="w-5 h-5 animate-spin mb-2 text-[var(--cobalt)]" />
            <span className="font-mono text-[12px]">Connecting to carrier network telemetry...</span>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-[var(--oxide-risk)] font-mono text-[12px]">
            {error}
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="py-20 text-center text-[var(--text-secondary)] font-mono text-[12px]">
            No shipments matched your search criteria.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className="border-b font-mono text-[10px] text-[var(--text-secondary)] uppercase tracking-wider sticky top-0"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-hairline)',
                }}
              >
                <th className="py-2.5 px-6 font-medium">Shipment ID / Waybill</th>
                <th className="py-2.5 px-4 font-medium">Mode</th>
                <th className="py-2.5 px-4 font-medium">Origin Route Destination</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 font-medium">SLA Deadline</th>
                <th className="py-2.5 px-4 font-medium">Revised ETA</th>
                <th className="py-2.5 px-6 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)] font-mono text-[12px]">
              {filteredShipments.map((shipment) => {
                const isSelected = selectedShipmentId === shipment.id;
                const ModeIcon = MODE_ICONS[shipment.mode] || Ship;
                const isDelayed = shipment.status === 'DELAYED';

                return (
                  <tr
                    key={shipment.id}
                    onClick={() => onSelectShipment(shipment.id)}
                    className={`cursor-pointer transition-colors hover:bg-[var(--bg-subtle)] ${
                      isSelected ? 'bg-[rgba(37,71,200,0.06)]' : ''
                    }`}
                  >
                    {/* ID */}
                    <td className="py-3 px-6 font-bold text-[var(--ink)]">
                      <div className="flex items-center gap-1.5">
                        {isDelayed && (
                          <AlertTriangle className="w-3.5 h-3.5 text-[var(--oxide-risk)] flex-shrink-0" />
                        )}
                        <span>{shipment.id.slice(0, 14)}</span>
                      </div>
                    </td>

                    {/* Mode */}
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[11px]">
                        <ModeIcon className="w-3 h-3 text-[var(--cobalt)]" />
                        <span>{shipment.mode}</span>
                      </div>
                    </td>

                    {/* Corridor */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--ink)]">
                        <span className="font-semibold">{shipment.origin || 'ORIGIN'}</span>
                        <ArrowRight className="w-3 h-3 text-[var(--text-secondary)]" />
                        <span className="font-semibold">{shipment.destination || 'DEST'}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className="inline-block px-1.5 py-0.5 rounded-[2px] font-mono text-[10px] font-bold tracking-wider uppercase border"
                        style={{
                          backgroundColor:
                            shipment.status === 'DELAYED'
                              ? 'rgba(180, 69, 47, 0.1)'
                              : shipment.status === 'DELIVERED'
                              ? 'rgba(62, 107, 79, 0.1)'
                              : 'rgba(37, 71, 200, 0.08)',
                          borderColor:
                            shipment.status === 'DELAYED'
                              ? 'var(--oxide-risk)'
                              : shipment.status === 'DELIVERED'
                              ? 'var(--moss-positive)'
                              : 'var(--cobalt)',
                          color:
                            shipment.status === 'DELAYED'
                              ? 'var(--oxide-risk)'
                              : shipment.status === 'DELIVERED'
                              ? 'var(--moss-positive)'
                              : 'var(--cobalt)',
                        }}
                      >
                        {shipment.status}
                      </span>
                    </td>

                    {/* SLA Deadline */}
                    <td className="py-3 px-4 text-[11px] text-[var(--text-secondary)]">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[var(--text-secondary)]" />
                        <span>
                          {shipment.strictest_sla_deadline
                            ? new Date(shipment.strictest_sla_deadline).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </span>
                      </div>
                    </td>

                    {/* Revised ETA */}
                    <td className="py-3 px-4 text-[11px]">
                      <span
                        className="font-mono"
                        style={{
                          color: isDelayed ? 'var(--oxide-risk)' : 'var(--ink)',
                          fontWeight: isDelayed ? 600 : 400,
                        }}
                      >
                        {shipment.revised_eta
                          ? new Date(shipment.revised_eta).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'ON TRACK'}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-6 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectShipment(shipment.id);
                        }}
                        className="px-2.5 py-1 text-[11px] font-ui font-medium rounded-[2px] border text-[var(--cobalt)] hover:bg-[var(--cobalt)] hover:text-white transition-colors"
                        style={{ borderColor: 'var(--cobalt)' }}
                      >
                        INSPECT
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
