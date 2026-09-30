'use client';

/**
 * DossierHeaderCards — the four-card strip at the top of a freight dossier.
 *
 *   LANE  ·  SLA  ·  EXPOSURE ₹  ·  CO₂
 *
 * Ported from the mock's dossier header, but fed from the real shipment
 * detail + /api/shipments/{id}/financials payloads instead of fixtures.
 *
 * Same discipline as the KPI band: a card with no backing figure prints an
 * em dash, never a zero. Money is converted from the backend's USD at the
 * pinned fx.usd_inr and the card says so on hover.
 */

import React from 'react';
import { formatCo2, formatInrCompact, usdInrRate } from '@/lib/format/inr';

const MONO = "'IBM Plex Mono','JetBrains Mono',ui-monospace,monospace";

export interface DossierCard {
  label: string;
  value: string;
  /** Small line beneath the value. */
  note?: string;
  /** Draw the value in cobalt — reserved for the figure needing action. */
  emphasis?: boolean;
  /** Tooltip, used to disclose derivation (e.g. the FX rate). */
  title?: string;
}

/** Build the standard four cards from the real payload shapes. */
export function buildDossierCards(input: {
  origin?: string | null;
  destination?: string | null;
  status?: string | null;
  slaDeadline?: string | null;
  slaStatus?: string | null;
  /** Total pending + realised exposure in USD. */
  exposureUsd?: number | null;
  /** Total CO2 for the shipment in kg. */
  co2Kg?: number | null;
  containers?: number | null;
}): DossierCard[] {
  const rate = usdInrRate();

  const lane =
    input.origin || input.destination
      ? `${input.origin ?? '—'} → ${input.destination ?? '—'}`
      : '—';

  const slaValue = input.slaStatus
    ? String(input.slaStatus).replace('_', '-')
    : input.slaDeadline
      ? new Date(input.slaDeadline).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
        })
      : '—';

  const breached = String(input.slaStatus ?? '').toUpperCase() === 'LATE';
  const atRisk = String(input.slaStatus ?? '').toUpperCase() === 'AT_RISK';

  return [
    {
      label: 'LANE',
      value: lane,
      note: input.status ? String(input.status) : undefined,
    },
    {
      label: 'SLA',
      value: slaValue,
      note: input.slaDeadline
        ? new Date(input.slaDeadline).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : 'no deadline',
      emphasis: breached || atRisk,
    },
    {
      label: 'EXPOSURE',
      value:
        input.exposureUsd === null || input.exposureUsd === undefined
          ? '—'
          : formatInrCompact(input.exposureUsd * rate),
      note: 'penalties + demurrage',
      emphasis: (input.exposureUsd ?? 0) > 0,
      title: `Converted from USD at fx.usd_inr = ${rate}`,
    },
    {
      label: 'CO₂',
      value: input.co2Kg === null || input.co2Kg === undefined ? '—' : formatCo2(input.co2Kg),
      note: input.containers ? `${input.containers} container(s)` : 'GLEC basis',
    },
  ];
}

function Card({ card }: { card: DossierCard }) {
  const dead = card.value === '—';
  return (
    <div
      data-dossier-card={card.label}
      title={card.title}
      style={{
        flex: '1 1 0',
        minWidth: 0,
        padding: '7px 9px',
        border: '1px solid var(--border-hairline)',
        background: 'var(--paper)',
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <span
        style={{
          fontFamily: MONO,
          fontSize: 8.5,
          letterSpacing: '0.14em',
          color: '#5A5D66',
        }}
      >
        {card.label}
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.2,
          color: dead ? '#9A9DA6' : card.emphasis ? 'var(--cobalt)' : 'var(--ink)',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {card.value}
      </span>
      {card.note && (
        <span
          style={{
            fontFamily: MONO,
            fontSize: 8.5,
            color: '#5A5D66',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {card.note}
        </span>
      )}
    </div>
  );
}

export default function DossierHeaderCards({ cards }: { cards: DossierCard[] }) {
  return (
    <div
      data-testid="dossier-header-cards"
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}
    >
      {cards.map((c) => (
        <Card key={c.label} card={c} />
      ))}
    </div>
  );
}
