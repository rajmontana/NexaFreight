'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getFeedHealth, type FeedHealthResponse, type FeedHealth } from '@/lib/nexafreight';
import { Activity, ShieldCheck, AlertCircle } from 'lucide-react';

export interface FeedAdapterStatus {
  key: string;
  name: string;
  shortName: string;
  isHealthy: boolean;
  messagesReceived: number;
  lastSuccessAt: string | null;
  provenance: string;
}

export interface FeedHealthIndicatorProps {
  className?: string;
  intervalMs?: number;
}

export default function FeedHealthIndicator({
  className = '',
  intervalMs = 30000,
}: FeedHealthIndicatorProps) {
  const [adapters, setAdapters] = useState<FeedAdapterStatus[]>([]);
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  const checkHealth = useCallback(async () => {
    try {
      const res: FeedHealthResponse = await getFeedHealth();
      const rawList = res?.adapters || [];
      setIsBackendHealthy(true);
      setLastCheck(new Date());

      // Identify backend adapters
      const aisAdapter = rawList.find(a =>
        a.adapter_name.toLowerCase().includes('ais')
      );
      const interpolatorAdapter = rawList.find(a =>
        a.adapter_name.toLowerCase().includes('interpolat') ||
        a.adapter_name.toLowerCase().includes('sim') ||
        a.adapter_name.toLowerCase().includes('truck')
      );
      const flightAdapter = rawList.find(a =>
        a.adapter_name.toLowerCase().includes('flight')
      );

      // Build adapter statuses for: AIS, TRUCK SIM, FLIGHT REPLAY
      const list: FeedAdapterStatus[] = [
        {
          key: 'ais',
          name: 'AIS Vessel Tracking',
          shortName: 'AIS',
          isHealthy: aisAdapter ? Boolean(aisAdapter.is_healthy) : false,
          messagesReceived: aisAdapter?.messages_received ?? 0,
          lastSuccessAt: aisAdapter?.last_success_at ?? null,
          provenance: aisAdapter?.provenance ? String(aisAdapter.provenance) : 'REPLAYED',
        },
        {
          key: 'truck_sim',
          name: 'Road Truck Sim',
          shortName: 'TRUCK',
          isHealthy: interpolatorAdapter ? Boolean(interpolatorAdapter.is_healthy) : false,
          messagesReceived: interpolatorAdapter?.messages_received ?? 0,
          lastSuccessAt: interpolatorAdapter?.last_success_at ?? null,
          provenance: interpolatorAdapter?.provenance ? String(interpolatorAdapter.provenance) : 'SIMULATED',
        },
        {
          key: 'flight_replay',
          name: 'Flight Cargo Replay',
          shortName: 'AIR',
          // If a dedicated flight adapter is reported, use it; otherwise interpolator handles flights
          isHealthy: flightAdapter
            ? Boolean(flightAdapter.is_healthy)
            : interpolatorAdapter
            ? Boolean(interpolatorAdapter.is_healthy)
            : false,
          messagesReceived: flightAdapter?.messages_received ?? interpolatorAdapter?.messages_received ?? 0,
          lastSuccessAt: flightAdapter?.last_success_at ?? interpolatorAdapter?.last_success_at ?? null,
          provenance: flightAdapter?.provenance
            ? String(flightAdapter.provenance)
            : interpolatorAdapter?.provenance
            ? String(interpolatorAdapter.provenance)
            : 'SIMULATED',
        },
      ];

      setAdapters(list);
    } catch {
      // Backend request failed or unauthenticated
      setIsBackendHealthy(false);
      setAdapters(prev =>
        prev.length > 0
          ? prev.map(a => ({ ...a, isHealthy: false }))
          : [
              { key: 'ais', name: 'AIS Vessel Tracking', shortName: 'AIS', isHealthy: false, messagesReceived: 0, lastSuccessAt: null, provenance: 'REPLAYED' },
              { key: 'truck_sim', name: 'Road Truck Sim', shortName: 'TRUCK', isHealthy: false, messagesReceived: 0, lastSuccessAt: null, provenance: 'SIMULATED' },
              { key: 'flight_replay', name: 'Flight Cargo Replay', shortName: 'AIR', isHealthy: false, messagesReceived: 0, lastSuccessAt: null, provenance: 'SIMULATED' },
            ]
      );
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, intervalMs);

    const handleAuthRefresh = () => {
      checkHealth();
    };
    window.addEventListener('nexafreight:auth_success', handleAuthRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('nexafreight:auth_success', handleAuthRefresh);
    };
  }, [checkHealth, intervalMs]);

  const allHealthy = isBackendHealthy && adapters.every(a => a.isHealthy);

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className="pointer-events-auto px-2.5 py-1 flex items-center gap-2.5 text-[9px] font-mono tracking-wider transition-colors cursor-pointer select-none"
        style={{
          backgroundColor: 'var(--paper)',
          border: '1px solid var(--border-hairline)',
          borderRadius: '2px',
          color: 'var(--ink)',
        }}
      >
        <div className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--text-secondary)' }}>
          <Activity className="w-3 h-3" style={{ color: allHealthy ? 'var(--cobalt)' : 'var(--oxide-risk)' }} />
          <span className="hidden sm:inline">FEEDS</span>
        </div>

        {/* Individual Adapter Dots */}
        <div className="flex items-center gap-2">
          {adapters.map(adapter => {
            const dotBg = adapter.isHealthy ? 'var(--moss-positive)' : 'var(--oxide-risk)';

            return (
              <div
                key={adapter.key}
                className="flex items-center gap-1"
                title={`${adapter.name}: ${adapter.isHealthy ? 'HEALTHY' : 'OFFLINE'}`}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: dotBg,
                  }}
                />
                <span
                  className="text-[8px] font-bold"
                  style={{ color: adapter.isHealthy ? 'var(--text-secondary)' : 'var(--oxide-risk)' }}
                >
                  {adapter.shortName}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tooltip Popup on Hover */}
      {showTooltip && (
        <div
          className="absolute top-full mt-2 right-0 z-[500] w-64 p-3 pointer-events-none"
          style={{
            backgroundColor: 'var(--paper)',
            border: '1px solid var(--border-hairline)',
            borderRadius: '3px',
            color: 'var(--ink)',
          }}
        >
          <div className="flex items-center justify-between pb-2 mb-2" style={{ borderBottom: '1px solid var(--border-hairline)' }}>
            <div className="flex items-center gap-1.5">
              {allHealthy ? (
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--moss-positive)' }} />
              ) : (
                <AlertCircle className="w-3.5 h-3.5" style={{ color: 'var(--oxide-risk)' }} />
              )}
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase" style={{ color: 'var(--ink)' }}>
                TELEMETRY FEED HEALTH
              </span>
            </div>
            <span
              className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: allHealthy ? 'rgba(62, 107, 79, 0.1)' : 'rgba(180, 69, 47, 0.1)',
                color: allHealthy ? 'var(--moss-positive)' : 'var(--oxide-risk)',
                border: `1px solid ${allHealthy ? 'var(--moss-positive)' : 'var(--oxide-risk)'}`,
                borderRadius: '2px',
              }}
            >
              {allHealthy ? 'HEALTHY' : 'DEGRADED'}
            </span>
          </div>

          <div className="space-y-2">
            {adapters.map(adapter => (
              <div
                key={adapter.key}
                className="flex items-start justify-between text-[9px] font-mono p-1.5"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: '2px',
                }}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      style={{
                        display: 'inline-block',
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        backgroundColor: adapter.isHealthy ? 'var(--moss-positive)' : 'var(--oxide-risk)',
                      }}
                    />
                    <span className="font-bold" style={{ color: 'var(--ink)' }}>{adapter.name}</span>
                  </div>
                  <div className="text-[8px] mt-0.5 pl-3" style={{ color: 'var(--text-secondary)' }}>
                    {adapter.messagesReceived.toLocaleString()} msgs • {adapter.provenance}
                  </div>
                </div>
                <span
                  className="font-bold"
                  style={{ color: adapter.isHealthy ? 'var(--moss-positive)' : 'var(--oxide-risk)' }}
                >
                  {adapter.isHealthy ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            ))}
          </div>

          {lastCheck && (
            <div className="mt-2 pt-1.5 text-[8px] font-mono text-right" style={{ borderTop: '1px solid var(--border-hairline)', color: 'var(--text-secondary)' }}>
              Updated: {lastCheck.toLocaleTimeString()} (every 30s)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
