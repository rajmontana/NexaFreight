'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import dynamic from 'next/dynamic';
import {
  Layers,
  Search,
  Globe,
  Bell,
  Compass,
} from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import ScaleBar from '@/components/ScaleBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import KpiBand from '@/components/KpiBand';
import FeedHealthIndicator from '@/components/FeedHealthIndicator';
import ShipmentInspectorPanel from '@/components/ShipmentInspectorPanel';
import AlertCenter from '@/components/AlertCenter';
import RerouteOptions from '@/components/RerouteOptions';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import TacticalNavRail, { WorkspaceScreen } from '@/components/TacticalNavRail';
import ShipmentManifestView from '@/components/ShipmentManifestView';
import CopilotQuickDock from '@/components/CopilotQuickDock';
import { ProvenanceChip } from '@/components/ProvenanceBadge';
import { getAlerts } from '@/lib/nexafreight';

const GlobeMap = dynamic(() => import('@/components/GlobeMap'), { ssr: false });
const LayerPanel = dynamic(() => import('@/components/LayerPanel'));

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsMobile(w < 768 || (h < 500 && w < 1024));
    };
    check();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);
  return isMobile;
}

const ZuluClock = () => {
  const [time, setTime] = useState('');
  useEffect(() => {
    const iv = setInterval(() => {
      const now = new Date();
      setTime(
        `ZULU ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}Z`,
      );
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  return (
    <span className="font-bold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
      {time || 'ZULU --:--:--Z'}
    </span>
  );
};

const UptimeClock = () => {
  const [uptime, setUptime] = useState('00:00:00');
  const startTime = useRef(0);
  if (startTime.current === 0) startTime.current = Date.now();
  useEffect(() => {
    const iv = setInterval(() => {
      const e = Math.floor((Date.now() - startTime.current) / 1000);
      setUptime(
        `${String(Math.floor(e / 3600)).padStart(2, '0')}:${String(Math.floor((e % 3600) / 60)).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`,
      );
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  return (
    <span className="hidden lg:inline">
      UPTIME: <span className="font-bold tabular-nums" style={{ color: 'var(--ink)' }}>{uptime}</span>
    </span>
  );
};

const ActiveEntityCount = ({ data }: { data: Record<string, unknown[]> }) => {
  const count = !data
    ? 0
    : Object.values(data).reduce<number>(
        (sum, v) => sum + (Array.isArray(v) ? v.length : 0),
        0,
      );
  return (
    <span className="font-bold tabular-nums" style={{ color: 'var(--moss-positive)' }}>
      {count.toLocaleString()}
    </span>
  );
};

const SCREEN_TITLES: Record<WorkspaceScreen, { title: string; subtitle: string }> = {
  map: { title: 'CONTROL TOWER', subtitle: 'LIVE AIS FLEET & MARITIME TELEMETRY' },
  shipments: { title: 'SHIPMENT MANIFEST', subtitle: 'MULTIMODAL WAYBILLS & ROUTE MILESTONES' },
  disruptions: { title: 'DISRUPTION DESK', subtitle: 'INCIDENT RECOVERY & 3-WAY REROUTING' },
  analytics: { title: 'ANALYTICS LEDGER', subtitle: 'OPERATIONAL FINANCE, DEMURRAGE & ESG' },
  calibration: { title: 'CALIBRATION MATRIX', subtitle: 'FEED HEALTH & SENSOR TELEMETRY' },
};

function Dashboard() {
  const router = useRouter();
  const { isAuthenticated, isHydrated, user, clearAuth } = useAuthStore();

  // ── Auth gate ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  // ── Active Workspace Screen (Stitch-inspired) ────────────────────────
  const [activeScreen, setActiveScreen] = useState<WorkspaceScreen>('map');
  const [activeAlertCount, setActiveAlertCount] = useState(0);

  // ── Map state ────────────────────────────────────────────────────────
  const dataRef = useRef<Record<string, unknown[]>>({});
  const data = dataRef.current;

  const [mapView, setMapView] = useState({ zoom: 2.5, latitude: 20 });
  const [flyToLocation, setFlyToLocation] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
    ts: number;
  } | null>(null);
  const [mapProjection, setMapProjection] = useState<'globe' | 'mercator'>('mercator');
  const [mapStyle] = useState<'dark' | 'satellite' | 'paper'>('paper');
  const [globeTheme, setGlobeTheme] = useState<'core' | 'ghost'>('core');
  const [showSplash, setShowSplash] = useState(true);
  const mouseCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const coordsDisplayRef = useRef<HTMLDivElement>(null);

  // ── Panels / drawers ─────────────────────────────────────────────────
  const [showLayers, setShowLayers] = useState(false);
  const [showDesktopSearch, setShowDesktopSearch] = useState(false);

  /** Alert currently being re-routed in the options drawer */
  const [activeOptionsAlertId, setActiveOptionsAlertId] = useState<string | null>(null);
  /** Shipment id open in the right-hand inspector */
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  /** Bumped when a decision executes so every downstream block refetches */
  const [opsVersion, setOpsVersion] = useState(0);

  // ── Layer buckets ───────────────────────────────────────────────────
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    ports: true,
    routes: true,
    maritime: true,
    disruptions: true,
    flights: false,
    weather: false,
    global_incidents: false,
    sdk_sea: false,
    cables: false,
  });

  // Query alert count for Disruption badge
  useEffect(() => {
    let cancelled = false;
    const fetchAlertCount = async () => {
      try {
        const res = await getAlerts({ status: 'OPEN' });
        if (!cancelled && res?.alerts) {
          setActiveAlertCount(res.alerts.length);
        }
      } catch {}
    };
    fetchAlertCount();
    const interval = setInterval(fetchAlertCount, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [opsVersion]);

  // Splash timeout
  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 900);
    return () => clearTimeout(splashTimer);
  }, []);

  const isMobile = useIsMobile();

  // ── Callbacks ────────────────────────────────────────────────────────
  const openInspector = useCallback((shipmentId: string | null) => {
    if (!shipmentId) return;
    setSelectedShipmentId(shipmentId);
  }, []);

  const openOptions = useCallback((alertId: string) => {
    setActiveOptionsAlertId(alertId);
  }, []);

  const handleDecisionExecuted = useCallback(() => {
    setOpsVersion((v) => v + 1);
    setActiveOptionsAlertId(null);
  }, []);

  const handleEntityClick = useCallback(
    (entity: { type?: string; id?: string; shipmentId?: string } | null) => {
      if (!entity) return;
      if (entity.type === 'shipment' && (entity.shipmentId ?? entity.id)) {
        openInspector(entity.shipmentId ?? entity.id ?? null);
      }
    },
    [openInspector],
  );

  const handleMouseCoords = useCallback((coords: { lat: number; lng: number }) => {
    mouseCoordsRef.current = coords;
    if (coordsDisplayRef.current) {
      coordsDisplayRef.current.innerText = `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
    }
  }, []);

  // Keyboard navigation between workspaces (1–5) and tools
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) return;
      if (e.key === '1') setActiveScreen('map');
      if (e.key === '2') setActiveScreen('shipments');
      if (e.key === '3') setActiveScreen('disruptions');
      if (e.key === '4') setActiveScreen('analytics');
      if (e.key === '5') setActiveScreen('calibration');
      if (e.key === 'l' && activeScreen === 'map') setShowLayers((p) => !p);
      if (e.key === 's') setShowDesktopSearch((p) => !p);
      if (e.key === 'r') setFlyToLocation({ lat: 20, lng: 0, ts: Date.now() });
      if (e.key === 'Escape') {
        setSelectedShipmentId(null);
        setActiveOptionsAlertId(null);
        setShowLayers(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeScreen]);

  if (!isHydrated || !isAuthenticated) return null;

  const currentMeta = SCREEN_TITLES[activeScreen] || SCREEN_TITLES.map;

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ backgroundColor: 'var(--paper)', color: 'var(--ink)' }}
    >
      {/* ══════════ 1. FIXED TACTICAL NAVIGATION RAIL (Left 58px) ═════════ */}
      <TacticalNavRail
        activeScreen={activeScreen}
        onSelectScreen={(screen) => {
          setActiveScreen(screen);
          setShowLayers(false);
        }}
        alertCount={activeAlertCount}
        user={user}
        onLogout={() => {
          clearAuth();
          router.replace('/login');
        }}
      />

      {/* ══════════ 2. MAIN APPLICATION WORKSPACE (Offset pl-[58px]) ══════ */}
      <div className="pl-[58px] h-full flex flex-col relative overflow-hidden">
        {/* Top Cockpit Header Bar */}
        <header
          className="h-12 border-b flex items-center justify-between px-4 z-[1040] select-none flex-shrink-0"
          style={{
            backgroundColor: 'var(--paper)',
            borderColor: 'var(--border-hairline)',
          }}
        >
          {/* Left: Active Screen Title & Provenance */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="font-ui text-[13px] font-bold tracking-wider text-[var(--ink)]">
                {currentMeta.title}
              </span>
              <span className="text-[var(--border-hairline)]">/</span>
              <span className="hidden sm:inline font-mono text-[10px] text-[var(--text-secondary)]">
                {currentMeta.subtitle}
              </span>
            </div>

            <span className="hidden md:inline-flex items-center gap-1.5 font-mono text-[10px] px-1.5 py-0.5 rounded-[2px] bg-[var(--bg-subtle)] border border-[var(--border-hairline)] text-[var(--moss-positive)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--moss-positive)] animate-pulse" />
              SAT-LINK: NOMINAL
            </span>
          </div>

          {/* Center: Real telemetry counters */}
          <div className="hidden xl:flex items-center gap-5 text-[10px] font-mono tracking-wider text-[var(--text-secondary)]">
            <ActiveEntityCount data={data} />
            <ZuluClock />
            <UptimeClock />
            <ProvenanceChip provenance="REAL" size="sm" />
          </div>

          {/* Right: Tools & Health */}
          <div className="flex items-center gap-2">
            <FeedHealthIndicator className="hidden md:flex" />

            {/* Quick Map Controls when in Map view */}
            {activeScreen === 'map' && (
              <>
                <button
                  onClick={() => setShowLayers((p) => !p)}
                  aria-pressed={showLayers}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono rounded-[2px] border transition-colors ${
                    showLayers
                      ? 'bg-[var(--cobalt)] text-white border-[var(--cobalt)]'
                      : 'border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--ink)]'
                  }`}
                  title="Toggle Map Layers (L)"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">LAYERS</span>
                </button>

                <button
                  onClick={() => setMapProjection((p) => (p === 'globe' ? 'mercator' : 'globe'))}
                  className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--ink)] border border-[var(--border-hairline)] rounded-[2px] transition-colors"
                  title="Toggle Projection"
                >
                  <Globe className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            <button
              onClick={() => setShowDesktopSearch((p) => !p)}
              className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--ink)] border border-[var(--border-hairline)] rounded-[2px] transition-colors"
              title="Global Search (S)"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* ══════════ WORKSPACE CONTENT AREA ═════════════════════════ */}
        <div className="flex-1 relative overflow-hidden">
          {/* VIEW 1: CONTROL TOWER MAP (Always mounted in background for zero-lag) */}
          <div
            className={`absolute inset-0 flex flex-col transition-opacity duration-150 ${
              activeScreen === 'map'
                ? 'opacity-100 pointer-events-auto z-10'
                : 'opacity-0 pointer-events-none -z-10'
            }`}
          >
            {/* Headline KPI Band */}
            <KpiBand window="month" />

            {/* Map Canvas */}
            <div className="flex-1 relative">
              <GlobeMap
                data={data}
                activeLayers={activeLayers}
                onEntityClick={handleEntityClick}
                onMouseCoords={handleMouseCoords}
                onViewStateChange={(vs) => setMapView({ zoom: vs.zoom, latitude: vs.latitude })}
                flyToLocation={flyToLocation}
                projection={mapProjection}
                mapStyle={mapStyle}
                demoMode={false}
                theme={globeTheme}
              />

              {/* Bottom-left: Coordinate Readout & Scale */}
              <div
                className="absolute bottom-6 left-4 z-[1030] flex flex-col gap-1 text-[10px] font-mono select-none"
                style={{ color: 'var(--text-secondary)' }}
              >
                <div
                  ref={coordsDisplayRef}
                  className="px-1.5 py-0.5 rounded-[2px] border font-mono"
                  style={{
                    backgroundColor: 'rgba(246, 247, 244, 0.95)',
                    borderColor: 'var(--border-hairline)',
                    color: 'var(--ink)',
                  }}
                >
                  —, —
                </div>
                <ScaleBar zoom={mapView.zoom} latitude={mapView.latitude} />
              </div>

              {/* Layer Panel Slide-Over Dock (When toggled on Map) */}
              {showLayers && (
                <div className="absolute top-3 left-3 z-[1050]">
                  <LayerPanel
                    data={data}
                    activeLayers={activeLayers}
                    setActiveLayers={setActiveLayers}
                    onClose={() => setShowLayers(false)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* VIEW 2: SHIPMENT MANIFEST & WAYBILLS */}
          {activeScreen === 'shipments' && (
            <div className="absolute inset-0 z-20 overflow-hidden bg-[var(--paper)]">
              <ShipmentManifestView
                onSelectShipment={(id) => openInspector(id)}
                selectedShipmentId={selectedShipmentId}
              />
            </div>
          )}

          {/* VIEW 3: DISRUPTION CENTER & REROUTE DESK */}
          {activeScreen === 'disruptions' && (
            <div className="absolute inset-0 z-20 overflow-hidden bg-[var(--paper)] flex flex-col p-6">
              <div className="mb-4">
                <h2 className="font-ui text-[18px] font-semibold text-[var(--ink)]">
                  Active Disruption Alerts & Autonomous Recovery Desk
                </h2>
                <p className="font-ui text-[12px] text-[var(--text-secondary)] mt-0.5">
                  Monitor active operational exceptions, canal bottlenecks, and execute 3-way deterministic recovery options.
                </p>
              </div>

              <div className="flex-1 flex gap-6 overflow-hidden relative">
                {/* Embedded Alert Queue Panel */}
                <div className="w-[380px] flex-shrink-0 flex flex-col">
                  <AlertCenter
                    onOpenInspector={openInspector}
                    onOpenOptions={openOptions}
                    refreshKey={opsVersion}
                    defaultOpen
                  />
                </div>

                {/* Right: Active Reroute Planner or Guidance */}
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
                        Select an Alert to Evaluate Recovery Scenarios
                      </h3>
                      <p className="font-ui text-[12px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                        Click on any active incident in the queue to calculate the 3 recovery trade-offs: 
                        <strong className="text-[var(--ink)]"> Accept Delay</strong>, 
                        <strong className="text-[var(--ink)]"> Port Divert</strong>, or 
                        <strong className="text-[var(--ink)]"> Modal Shift</strong>.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: OPERATIONAL ANALYTICS LEDGER */}
          {activeScreen === 'analytics' && (
            <div className="absolute inset-0 z-20 overflow-hidden bg-[var(--paper)]">
              <ErrorBoundary name="Analytics">
                <AnalyticsDashboard
                  openKey={opsVersion}
                  onClose={() => setActiveScreen('map')}
                  onOpenInspector={(id) => openInspector(id)}
                />
              </ErrorBoundary>
            </div>
          )}

          {/* VIEW 5: SENSOR CALIBRATION & FEED HEALTH */}
          {activeScreen === 'calibration' && (
            <div className="absolute inset-0 z-20 overflow-y-auto bg-[var(--paper)] p-8">
              <div className="max-w-3xl mx-auto flex flex-col gap-6">
                <div>
                  <h2 className="font-ui text-[20px] font-semibold text-[var(--ink)]">
                    Sensor Calibration & Feed Health
                  </h2>
                  <p className="font-ui text-[12px] text-[var(--text-secondary)] mt-1">
                    Telemetry feeds ingestion status, AISStream WebSocket health, and dead-reckoning position interpolator metrics.
                  </p>
                </div>

                <div
                  className="p-6 rounded-[3px] border"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-hairline)',
                  }}
                >
                  <FeedHealthIndicator intervalMs={10000} />
                </div>
              </div>
            </div>
          )}

          {/* ══════════ SHARED OVERLAYS (Drawers & Search) ═════════════ */}
          {/* Global Search Dialog */}
          {showDesktopSearch && (
            <div className="absolute top-4 left-6 z-[1065]">
              <SearchBar
                onLocate={(lat, lng, zoom) => {
                  setFlyToLocation({ lat, lng, zoom, ts: Date.now() });
                  setActiveScreen('map');
                  setShowDesktopSearch(false);
                }}
                alwaysExpanded
              />
            </div>
          )}

          {/* Shipment Detail Inspector Drawer */}
          <ShipmentInspectorPanel
            shipmentId={selectedShipmentId}
            onClose={() => setSelectedShipmentId(null)}
            refreshKey={opsVersion}
            viewerRole={user?.role}
          />
        </div>
      </div>

      {/* ══════════ 3. PROJECT44-STYLE PERSISTENT AI COPILOT HUD ═══════ */}
      <CopilotQuickDock activeShipmentId={selectedShipmentId} />

      {/* ══════════ 4. KEYBOARD SHORTCUTS LISTENER ════════════════════ */}
      <KeyboardShortcuts />

      {/* ══════════ 5. FIRST-PAINT SPLASH VEIL ════════════════════════ */}
      {showSplash && (
        <div
          className="absolute inset-0 z-[2000] flex items-center justify-center pointer-events-none transition-opacity duration-300"
          style={{ backgroundColor: 'var(--paper)' }}
        >
          <div className="text-center">
            <div
              className="font-mono font-bold tracking-[0.35em] text-xl"
              style={{ color: 'var(--ink)' }}
            >
              NEXAFREIGHT
            </div>
            <div
              className="font-mono text-[10px] tracking-[0.25em] mt-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              AUTONOMOUS LOGISTICS CONTROL TOWER
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <ErrorBoundary name="NexaFreight Control Tower">
      <Dashboard />
    </ErrorBoundary>
  );
}
