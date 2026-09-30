'use client';

import React, { useMemo } from 'react';
import type { RouteFeatureCollection, Leg } from '@/lib/nexafreight/types';
import { ProvenanceChip } from './ProvenanceBadge';
import { Ship, Plane, Truck, Compass } from 'lucide-react';

interface RouteMiniMapProps {
  routeData: RouteFeatureCollection | null;
  origin?: string;
  destination?: string;
  legs?: Leg[];
  className?: string;
}

// Approximate LOCODE to [lon, lat] coordinates for common global freight ports
const KNOWN_PORT_COORDS: Record<string, [number, number]> = {
  INNSA: [72.95, 18.95], // Nhava Sheva / Mumbai
  INBOM: [72.87, 19.07],
  INMAA: [80.30, 13.08], // Chennai
  INCOK: [76.27, 9.96],  // Cochin
  AEJEA: [55.06, 25.01], // Jebel Ali / Dubai
  AEDXB: [55.36, 25.25],
  SGSIN: [103.85, 1.29], // Singapore
  NLRTM: [4.48, 51.92],  // Rotterdam
  CNSHA: [121.47, 31.23],// Shanghai
  CNYTN: [114.28, 22.58],// Yantian / Shenzhen
  USLAX: [-118.24, 33.74],// Los Angeles
  USLGB: [-118.20, 33.77],
  USNYC: [-74.00, 40.71],// New York
  DEHAM: [9.99, 53.55],  // Hamburg
  BEANT: [4.40, 51.22],  // Antwerp
  LKCMB: [79.86, 6.93],  // Colombo
  MYPKG: [101.40, 3.00], // Port Klang
};

export default function RouteMiniMap({
  routeData,
  origin = 'ORIGIN',
  destination = 'DEST',
  legs = [],
  className = '',
}: RouteMiniMapProps) {
  // Extract all coordinates from GeoJSON LineStrings
  const { pathD, points, bounds } = useMemo(() => {
    const coords: [number, number][] = [];

    if (routeData && routeData.features) {
      for (const feat of routeData.features) {
        if (!feat.geometry) continue;
        if (feat.geometry.type === 'LineString') {
          coords.push(...(feat.geometry.coordinates as [number, number][]));
        } else if (feat.geometry.type === 'MultiLineString') {
          for (const line of feat.geometry.coordinates as [number, number][][]) {
            coords.push(...line);
          }
        }
      }
    }

    // If no GeoJSON coords, fall back to known port coordinates
    if (coords.length < 2) {
      const p1 = KNOWN_PORT_COORDS[origin.toUpperCase()] || [72.95, 18.95];
      const p2 = KNOWN_PORT_COORDS[destination.toUpperCase()] || [55.06, 25.01];
      // Generate an arc between p1 and p2
      const midLon = (p1[0] + p2[0]) / 2;
      const midLat = (p1[1] + p2[1]) / 2 + 3.5; // slight great circle curvature
      coords.push(p1, [midLon, midLat], p2);
    }

    let minLon = Infinity;
    let maxLon = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    for (const [lon, lat] of coords) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    // Add 20% margin to bounding box
    const lonSpan = Math.max(8, maxLon - minLon);
    const latSpan = Math.max(6, maxLat - minLat);
    minLon -= lonSpan * 0.15;
    maxLon += lonSpan * 0.15;
    minLat -= latSpan * 0.15;
    maxLat += latSpan * 0.15;

    // ViewBox dimensions: 600 x 240
    const W = 600;
    const H = 240;

    const project = ([lon, lat]: [number, number]): [number, number] => {
      const x = ((lon - minLon) / (maxLon - minLon)) * (W - 80) + 40;
      // Invert Y for latitude
      const y = H - (((lat - minLat) / (maxLat - minLat)) * (H - 60) + 30);
      return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    };

    const projectedPoints = coords.map(project);

    // Build SVG path
    let d = '';
    if (projectedPoints.length > 0) {
      d = `M ${projectedPoints[0][0]} ${projectedPoints[0][1]}`;
      for (let i = 1; i < projectedPoints.length; i++) {
        d += ` L ${projectedPoints[i][0]} ${projectedPoints[i][1]}`;
      }
    }

    return {
      pathD: d,
      points: projectedPoints,
      bounds: { minLon, maxLon, minLat, maxLat },
    };
  }, [routeData, origin, destination]);

  const originPt = points[0] || [60, 120];
  const destPt = points[points.length - 1] || [540, 120];
  const midPt = points[Math.floor(points.length / 2)] || [300, 120];

  return (
    <div
      className={`rounded-[3px] border relative overflow-hidden select-none ${className}`}
      style={{
        backgroundColor: 'var(--paper)',
        borderColor: 'var(--border-hairline)',
      }}
      aria-label="Multimodal Route Trajectory Map"
    >
      {/* Technical Header Strip */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b bg-[var(--bg-subtle)] text-[11px] font-mono"
        style={{ borderColor: 'var(--border-hairline)' }}
      >
        <div className="flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-[var(--cobalt)]" />
          <span className="font-bold text-[var(--ink)]">ROUTE TRAJECTORY PROJECTION</span>
          <span className="text-[var(--text-secondary)]">
            [{origin} → {destination}]
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ProvenanceChip provenance={routeData ? 'CALIBRATED' : 'DERIVED'} size="xs" />
          <span className="px-1.5 py-0.5 rounded-[2px] border border-[var(--border-hairline)] bg-[var(--paper)] text-[10px] text-[var(--text-secondary)]">
            MERCATOR / WGS-84
          </span>
        </div>
      </div>

      {/* SVG Projection Canvas */}
      <div className="relative w-full h-[220px] bg-[var(--paper)] flex items-center justify-center overflow-hidden">
        <svg
          viewBox="0 0 600 240"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Graticule Grid Lines (Lat / Lon) */}
          <g stroke="#16181D" strokeWidth="0.5" strokeDasharray="3 6" opacity="0.15">
            <line x1="0" y1="40" x2="600" y2="40" />
            <line x1="0" y1="80" x2="600" y2="80" />
            <line x1="0" y1="120" x2="600" y2="120" />
            <line x1="0" y1="160" x2="600" y2="160" />
            <line x1="0" y1="200" x2="600" y2="200" />

            <line x1="100" y1="0" x2="100" y2="240" />
            <line x1="200" y1="0" x2="200" y2="240" />
            <line x1="300" y1="0" x2="300" y2="240" />
            <line x1="400" y1="0" x2="400" y2="240" />
            <line x1="500" y1="0" x2="500" y2="240" />
          </g>

          {/* Great-Circle Route Track (Cobalt) */}
          <path
            d={pathD}
            fill="none"
            stroke="#2547C8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dashed Tracking Overlay */}
          <path
            d={pathD}
            fill="none"
            stroke="#16181D"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            opacity="0.5"
          />

          {/* Active Transit Marker / Vessel on Lane */}
          <g transform={`translate(${midPt[0]}, ${midPt[1]})`}>
            <circle cx="0" cy="0" r="10" stroke="#2547C8" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
            <circle cx="0" cy="0" r="4.5" fill="#2547C8" />
            <g transform="translate(10, -8)">
              <rect x="0" y="0" width="76" height="16" fill="var(--paper)" stroke="var(--border-hairline)" rx="2" />
              <text x="6" y="11" fill="var(--ink)" fontFamily="var(--font-mono)" fontSize="9" fontWeight="600">
                IN TRANSIT
              </text>
            </g>
          </g>

          {/* Origin Port Pin */}
          <g transform={`translate(${originPt[0]}, ${originPt[1]})`}>
            <circle cx="0" cy="0" r="5" fill="#16181D" stroke="#FFFFFF" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="8" stroke="#16181D" strokeWidth="0.8" opacity="0.3" />
            <text x="10" y="4" fill="#16181D" fontFamily="var(--font-mono)" fontSize="11" fontWeight="700">
              {origin}
            </text>
            <text x="10" y="15" fill="#5A5D66" fontFamily="var(--font-mono)" fontSize="9">
              ORIGIN
            </text>
          </g>

          {/* Destination Port Pin */}
          <g transform={`translate(${destPt[0]}, ${destPt[1]})`}>
            <circle cx="0" cy="0" r="5" fill="#2547C8" stroke="#FFFFFF" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="8" stroke="#2547C8" strokeWidth="0.8" opacity="0.4" />
            <text x="-12" y="18" fill="#2547C8" fontFamily="var(--font-mono)" fontSize="11" fontWeight="700" textAnchor="end">
              {destination}
            </text>
            <text x="-12" y="28" fill="#5A5D66" fontFamily="var(--font-mono)" fontSize="9" textAnchor="end">
              FINAL DESTINATION
            </text>
          </g>

          {/* Technical Corner Registration Marks */}
          <path d="M 12 12 L 22 12 M 12 12 L 12 22" stroke="#16181D" strokeWidth="1" opacity="0.4" />
          <path d="M 588 12 L 578 12 M 588 12 L 588 22" stroke="#16181D" strokeWidth="1" opacity="0.4" />
          <path d="M 12 228 L 22 228 M 12 228 L 12 218" stroke="#16181D" strokeWidth="1" opacity="0.4" />
          <path d="M 588 228 L 578 228 M 588 228 L 588 218" stroke="#16181D" strokeWidth="1" opacity="0.4" />
        </svg>

        {/* Legend Overlay Strip */}
        <div
          className="absolute bottom-2 left-3 flex items-center gap-3 px-2 py-1 rounded-[2px] border bg-[var(--paper)]/90 text-[10px] font-mono text-[var(--text-secondary)]"
          style={{ borderColor: 'var(--border-hairline)' }}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[var(--cobalt)]" />
            <span>Active Great Circle</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--ink)]" />
            <span>Port Node</span>
          </div>
          {legs.length > 0 && (
            <div className="flex items-center gap-1">
              <span>{legs.length} Leg(s)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
