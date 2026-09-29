'use client';

import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, Sun, AlertTriangle,
  CloudLightning, Ship, Network, Database, Ghost,
  Tv, Radio, Mountain, Anchor, Megaphone, SlidersHorizontal
} from 'lucide-react';
// StyleStudio removed (archived — not core logistics)

interface LayerPanelProps {
  data: any;
  activeLayers: any;
  setActiveLayers: React.Dispatch<React.SetStateAction<any>>;
  isMobile?: boolean;
  theme?: 'core' | 'ghost';
  setTheme?: (theme: 'core' | 'ghost') => void;
  /** Server-side capabilities, e.g. { cloudflare: true }. Layers declaring a
   *  `requires` key stay hidden until the matching capability is present. */
  capabilities?: Record<string, boolean>;
}

interface LayerDef {
  key: string;
  label: string;
  dataKey: string;
  /** Reads a bucket out of data.category_counts instead of a top-level array. */
  catKey?: string;
  /** Capability that must be configured server-side for this layer to appear. */
  requires?: string;
  /** Key of the layer this one modifies. Renders indented beneath it, and reads
   *  as inert while that parent is off — it has nothing to act on. */
  parent?: string;
}

interface LayerGroupDef {
  label: string;
  fullLabel: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  layers: LayerDef[];
}

const LAYER_GROUPS: LayerGroupDef[] = [
  {
    label: 'FREIGHT',
    fullLabel: 'NEXAFREIGHT LOGISTICS',
    icon: Anchor,
    layers: [
      { key: 'ports', label: 'Ports & Congestion', dataKey: '' },
      { key: 'routes', label: 'Shipment Routes', dataKey: '' },
    ],
  },
  {
    label: 'SDK',
    fullLabel: 'NexaFreight SDK',
    icon: Network,
    layers: [
      { key: 'sdk_sea', label: 'Maritime Lines', dataKey: 'sdk_entities' },
    ],
  },
  {
    label: 'MARITIME',
    fullLabel: 'MARITIME',
    icon: Ship,
    layers: [
      { key: 'maritime', label: 'Maritime / Naval', dataKey: 'maritime_ships,maritime_ports,maritime_chokepoints' },
    ],
  }
];

/* ── Minimal Toggle Switch ── */
/**
 * Presentational only. The row around it is the button, and a button inside a
 * button is invalid HTML — the browser reparents it, which breaks hydration and
 * silently drops the click handler on the inner control.
 */
function ToggleSwitch({ active }: { active: boolean }) {
  return (
    <span
      role="presentation"
      className="relative flex-shrink-0 block"
      style={{ width: 28, height: 14 }}
    >
      <div
        className="absolute inset-0 rounded-full transition-all duration-300"
        style={{
          background: active ? 'transparent' : 'transparent',
          border: active ? '1px solid var(--cobalt)' : '1px solid var(--border-hairline)',
          boxShadow: 'none',
        }}
      />
      <motion.div
        className="absolute top-[2px] rounded-full"
        style={{
          width: 10,
          height: 10,
          background: active ? 'var(--cobalt)' : 'var(--text-secondary)',
          boxShadow: 'none',
        }}
        animate={{ left: active ? 16 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </span>
  );
}

/**
 * The elbow that ties a sub-layer row to the layer above it. Indentation alone
 * reads as a typo at this size; the line is what says "this belongs to that".
 */
function SubLayerStem() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-[6px] top-0 h-1/2 w-[8px] rounded-bl-[3px] border-b border-l"
      style={{ borderColor: 'var(--border-hairline)' }}
    />
  );
}

function LayerPanel({ data, activeLayers, setActiveLayers, isMobile, theme = 'core', setTheme, capabilities = {} }: LayerPanelProps) {
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  /**
   * A pinned group stays open when the pointer leaves. Hover-only flyouts are
   * fine to glance at and impossible to work in — reaching for a toggle at the
   * far edge closes the thing you were reaching for.
   */
  const [pinnedGroup, setPinnedGroup] = useState<string | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);

  useEffect(() => {
    if (!pinnedGroup) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPinnedGroup(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pinnedGroup]);

  const toggle = (key: string) => setActiveLayers((prev: any) => ({ ...prev, [key]: !prev[key] }));

  /** Switch a whole group at once — off if any are on, otherwise all on. */
  const toggleGroup = (layers: LayerDef[]) => {
    const anyOn = layers.some(l => activeLayers[l.key]);
    setActiveLayers((prev: any) => {
      const next = { ...prev };
      for (const l of layers) next[l.key] = !anyOn;
      return next;
    });
  };

  /* Drop layers whose backing capability is not configured, then drop any group
     left with nothing to show. */
  const visibleGroups = LAYER_GROUPS.map(g => ({
    ...g,
    layers: g.layers.filter(l => !l.requires || capabilities[l.requires]),
  })).filter(g => g.layers.length > 0);

  const getCount = (dk: string, catKey?: string): number | null => {
    if (!dk) return null;
    if (catKey && data.category_counts) {
      return data.category_counts[catKey] || 0;
    }
    let total = 0;
    let found = false;
    for (const k of dk.split(',')) {
      if (data[k] && Array.isArray(data[k])) {
        total += data[k].length;
        found = true;
      }
    }
    return found ? total : null;
  };

  /* ── MOBILE ── */
  if (isMobile) {
    return (
      <div className="flex flex-col gap-5 py-2">
        {visibleGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            <div className="text-[10px] font-mono tracking-[0.2em] uppercase pb-1.5" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-hairline)' }}>
              {group.fullLabel}
            </div>
            <div className="flex flex-col gap-1">
              {group.layers.map((layer) => {
                const isLayerActive = activeLayers[layer.key];
                const count = getCount(layer.dataKey, layer.catKey);
                const dormant = !!layer.parent && !activeLayers[layer.parent];
                return (
                  <button
                    key={layer.key}
                    onClick={() => toggle(layer.key)}
                    aria-pressed={!!isLayerActive}
                    className={`relative w-full flex items-center gap-3 py-2 rounded-md text-left transition-colors ${layer.parent ? 'pl-[22px] pr-1' : 'px-1'} ${dormant ? 'opacity-40' : ''}`}
                    style={{
                      backgroundColor: isLayerActive ? 'rgba(37, 71, 200, 0.1)' : 'transparent',
                    }}
                  >
                    {layer.parent && <SubLayerStem />}
                    <ToggleSwitch active={!!isLayerActive} />
                    <span className={`text-[11px] font-mono uppercase tracking-wider flex-1 transition-colors`} style={{ color: isLayerActive ? 'var(--ink)' : 'var(--text-secondary)' }}>
                      {layer.label}
                    </span>
                    {count !== null && (
                      <span className="text-[10px] font-mono tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                        {count.toLocaleString()}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* MOBILE STYLE STUDIO */}
        <div className="flex items-center justify-between mt-2 pt-3 px-1" style={{ borderTop: '1px solid var(--border-hairline)' }}>
          <span className="text-[10px] font-mono tracking-[0.2em] text-[var(--text-secondary)] uppercase">Style Studio</span>
          <button
            onClick={() => setStudioOpen(o => !o)}
            aria-pressed={studioOpen}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{
              background: studioOpen ? 'rgba(37, 71, 200, 0.15)' : 'transparent',
              boxShadow: 'none',
              border: studioOpen ? '1px solid var(--cobalt)' : '1px solid var(--border-hairline)',
            }}
          >
            <SlidersHorizontal className="w-4 h-4" style={{ color: studioOpen ? 'var(--cobalt)' : 'var(--text-secondary)' }} />
          </button>
        </div>
          {/* StyleStudio removed */}

        {/* MOBILE GHOST TOGGLE */}
        {setTheme && (
          <div className="flex items-center justify-between pt-3 px-1" style={{ borderTop: '1px solid var(--border-hairline)' }}>
            <span className="text-[10px] font-mono tracking-[0.2em] text-[var(--text-secondary)] uppercase">Ghost Protocol</span>
            <button
              onClick={() => setTheme(theme === 'core' ? 'ghost' : 'core')}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={{
                background: theme === 'ghost' ? 'rgba(37, 71, 200, 0.15)' : 'transparent',
                boxShadow: 'none',
                border: theme === 'ghost' ? '1px solid var(--cobalt)' : '1px solid var(--border-hairline)',
              }}
            >
              <Ghost className="w-4 h-4" style={{ color: theme === 'ghost' ? 'var(--cobalt)' : 'var(--text-secondary)' }} />
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── DESKTOP ── */
  return (
    <motion.div
      initial={{ x: -60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 30, stiffness: 200, delay: 0.2 }}
      className="absolute top-0 left-0 h-full w-[48px] flex flex-col items-center pt-24 pb-6 z-50 pointer-events-auto"
      style={{
        background: 'var(--paper)',
        borderRight: '1px solid var(--border-hairline)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      }}
    >
      <div className="flex-1 flex flex-col items-center gap-1">
        {visibleGroups.map((group) => {
          /* Sub-layers modify a parent rather than draw anything of their own,
             so they do not count towards the rail's reading. */
          const counted = group.layers.filter(l => !l.parent);
          const groupActive = counted.some(l => activeLayers[l.key]);
          const isHovered = hoveredGroup === group.label;
          const Icon = group.icon;

          const activeCount = counted.filter(l => activeLayers[l.key]).length;
          const isPinned = pinnedGroup === group.label;
          const isOpen = isHovered || isPinned;

          return (
            <div
              key={group.label}
              className="relative flex items-center justify-center"
              onMouseEnter={() => setHoveredGroup(group.label)}
              onMouseLeave={() => setHoveredGroup(null)}
            >
              {/* A real button, not a div: this is keyboard reachable, focusable
                  and announced. Clicking pins the flyout open so it can be
                  worked in rather than only glanced at. */}
              <button
                onClick={() => setPinnedGroup(isPinned ? null : group.label)}
                aria-expanded={isOpen}
                aria-label={`${group.fullLabel}${activeCount ? ` — ${activeCount} active` : ''}`}
                title={group.fullLabel}
                className="relative w-10 h-10 flex items-center justify-center cursor-pointer rounded-[4px] transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--cobalt)]"
                style={{
                  background: isPinned
                    ? 'rgba(37, 71, 200, 0.1)'
                    : isHovered ? 'rgba(37, 71, 200, 0.05)' : 'transparent',
                  border: isPinned ? '1px solid var(--cobalt)' : '1px solid var(--border-hairline)',
                }}
              >
                <Icon
                  className="transition-all duration-300"
                  style={{
                    width: 16,
                    height: 16,
                    color: groupActive
                      ? 'var(--ink)'
                      : isOpen
                        ? 'var(--text-secondary)'
                        : 'var(--text-secondary)',
                    filter: 'none',
                  }}
                />

                {/* How many layers in this group are live. Without it the rail
                    gives no reading at all until each icon is hovered in turn. */}
                {activeCount > 0 && (
                  <span
                    className="absolute top-1 right-1 min-w-[13px] h-[13px] px-[3px] rounded-full flex items-center justify-center text-[9px] font-mono tabular-nums leading-none"
                    style={{
                      background: 'var(--cobalt)',
                      color: 'white',
                      boxShadow: 'none',
                    }}
                  >
                    {activeCount}
                  </span>
                )}
              </button>

              {/* Flyout (LEFT side) */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: -8, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: -4, filter: 'blur(2px)' }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute left-[52px] top-1/2 -translate-y-1/2 min-w-[220px] p-3 z-[100] pointer-events-auto"
                    style={{
                      borderRadius: 4,
                      background: 'var(--paper)',
                      backdropFilter: 'none',
                      WebkitBackdropFilter: 'none',
                      border: '1px solid var(--border-hairline)',
                      boxShadow: 'none',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2.5 pb-1.5" style={{ borderBottom: '1px solid var(--border-hairline)' }}>
                      <span className="text-[10px] font-mono tracking-[0.2em] uppercase flex-1" style={{ color: 'var(--text-secondary)' }}>
                        {group.fullLabel}
                      </span>
                      {/* Batch toggle all layers in group */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleGroup(group.layers); }}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider transition-colors"
                        style={{
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-hairline)',
                          background: 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLElement).style.borderColor = 'var(--ink)';
                          (e.target as HTMLElement).style.color = 'var(--ink)';
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLElement).style.borderColor = 'var(--border-hairline)';
                          (e.target as HTMLElement).style.color = 'var(--text-secondary)';
                        }}
                      >
                        {activeCount > 0 ? 'NONE' : 'ALL'}
                      </button>
                      {isPinned && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setPinnedGroup(null); }}
                          aria-label="Close"
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors"
                          style={{
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-hairline)',
                            background: 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            (e.target as HTMLElement).style.borderColor = 'var(--ink)';
                            (e.target as HTMLElement).style.color = 'var(--ink)';
                          }}
                          onMouseLeave={(e) => {
                            (e.target as HTMLElement).style.borderColor = 'var(--border-hairline)';
                            (e.target as HTMLElement).style.color = 'var(--text-secondary)';
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {group.layers.map((layer) => {
                        const isLayerActive = activeLayers[layer.key];
                        const count = getCount(layer.dataKey, layer.catKey);
                        const dormant = !!layer.parent && !activeLayers[layer.parent];

                        return (
                          <button
                            key={layer.key}
                            onClick={() => toggle(layer.key)}
                            aria-pressed={!!isLayerActive}
                            title={dormant ? 'Turn the layer above on to use this' : undefined}
                            className={`relative w-full flex items-center gap-3 py-1.5 rounded-md transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--cobalt)] ${layer.parent ? 'pl-[22px] pr-1' : 'px-1'} ${dormant ? 'opacity-40' : ''}`}
                            style={{
                              backgroundColor: isLayerActive ? 'rgba(37, 71, 200, 0.1)' : 'transparent',
                            }}
                          >
                            {layer.parent && <SubLayerStem />}
                            <ToggleSwitch active={!!isLayerActive} />
                            <span className={`text-[11px] font-mono uppercase tracking-wider flex-1 transition-colors duration-200`} style={{ color: isLayerActive ? 'var(--ink)' : 'var(--text-secondary)' }}>
                              {layer.label}
                            </span>
                            {count !== null && (
                              <span className={`text-[10px] font-mono tabular-nums transition-colors`} style={{ color: isLayerActive ? 'var(--ink)' : 'var(--text-secondary)' }}>
                                {count.toLocaleString()}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Subtle separator */}
      <div className="w-5 h-px my-2" style={{ backgroundColor: 'var(--border-hairline)' }} />

      {/* Style Studio */}
      <button
        onClick={() => setStudioOpen(o => !o)}
        aria-pressed={studioOpen}
        className="w-10 h-10 flex items-center justify-center transition-all duration-200 cursor-pointer"
        style={{
          borderRadius: 4,
          background: studioOpen ? 'rgba(37, 71, 200, 0.1)' : 'transparent',
          border: studioOpen ? '1px solid var(--cobalt)' : '1px solid var(--border-hairline)',
        }}
        title="Style Studio"
      >
        <SlidersHorizontal
          className="transition-all duration-500"
          style={{
            width: 15,
            height: 15,
            color: studioOpen ? 'var(--cobalt)' : 'var(--text-secondary)',
            filter: 'none',
          }}
        />
      </button>
      {/* StyleStudio removed */}

      {/* Ghost Protocol Toggle */}
      {setTheme && (
        <button
          onClick={() => setTheme(theme === 'core' ? 'ghost' : 'core')}
          className="w-10 h-10 flex items-center justify-center transition-all duration-200 cursor-pointer"
          style={{
            borderRadius: 4,
            background: theme === 'ghost' ? 'rgba(37, 71, 200, 0.1)' : 'transparent',
            border: theme === 'ghost' ? '1px solid var(--cobalt)' : '1px solid var(--border-hairline)',
          }}
          title="Ghost Protocol"
        >
          <Ghost
            className="transition-all duration-500"
            style={{
              width: 15,
              height: 15,
              color: theme === 'ghost' ? 'var(--cobalt)' : 'var(--text-secondary)',
              filter: 'none',
            }}
          />
        </button>
      )}
    </motion.div>
  );
}

export default memo(LayerPanel);
