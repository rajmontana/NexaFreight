'use client';

import React from 'react';

export type ProvenanceType =
  | 'REAL'
  | 'REPLAYED'
  | 'SIMULATED'
  | 'DERIVED'
  | 'CALIBRATED'
  | 'MOCK'
  | string
  | null
  | undefined;

export interface ProvenanceConfig {
  label: 'LIVE' | 'REPLAY' | 'SIM' | string;
  provenance: string;
  bg: string;
  text: string;
  border: string;
  dotColor: string;
  cssClass: string;
  title: string;
}

/**
 * Derives badge colors and label from the provenance value:
 * - REAL / CALIBRATED → green "LIVE" (authentic real-time feed)
 * - REPLAYED / DERIVED → grey "REPLAY" (historical recorded telemetry)
 * - SIMULATED / MOCK → amber "SIM" (synthetic motion/interpolator)
 */
export function getProvenanceConfig(provenance?: ProvenanceType): ProvenanceConfig {
  const norm = String(provenance || '').trim().toUpperCase();

  if (norm === 'REAL' || norm === 'CALIBRATED' || norm === 'LIVE') {
    return {
      label: 'LIVE',
      provenance: norm || 'REAL',
      bg: 'rgba(16, 185, 129, 0.18)',
      text: '#10B981',
      border: 'rgba(16, 185, 129, 0.45)',
      dotColor: '#10B981',
      cssClass: 'provenance-live',
      title: 'Live Real-Time Telemetry Feed',
    };
  }

  if (norm === 'REPLAYED' || norm === 'DERIVED' || norm === 'REPLAY') {
    return {
      label: 'REPLAY',
      provenance: norm || 'REPLAYED',
      bg: 'rgba(148, 163, 184, 0.18)',
      text: '#94A3B8',
      border: 'rgba(148, 163, 184, 0.45)',
      dotColor: '#94A3B8',
      cssClass: 'provenance-replay',
      title: 'Historical Replayed AIS Data (Not Live)',
    };
  }

  // SIMULATED, MOCK, or default fallback
  return {
    label: 'SIM',
    provenance: norm || 'SIMULATED',
    bg: 'rgba(245, 158, 11, 0.18)',
    text: '#F59E0B',
    border: 'rgba(245, 158, 11, 0.45)',
    dotColor: '#F59E0B',
    cssClass: 'provenance-sim',
    title: 'Simulated Dynamic Trajectory (Synthetic Demo Feed)',
  };
}

/**
 * Returns raw HTML markup for MapLibre HTML markers, popups, and HUD chrome.
 */
export function getProvenanceBadgeHtml(
  provenance?: ProvenanceType,
  size: 'xs' | 'sm' | 'md' = 'xs'
): string {
  const cfg = getProvenanceConfig(provenance);

  let padding = '1px 4px';
  let fontSize = '8px';
  let dotSize = '4px';

  if (size === 'sm') {
    padding = '2px 5px';
    fontSize = '9px';
    dotSize = '5px';
  } else if (size === 'md') {
    padding = '3px 7px';
    fontSize = '10px';
    dotSize = '6px';
  }

  return `<span class="nexa-provenance-badge ${cfg.cssClass}" title="${cfg.title}" style="display:inline-flex;align-items:center;gap:3px;padding:${padding};border-radius:3px;font-size:${fontSize};font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:700;line-height:1;letter-spacing:0.06em;background:${cfg.bg};color:${cfg.text};border:1px solid ${cfg.border};box-shadow:0 1px 3px rgba(0,0,0,0.5);pointer-events:none;white-space:nowrap;user-select:none;"><span style="display:inline-block;width:${dotSize};height:${dotSize};border-radius:50%;background:${cfg.dotColor};box-shadow:0 0 4px ${cfg.dotColor};"></span>${cfg.label}</span>`;
}

export interface ProvenanceBadgeProps {
  provenance?: ProvenanceType;
  size?: 'xs' | 'sm' | 'md';
  showDot?: boolean;
  className?: string;
  title?: string;
}

export default function ProvenanceBadge({
  provenance,
  size = 'xs',
  showDot = true,
  className = '',
  title,
}: ProvenanceBadgeProps) {
  const cfg = getProvenanceConfig(provenance);

  const sizeClasses = {
    xs: 'text-[8px] px-1 py-0.5 gap-1 tracking-wider',
    sm: 'text-[9px] px-1.5 py-0.5 gap-1 tracking-wider',
    md: 'text-[10px] px-2 py-1 gap-1.5 tracking-widest',
  }[size];

  const dotSizes = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-1.5 h-1.5',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-mono font-bold leading-none rounded select-none border backdrop-blur-sm transition-colors ${sizeClasses} ${className}`}
      style={{
        backgroundColor: cfg.bg,
        color: cfg.text,
        borderColor: cfg.border,
      }}
      title={title || cfg.title}
    >
      {showDot && (
        <span
          className={`rounded-full ${dotSizes} shrink-0`}
          style={{
            backgroundColor: cfg.dotColor,
            boxShadow: `0 0 4px ${cfg.dotColor}`,
          }}
        />
      )}
      <span>{cfg.label}</span>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CHARTROOM PROVENANCE CHIP
   Light theme: outlined chips with semantic dot colors
   ═══════════════════════════════════════════════════════════════ */

export interface ProvenanceChipConfig {
  label: string;
  dotColor: string;
  textColor: string;
  borderStyle: string; // 'solid' or 'dashed'
}

/**
 * Get Chartroom light-theme chip config for provenance values.
 * - REAL → moss dot, solid border
 * - CALIBRATED → cobalt dot, solid border
 * - DERIVED → gray dot, solid border
 * - SIMULATED → oxide dot, dashed border
 */
export function getProvenanceChipConfig(provenance?: ProvenanceType): ProvenanceChipConfig {
  const norm = String(provenance || '').trim().toUpperCase();

  if (norm === 'REAL') {
    return {
      label: norm,
      dotColor: 'var(--moss-positive)',
      textColor: 'var(--ink)',
      borderStyle: 'solid',
    };
  }

  if (norm === 'CALIBRATED') {
    return {
      label: norm,
      dotColor: 'var(--cobalt)',
      textColor: 'var(--ink)',
      borderStyle: 'solid',
    };
  }

  if (norm === 'DERIVED') {
    return {
      label: norm,
      dotColor: 'var(--text-secondary)',
      textColor: 'var(--ink)',
      borderStyle: 'solid',
    };
  }

  // SIMULATED
  return {
    label: norm || 'SIMULATED',
    dotColor: 'var(--oxide-risk)',
    textColor: 'var(--ink)',
    borderStyle: 'dashed',
  };
}

export interface ProvenanceChipProps {
  provenance?: ProvenanceType;
  size?: 'xs' | 'sm' | 'md';
}

/**
 * Chartroom ProvenanceChip: outlined monospace chip with semantic dot.
 * Border is ALWAYS hairline (var(--border-hairline)); only the dot carries color.
 */
export function ProvenanceChip({ provenance, size = 'sm' }: ProvenanceChipProps) {
  const config = getProvenanceChipConfig(provenance);
  const sizeMap = { xs: '10px', sm: '11px', md: '12px' };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        fontFamily: 'var(--font-mono)',
        fontSize: sizeMap[size],
        fontWeight: 500,
        color: config.textColor,
        border: `1px ${config.borderStyle} var(--border-hairline)`,
        borderRadius: '3px',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: '4px',
          height: '4px',
          borderRadius: '50%',
          background: config.dotColor,
        }}
      />
      {config.label}
    </span>
  );
}
