/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  POLYBOLOS SDK — Client Controller                              ║
 * ║  Unified Intelligence Fusion Engine                             ║
 * ║                                                                 ║
 * ║  Subscribes to NexaFreight feeds + external providers (Lattice),     ║
 * ║  normalizes all data into PolybolosEntity[], and emits a        ║
 * ║  fused Common Operating Picture stream.                         ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import {
  type PolybolosEntity,
  type PolybolosClientConfig,
  type SDKStatus,
  type LatticeConnectionStatus,
  Domain,
  EntityType,
  ThreatLevel,
  Classification,
} from './types';
import { LatticeAdapter } from './LatticeAdapter';

// ── NexaFreight Feed → Entity Translators ───────────────────────────────

// Removed air domain translators

function translateMaritime(ships: any[]): PolybolosEntity[] {
  if (!ships?.length) return [];
  return ships.map((s: any) => ({
    id: `NexaFreight-sea-${s.mmsi || s.id || Math.random().toString(36).slice(2)}`,
    name: s.name || `MMSI-${s.mmsi}`,
    domain: Domain.SEA,
    entityType: EntityType.TRACK,
    position: { lat: s.lat, lng: s.lng, heading: s.heading, speed: s.speed },
    threat: s.type === 'military' ? ThreatLevel.ELEVATED : ThreatLevel.NONE,
    classification: Classification.UNCLASSIFIED,
    source: { provider: 'NexaFreight', feed: 'maritime-ais', originalId: s.mmsi?.toString(), confidence: 0.85 },
    timestamp: new Date().toISOString(),
    properties: { type: s.type, destination: s.destination, flag: s.flag, mmsi: s.mmsi },
    display: {
      color: s.type === 'military' ? '#FF1744' : s.type === 'tanker' ? '#FF9500' : '#00BCD4',
      icon: 'dot-orange', layerType: 'circle' as const,
    },
  }));
}

// Removed unused non-maritime translators

// ── Main Client ────────────────────────────────────────────────────

export class PolybolosClient {
  private config: PolybolosClientConfig;
  private latticeAdapter: LatticeAdapter | null = null;
  private entityStore: Map<string, PolybolosEntity> = new Map();
  private startTime: number = Date.now();
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private sseConnection: EventSource | null = null;

  constructor(config: PolybolosClientConfig) {
    this.config = config;

    // Initialize Lattice adapter if configured
    if (config.lattice) {
      this.latticeAdapter = new LatticeAdapter(config.lattice);
    }
  }

  /** Initialize the SDK and connect all feeds */
  async initialize(): Promise<void> {
    // Connect Lattice if configured
    if (this.latticeAdapter) {
      await this.latticeAdapter.connect();
    }

    // Try SSE stream first (for real-time updates)
    this.connectSSE();

    // Emit initial status
    this.config.onStatusChange?.(this.getStatus());
  }

  /** Connect to the NexaFreight SSE stream endpoint */
  private connectSSE(): void {
    if (typeof EventSource === 'undefined') return;

    try {
      this.sseConnection = new EventSource(
        `${this.config.NexaFreightBaseUrl}/api/sdk/stream`
      );

      this.sseConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'entity_update' && Array.isArray(data.payload)) {
            for (const entity of data.payload) {
              this.entityStore.set(entity.id, entity);
            }
            this.emitUpdate();
          }
        } catch {
          // Skip malformed events
        }
      };

      this.sseConnection.onerror = () => {
        // SSE failed, connection will auto-retry
      };
    } catch {
      // EventSource not available or connection failed
    }
  }

  /**
   * Ingest raw NexaFreight data and translate it into Polybolos entities.
   * This is the primary method called by page.tsx to feed data into the SDK.
   */
  ingestNexaFreightData(data: Record<string, any>): void {
    const entities: PolybolosEntity[] = [];

    // Sea domain
    entities.push(...translateMaritime(data.maritime_ships || []));

    // Store all
    for (const entity of entities) {
      this.entityStore.set(entity.id, entity);
    }

    // Merge Lattice entities
    if (this.latticeAdapter) {
      for (const entity of this.latticeAdapter.getEntities()) {
        this.entityStore.set(entity.id, entity);
      }
    }

    this.emitUpdate();
  }

  /** Get all entities, optionally filtered by domain */
  getEntities(domain?: Domain): PolybolosEntity[] {
    const all = Array.from(this.entityStore.values());
    if (domain) return all.filter(e => e.domain === domain);
    return all;
  }

  /** Get entity count by domain */
  getEntityCountByDomain(): Record<Domain, number> {
    const counts = {} as Record<Domain, number>;
    for (const d of Object.values(Domain)) counts[d] = 0;
    for (const entity of this.entityStore.values()) {
      counts[entity.domain] = (counts[entity.domain] || 0) + 1;
    }
    return counts;
  }

  /** Get entities above a certain threat level */
  getThreats(minLevel: ThreatLevel = ThreatLevel.ELEVATED): PolybolosEntity[] {
    const levels = [ThreatLevel.NONE, ThreatLevel.LOW, ThreatLevel.ELEVATED, ThreatLevel.HIGH, ThreatLevel.CRITICAL];
    const minIndex = levels.indexOf(minLevel);
    return Array.from(this.entityStore.values())
      .filter(e => levels.indexOf(e.threat) >= minIndex);
  }

  /** Get current SDK status */
  getStatus(): SDKStatus {
    return {
      connected: true,
      feedCount: this.getActiveFeedCount(),
      entityCount: this.entityStore.size,
      latticeStatus: this.latticeAdapter?.getStatus() || 'disconnected',
      lastUpdate: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    };
  }

  /** Convert current entity store to GeoJSON FeatureCollection for MapLibre */
  toGeoJSON(domain?: Domain): GeoJSON.FeatureCollection {
    const entities = this.getEntities(domain);
    return {
      type: 'FeatureCollection',
      features: entities.map(e => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [e.position.lng, e.position.lat],
        },
        properties: {
          id: e.id,
          name: e.name,
          domain: e.domain,
          entityType: e.entityType,
          threat: e.threat,
          color: e.display.color,
          icon: e.display.icon,
          heading: e.position.heading || 0,
          alt: e.position.alt,
          speed: e.position.speed,
          glow: e.display.glow || false,
          scale: e.display.scale || 1.0,
          source: e.source.provider,
          ...e.properties,
        },
      })),
    };
  }

  /** Shutdown the SDK */
  destroy(): void {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.sseConnection) this.sseConnection.close();
    if (this.latticeAdapter) this.latticeAdapter.disconnect();
    this.entityStore.clear();
  }

  private emitUpdate(): void {
    this.config.onEntityUpdate?.(Array.from(this.entityStore.values()));
    this.config.onStatusChange?.(this.getStatus());
  }

  private getActiveFeedCount(): number {
    let count = 0;
    // Count NexaFreight feeds that have data
    const feeds = ['maritime_ships'];
    for (const feed of feeds) {
      if (this.entityStore.size > 0) count++; // Simplified: if store has data, feeds are active
    }
    if (this.latticeAdapter && this.latticeAdapter.getEntityCount() > 0) count++;
    return Math.min(count, feeds.length);
  }
}
