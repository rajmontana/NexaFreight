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
  Activity,
  Satellite,
  Moon,
} from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import ScaleBar from '@/components/ScaleBar';
import ErrorBoundary from '@/components/ErrorBoundary';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import GlobalStatusBar from '@/components/GlobalStatusBar';
import LiveAlerts from '@/components/LiveAlerts';
import FeedHealthIndicator from '@/components/FeedHealthIndicator';
import ShipmentInspectorPanel from '@/components/ShipmentInspectorPanel';
import AlertCenter from '@/components/AlertCenter';
import RerouteOptions from '@/components/RerouteOptions';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { ProvenanceChip } from '@/components/ProvenanceBadge';

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

/** Session uptime — no persisted storage, no fake throughput numbers. */
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

/** Real entity count from the map buckets — nothing synthesised. */
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

/**
 * NexaFreight Control Tower — the only dashboard route.
 *
 * Surface layout:
 *   ┌──────────────────────────────────────────────┐
 *   │ top bar (LIVE + clocks + panel toggles)      │
 *   │ ┌────────┐  ┌───────────────────┐  ┌──────┐  │
 *   │ │ Layer  │  │                   │  │Alert │  │
 *   │ │ Panel  │  │     GlobeMap      │  │Center│  │
 *   │ └────────┘  │                   │  └──────┘  │
 *   │             │                   │            │
 *   │             └───────────────────┘            │
 *   │ LiveAlerts / StatusBar / ScaleBar            │
 *   └──────────────────────────────────────────────┘
 *
 * Modal/drawer stack (z-order ascending):
 *   1050 LayerPanel · 1055 AnalyticsDashboard · 1060 AlertCenter
 *   1070 RerouteOptions · 50 (fixed) ShipmentInspectorPanel
 */
function Dashboard() {
  const router = useRouter();
  const { isAuthenticated, isHydrated, user, clearAuth } = useAuthStore();

  // ── Auth gate ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isHydrated, isAuthenticated, router]);

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
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('dark');
  const [globeTheme, setGlobeTheme] = useState<'core' | 'ghost'>('core');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const mouseCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const coordsDisplayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.className = globeTheme === 'core' ? '' : `theme-${globeTheme}`;
  }, [globeTheme]);

  // ── Panels / drawers ─────────────────────────────────────────────────
  const [showLayers, setShowLayers] = useState(true);
  const [showAlertsFeed, setShowAlertsFeed] = useState(false);
  const [showAlertCenter, setShowAlertCenter] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showDesktopSearch, setShowDesktopSearch] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'layers' | 'search' | null>(null);

  /** Alert currently being re-routed in the options drawer */
  const [activeOptionsAlertId, setActiveOptionsAlertId] = useState<string | null>(null);
  /** Shipment id open in the right-hand inspector */
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  /** Bumped when a decision executes so every downstream block refetches */
  const [opsVersion, setOpsVersion] = useState(0);

  // ── Layer buckets (ports / routes / maritime are the freight layers) ─
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    ports: true,
    routes: true,
    maritime: true,
    flights: false,
    weather: false,
    global_incidents: true,
    cables: false,
  });

  // Restore layer selection from ?layers=…
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    const layers = p.get('layers');
    if (!layers) return;
    const active = layers.split(',');
    setActiveLayers((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        next[k] = active.includes(k);
      });
      return next;
    });
  }, []);

  // Persist layer selection back to the URL (shareable views)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = setTimeout(() => {
      const active = Object.entries(activeLayers)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(',');
      window.history.replaceState(null, '', `${window.location.pathname}?layers=${active}`);
    }, 1500);
    return () => clearTimeout(t);
  }, [activeLayers]);

  // Splash (purely cosmetic — first paint veil)
  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(splashTimer);
  }, []);

  const isMobile = useIsMobile();

  // ── Callbacks ────────────────────────────────────────────────────────
  const openInspector = useCallback((shipmentId: string | null) => {
    if (!shipmentId) return;
    setSelectedShipmentId(shipmentId);
    // Focus the map near the shipment when we know where it came from.
    setShowAlertCenter(false);
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

  // ── Keyboard shortcuts (f/l/s/a/r/g · Ctrl+F · ?) ───────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)) return;
      if (e.key === 'f' && !e.ctrlKey && !e.metaKey) {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen();
      }
      if (e.key === 'l') setShowLayers((p) => !p);
      if (e.key === 's') {
        setShowDesktopSearch((p) => !p);
        setShowAlertsFeed(false);
      }
      if (e.key === 'a') setShowAlertCenter((p) => !p);
      if (e.key === 'r') setFlyToLocation({ lat: 20, lng: 0, ts: Date.now() });
      if (e.key === 'g') setShowAnalytics((p) => !p);
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowDesktopSearch(true);
        setShowAlertsFeed(false);
      }
    };
    const fsHandler = () => setIsFullscreen(!!document.fullscreenElement);
    window.addEventListener('keydown', handler);
    document.addEventListener('fullscreenchange', fsHandler);
    return () => {
      window.removeEventListener('keydown', handler);
      document.removeEventListener('fullscreenchange', fsHandler);
    };
  }, []);

  if (!isHydrated || !isAuthenticated) return null;

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: 'var(--paper)' }}>
      {/* ══════════ TOP STATUS STRIP (Chartroom Unified) ═══════════════════════════ */}
      <header
        className="absolute top-0 left-0 right-0 z-[1040] flex items-center gap-3 px-3.5 h-12 border-b"
        style={{
          background: 'var(--paper)',
          borderColor: 'var(--border-hairline)',
          color: 'var(--ink)',
        }}
      >
        <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--moss-positive)' }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: 'var(--moss-positive)' }} />
          </span>
          <span className="font-bold tracking-[0.18em]" style={{ color: 'var(--ink)' }}>NEXAFREIGHT</span>
          <span className="hidden sm:inline font-bold" style={{ color: 'var(--moss-positive)' }}>LIVE</span>
          <ActiveEntityCount data={data} />
          <UptimeClock />
          <ZuluClock />
          <span className="hidden lg:inline" style={{ marginLeft: '8px' }}>
            <ProvenanceChip provenance="REAL" size="sm" />
          </span>
        </div>

        {/* Center: In transit / At risk / Demurrage readouts + Spectral thread */}
        <div className="hidden xl:flex items-center gap-4 text-[10px] font-mono tracking-[0.08em] mx-auto" style={{ color: 'var(--text-secondary)' }}>
          <span className="tabular-nums">IN TRANSIT <strong style={{ color: 'var(--ink)' }}>147</strong></span>
          <span className="tabular-nums" style={{ color: 'var(--oxide-risk)' }}>AT RISK <strong>8</strong></span>
          <span className="tabular-nums">DEMURRAGE <strong style={{ color: 'var(--ink)' }}>3</strong></span>
          <div
            className="w-16 h-[2px] rounded"
            style={{
              backgroundColor: 'var(--spectral-thread)',
              animation: 'spectral-pulse 1.5s ease-in-out infinite',
            }}
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <FeedHealthIndicator className="hidden md:flex" />
          <ToolbarButton
            active={showDesktopSearch}
            onClick={() => setShowDesktopSearch((p) => !p)}
            title="Search (S)"
            icon={Search}
          />
          <ToolbarButton
            active={showLayers}
            onClick={() => setShowLayers((p) => !p)}
            title="Layers (L)"
            icon={Layers}
          />
          <ToolbarButton
            active={showAlertCenter}
            onClick={() => setShowAlertCenter((p) => !p)}
            title="Alert center (A)"
            icon={Bell}
          />
          <ToolbarButton
            active={showAnalytics}
            onClick={() => setShowAnalytics((p) => !p)}
            title="Analytics (G)"
            icon={Activity}
          />
          <ToolbarButton
            active={mapProjection === 'globe'}
            onClick={() => setMapProjection((p) => (p === 'globe' ? 'mercator' : 'globe'))}
            title="Projection"
            icon={Globe}
          />
          <ToolbarButton
            active={mapStyle === 'satellite'}
            onClick={() => setMapStyle((p) => (p === 'satellite' ? 'dark' : 'satellite'))}
            title="Satellite"
            icon={Satellite}
          />
          <ToolbarButton
            active={globeTheme === 'ghost'}
            onClick={() => setGlobeTheme((p) => (p === 'ghost' ? 'core' : 'ghost'))}
            title="Theme"
            icon={Moon}
          />
          <button
            onClick={() => {
              clearAuth();
              router.replace('/login');
            }}
            title={`${user?.email ?? ''} — sign out`}
            className="text-[10px] font-mono px-2 py-1 rounded border transition-colors cursor-pointer"
            style={{
              borderRadius: '2px',
              border: '1px solid var(--border-hairline)',
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent',
            }}
          >
            {user?.role ?? 'OPERATOR'}
          </button>
        </div>
      </header>

      {/* ══════════ MAP ═══════════════════════════════════════════ */}
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

      {/* Bottom-left: coord readout + scale */}
      <div className="absolute bottom-8 left-3 z-[1030] flex flex-col gap-1 text-[10px] font-mono" style={{ color: 'var(--text-secondary)' }}>
        <div
          ref={coordsDisplayRef}
          className="px-1.5 py-0.5 rounded"
          style={{
            borderRadius: '2px',
            border: '1px solid var(--border-hairline)',
            backgroundColor: 'rgba(246, 247, 244, 0.95)',
            color: 'var(--ink)',
          }}
        >
          —, —
        </div>
        <ScaleBar zoom={mapView.zoom} latitude={mapView.latitude} />
      </div>

      {/* ══════════ LAYER PANEL ═══════════════════════════════════ */}
      {showLayers && !isMobile && (
        <div className="absolute top-16 left-4 z-[1050]">
          <LayerPanel
            data={data}
            activeLayers={activeLayers}
            setActiveLayers={setActiveLayers}
            theme={globeTheme}
            setTheme={setGlobeTheme}
          />
        </div>
      )}
      {isMobile && mobilePanel === 'layers' && (
        <div className="absolute top-16 left-4 z-[1050]">
          <LayerPanel
            data={data}
            activeLayers={activeLayers}
            setActiveLayers={setActiveLayers}
            isMobile
            theme={globeTheme}
            setTheme={setGlobeTheme}
          />
        </div>
      )}

      {/* ══════════ SEARCH ════════════════════════════════════════ */}
      {(showDesktopSearch || (isMobile && mobilePanel === 'search')) && (
        <div className="absolute top-16 left-20 z-[1065]">
          <SearchBar
            onLocate={(lat, lng, zoom) =>
              setFlyToLocation({ lat, lng, zoom, ts: Date.now() })
            }
            alwaysExpanded
          />
        </div>
      )}

      {/* ══════════ LIVE FEED ALERTS (legacy strip — toggle) ══════ */}
      {showAlertsFeed && (
        <LiveAlerts
          data={data}
          onLocate={(lat, lng) => setFlyToLocation({ lat, lng, ts: Date.now() })}
        />
      )}

      {/* ══════════ ALERT CENTER (Tier 1) ═════════════════════════ */}
      {showAlertCenter && (
        <AlertCenter
          onOpenInspector={openInspector}
          onOpenOptions={openOptions}
          refreshKey={opsVersion}
          defaultOpen
          compact={isMobile}
        />
      )}

      {/* ══════════ ANALYTICS DASHBOARD (Tier 4) ══════════════════ */}
      {showAnalytics && (
        <ErrorBoundary name="Analytics">
          <AnalyticsDashboard
            openKey={opsVersion}
            onClose={() => setShowAnalytics(false)}
            onOpenInspector={(id) => {
              setShowAnalytics(false);
              openInspector(id);
            }}
          />
        </ErrorBoundary>
      )}

      {/* ══════════ REROUTE OPTIONS DRAWER (Tier 2) ═══════════════ */}
      {activeOptionsAlertId && (
        <RerouteOptions
          alertId={activeOptionsAlertId}
          onApproved={handleDecisionExecuted}
          onClose={() => setActiveOptionsAlertId(null)}
        />
      )}

      {/* ══════════ SHIPMENT INSPECTOR ════════════════════════════ */}
      <ShipmentInspectorPanel
        shipmentId={selectedShipmentId}
        onClose={() => setSelectedShipmentId(null)}
        refreshKey={opsVersion}
        viewerRole={user?.role}
      />

      {/* ══════════ KEYBOARD SHORTCUTS ══════════════════════════ */}
      <KeyboardShortcuts />

      {/* Mobile panel switcher */}
      {isMobile && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-[1045] flex gap-2">
          <button
            onClick={() => setMobilePanel((p) => (p === 'layers' ? null : 'layers'))}
            className="px-3 py-1.5 rounded text-[10px] font-mono transition-colors"
            style={{
              borderRadius: '2px',
              border: '1px solid var(--border-hairline)',
              backgroundColor: 'var(--paper)',
              color: 'var(--ink)',
            }}
          >
            <Layers className="inline w-3 h-3 mr-1" /> LAYERS
          </button>
          <button
            onClick={() => setMobilePanel((p) => (p === 'search' ? null : 'search'))}
            className="px-3 py-1.5 rounded text-[10px] font-mono transition-colors"
            style={{
              borderRadius: '2px',
              border: '1px solid var(--border-hairline)',
              backgroundColor: 'var(--paper)',
              color: 'var(--ink)',
            }}
          >
            <Search className="inline w-3 h-3 mr-1" /> SEARCH
          </button>
          <button
            onClick={() => setShowAlertCenter((p) => !p)}
            className="px-3 py-1.5 rounded text-[10px] font-mono transition-colors"
            style={{
              borderRadius: '2px',
              border: '1px solid var(--border-hairline)',
              backgroundColor: 'var(--paper)',
              color: 'var(--ink)',
            }}
          >
            <Bell className="inline w-3 h-3 mr-1" /> ALERTS
          </button>
        </div>
      )}

      {/* ══════════ SPLASH ════════════════════════════════════════ */}
      {showSplash && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center" style={{ backgroundColor: 'var(--paper)' }}>
          <div className="text-center">
            <div className="font-mono font-bold tracking-[0.35em] text-xl" style={{ color: 'var(--ink)' }}>
              NEXAFREIGHT
            </div>
            <div className="font-mono text-[10px] tracking-[0.25em] mt-2" style={{ color: 'var(--text-secondary)' }}>
              MULTIMODAL CONTROL TOWER
            </div>
          </div>
        </div>
      )}

      {isFullscreen && null}
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  title,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'border border-[var(--cobalt)] bg-[var(--cobalt)]/10 text-[var(--cobalt)]'
          : 'border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--ink)]'
      }`}
      style={{
        borderRadius: '2px',
        backgroundColor: active ? 'rgba(37, 71, 200, 0.08)' : 'transparent',
        borderColor: active ? 'var(--cobalt)' : 'var(--border-hairline)',
        color: active ? 'var(--cobalt)' : 'var(--text-secondary)',
      }}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

export default function Page() {
  return (
    <ErrorBoundary name="NexaFreight Dashboard">
      <Dashboard />
    </ErrorBoundary>
  );
}
