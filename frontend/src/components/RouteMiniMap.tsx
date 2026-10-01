'use client';

import React, { useMemo } from 'react';
import type { RouteFeatureCollection, Leg } from '@/lib/nexafreight/types';
import { ProvenanceChip } from './ProvenanceBadge';
import { Compass, Ship, CheckCircle2 } from 'lucide-react';

interface RouteMiniMapProps {
  routeData: RouteFeatureCollection | null;
  origin?: string | null;
  destination?: string | null;
  status?: string | null;
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
  status = 'ACTIVE',
  legs = [],
  className = '',
}: RouteMiniMapProps) {
  const isDelivered = status?.toUpperCase() === 'DELIVERED';

  // Extract all coordinates from GeoJSON LineStrings and compute honest Mercator projection
  const { pathD, points, originPt, destPt, midPt, movingEast } = useMemo(() => {
    let coords: [number, number][] = [];

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

    // If no GeoJSON coords, generate a smooth 24-point great circle arc between ports
    if (coords.length < 2) {
      const origKey = (origin || 'ORIGIN').toUpperCase();
      const destKey = (destination || 'DEST').toUpperCase();
      const p1 = KNOWN_PORT_COORDS[origKey] || [-74.00, 40.71];
      const p2 = KNOWN_PORT_COORDS[destKey] || [4.48, 51.92];

      const steps = 24;
      coords = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        // Linear lon progression
        const lon = p1[0] + (p2[0] - p1[0]) * t;
        // Parabolic arc for great-circle latitude curve
        const baseLat = p1[1] + (p2[1] - p1[1]) * t;
        const arcElev = Math.sin(t * Math.PI) * 6.5;
        coords.push([lon, baseLat + arcElev]);
      }
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

    // ViewBox dimensions: 640 x 240
    const W = 640;
    const H = 240;
    const padX = 70;
    const padY = 40;

    let lonSpan = Math.max(12, maxLon - minLon);
    let latSpan = Math.max(8, maxLat - minLat);

    // Keep aspect ratio aligned with Mercator scaling at center latitude
    const centerLatRad = (((minLat + maxLat) / 2) * Math.PI) / 180;
    const cosLat = Math.max(0.3, Math.cos(centerLatRad));
    const effectiveLatSpan = latSpan / cosLat;
    const targetAspect = (W - padX * 2) / (H - padY * 2);

    if (lonSpan / effectiveLatSpan > targetAspect) {
      latSpan = (lonSpan / targetAspect) * cosLat;
    } else {
      lonSpan = effectiveLatSpan * targetAspect;
    }

    const midLon = (minLon + maxLon) / 2;
    const midLat = (minLat + maxLat) / 2;

    const adjustedMinLon = midLon - lonSpan * 0.6;
    const adjustedMaxLon = midLon + lonSpan * 0.6;
    const adjustedMinLat = midLat - latSpan * 0.6;
    const adjustedMaxLat = midLat + latSpan * 0.6;

    const project = ([lon, lat]: [number, number]): [number, number] => {
      const x = ((lon - adjustedMinLon) / (adjustedMaxLon - adjustedMinLon)) * (W - padX * 2) + padX;
      const y = H - (((lat - adjustedMinLat) / (adjustedMaxLat - adjustedMinLat)) * (H - padY * 2) + padY);
      return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
    };

    const projectedPoints = coords.map(project);

    let d = '';
    if (projectedPoints.length > 0) {
      d = `M ${projectedPoints[0][0]} ${projectedPoints[0][1]}`;
      for (let i = 1; i < projectedPoints.length; i++) {
        d += ` L ${projectedPoints[i][0]} ${projectedPoints[i][1]}`;
      }
    }

    const pFirst = projectedPoints[0] || [80, 140];
    const pLast = projectedPoints[projectedPoints.length - 1] || [540, 100];
    const pMid = projectedPoints[Math.floor(projectedPoints.length / 2)] || [310, 120];

    return {
      pathD: d,
      points: projectedPoints,
      originPt: pFirst,
      destPt: pLast,
      midPt: pMid,
      movingEast: pLast[0] >= pFirst[0],
    };
  }, [routeData, origin, destination]);

  return (
    <div
      className={`rounded-[3px] border relative overflow-hidden select-none ${className}`}
      style={{
        backgroundColor: 'var(--paper)',
        borderColor: 'var(--border-hairline)',
      }}
      aria-label="Multimodal Route Trajectory Map"
    >
      {/* CSS keyframe for animated pulse along active route */}
      <style>{`
        @keyframes laneFlowPulse {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        .animate-route-flow {
          animation: laneFlowPulse 1.8s linear infinite;
        }
      `}</style>

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
      <div className="relative w-full h-[230px] bg-[var(--paper)] flex items-center justify-center overflow-hidden">
        <svg
          viewBox="0 0 640 240"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Graticule Grid Lines (Lat / Lon) */}
          <g stroke="#16181D" strokeWidth="0.5" strokeDasharray="3 6" opacity="0.12">
            <line x1="0" y1="40" x2="640" y2="40" />
            <line x1="0" y1="80" x2="640" y2="80" />
            <line x1="0" y1="120" x2="640" y2="120" />
            <line x1="0" y1="160" x2="640" y2="160" />
            <line x1="0" y1="200" x2="640" y2="200" />

            <line x1="100" y1="0" x2="100" y2="240" />
            <line x1="200" y1="0" x2="200" y2="240" />
            <line x1="320" y1="0" x2="320" y2="240" />
            <line x1="440" y1="0" x2="440" y2="240" />
            <line x1="560" y1="0" x2="560" y2="240" />
          </g>

          {/* Underlay glow / shadow path */}
          <path
            d={pathD}
            fill="none"
            stroke="#2547C8"
            strokeWidth="5"
            strokeOpacity="0.12"
            strokeLinecap="round"
          />

          {/* Primary Route Track (Cobalt) */}
          <path
            d={pathD}
            fill="none"
            stroke="#2547C8"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Flowing Transit Pulse Overlay */}
          {!isDelivered && (
            <path
              d={pathD}
              fill="none"
              stroke="#F6F7F4"
              strokeWidth="1.6"
              strokeDasharray="5 7"
              className="animate-route-flow"
              opacity="0.9"
            />
          )}

          {/* Active Transit Marker / Vessel on Lane (Only if NOT DELIVERED) */}
          {!isDelivered ? (
            <g transform={`translate(${midPt[0]}, ${midPt[1]})`}>
              {/* Radar pulse rings */}
              <circle cx="0" cy="0" r="14" stroke="#2547C8" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
              <circle cx="0" cy="0" r="5" fill="#2547C8" />

              {/* Boxed label positioned ABOVE the line so it never overlaps nodes */}
              <g transform="translate(-40, -32)">
                <rect
                  x="0"
                  y="0"
                  width="80"
                  height="18"
                  fill="var(--paper)"
                  stroke="var(--cobalt)"
                  strokeWidth="1"
                  rx="2"
                />
                <text
                  x="40"
                  y="12"
                  textAnchor="middle"
                  fill="var(--cobalt)"
                  fontFamily="var(--font-mono)"
                  fontSize="9.5"
                  fontWeight="700"
                  letterSpacing="0.04em"
                >
                  IN TRANSIT
                </text>
                {/* Pointer indicator line down to marker */}
                <line x1="40" y1="18" x2="40" y2="24" stroke="var(--cobalt)" strokeWidth="1" />
              </g>
            </g>
          ) : null}

          {/* Origin Port Node & Non-Overlapping Label */}
          <g transform={`translate(${originPt[0]}, ${originPt[1]})`}>
            <circle cx="0" cy="0" r="5.5" fill="#16181D" stroke="#FFFFFF" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="9" stroke="#16181D" strokeWidth="0.8" opacity="0.3" />

            {/* Label placed dynamically based on heading direction */}
            <g
              transform={
                movingEast
                  ? 'translate(-12, 0)' // Left of node
                  : 'translate(14, 0)'  // Right of node
              }
            >
              <text
                x="0"
                y="4"
                textAnchor={movingEast ? 'end' : 'start'}
                fill="#16181D"
                fontFamily="var(--font-mono)"
                fontSize="11"
                fontWeight="700"
              >
                {origin}
              </text>
              <text
                x="0"
                y="16"
                textAnchor={movingEast ? 'end' : 'start'}
                fill="#5A5D66"
                fontFamily="var(--font-mono)"
                fontSize="9"
                letterSpacing="0.04em"
              >
                ORIGIN
              </text>
            </g>
          </g>

          {/* Destination Port Node & Non-Overlapping Label */}
          <g transform={`translate(${destPt[0]}, ${destPt[1]})`}>
            <circle
              cx="0"
              cy="0"
              r="6"
              fill={isDelivered ? 'var(--moss-positive)' : 'var(--cobalt)'}
              stroke="#FFFFFF"
              strokeWidth="1.5"
            />
            <circle
              cx="0"
              cy="0"
              r="10"
              stroke={isDelivered ? 'var(--moss-positive)' : 'var(--cobalt)'}
              strokeWidth="0.8"
              opacity="0.4"
            />

            {/* Label placed dynamically on opposite side of origin */}
            <g
              transform={
                movingEast
                  ? 'translate(14, 0)'  // Right of node
                  : 'translate(-12, 0)' // Left of node
              }
            >
              <text
                x="0"
                y="4"
                textAnchor={movingEast ? 'start' : 'end'}
                fill={isDelivered ? 'var(--moss-positive)' : 'var(--cobalt)'}
                fontFamily="var(--font-mono)"
                fontSize="11"
                fontWeight="700"
              >
                {destination}
              </text>
              <text
                x="0"
                y="16"
                textAnchor={movingEast ? 'start' : 'end'}
                fill={isDelivered ? 'var(--moss-positive)' : '#5A5D66'}
                fontFamily="var(--font-mono)"
                fontSize="9"
                fontWeight={isDelivered ? '600' : '400'}
                letterSpacing="0.04em"
              >
                {isDelivered ? 'DELIVERED · FINAL' : 'FINAL DESTINATION'}
              </text>
            </g>
          </g>

          {/* Technical Corner Registration Marks */}
          <path d="M 12 12 L 22 12 M 12 12 L 12 22" stroke="#16181D" strokeWidth="1" opacity="0.3" />
          <path d="M 628 12 L 618 12 M 628 12 L 628 22" stroke="#16181D" strokeWidth="1" opacity="0.3" />
          <path d="M 12 228 L 22 228 M 12 228 L 12 218" stroke="#16181D" strokeWidth="1" opacity="0.3" />
          <path d="M 628 228 L 618 228 M 628 228 L 628 218" stroke="#16181D" strokeWidth="1" opacity="0.3" />
        </svg>

        {/* Legend Overlay Strip */}
        <div
          className="absolute bottom-2 left-3 flex items-center gap-3 px-2 py-1 rounded-[2px] border bg-[var(--paper)]/95 text-[10px] font-mono text-[var(--text-secondary)] shadow-none"
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
          {isDelivered && (
            <div className="flex items-center gap-1 text-[var(--moss-positive)] font-bold">
              <CheckCircle2 className="w-3 h-3" />
              <span>DELIVERED</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
