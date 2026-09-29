'use client';

/**
 * CopilotVerdictCard — the mock's "verdict card" pattern, wired to the real
 * /api/shipments/{id}/copilot response.
 *
 * The pattern: an answer is never a floating blob of prose. It is a signed
 * document with three fixed registers —
 *
 *   VERDICT   the one-line call
 *   BASIS     the reasoning the model actually gave
 *   ACTION    what the operator does next (optional)
 *
 * — plus an unmissable footer stating WHO answered. This is the fix for the
 * mock's B2/B3 defect, where `CopilotView.tsx` ignored `data.status` and
 * rendered an OFFLINE_FALLBACK reply as though a model had verified it.
 * Here `source` is load-bearing: `rules_fallback` gets a visibly different
 * card, so no one mistakes a deterministic rule for a model's judgement.
 */

import React from 'react';

const MONO = "'IBM Plex Mono','JetBrains Mono',ui-monospace,monospace";
const MUTED = '#5A5D66';

export type CopilotSource = 'llm' | 'rules' | 'rules_fallback' | string;

export interface CopilotVerdict {
  answer: string;
  source: CopilotSource;
  provenance?: string;
}

/**
 * Split a copilot answer into verdict / basis.
 * The first sentence (or line) is the verdict; the remainder is the basis.
 * Pure + exported so it can be unit-tested without rendering.
 */
export function splitVerdict(answer: string): { verdict: string; basis: string } {
  const text = String(answer ?? '').trim();
  if (!text) return { verdict: '', basis: '' };

  const nl = text.indexOf('\n');
  if (nl > 0 && nl < 220) {
    return { verdict: text.slice(0, nl).trim(), basis: text.slice(nl + 1).trim() };
  }

  // [\s\S] rather than the /s flag — the project targets below es2018.
  const m = text.match(/^([\s\S]{10,220}?[.!?])(\s+)([\s\S]*)$/);
  if (m) return { verdict: m[1].trim(), basis: m[3].trim() };

  return { verdict: text, basis: '' };
}

/** How the answer was produced, in operator-facing words. */
export function sourceLabel(source: CopilotSource): {
  text: string;
  trusted: boolean;
} {
  switch (source) {
    case 'llm':
      return { text: 'MODEL REASONED', trusted: true };
    case 'rules':
      return { text: 'DETERMINISTIC RULES', trusted: true };
    case 'rules_fallback':
      return { text: 'FALLBACK — MODEL UNREACHABLE', trusted: false };
    default:
      return { text: String(source ?? 'UNKNOWN').toUpperCase(), trusted: false };
  }
}

function Register({ tag, body }: { tag: string; body: string }) {
  if (!body) return null;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 8.5,
          letterSpacing: '0.14em',
          color: MUTED,
          minWidth: 46,
          paddingTop: 2,
          flexShrink: 0,
        }}
      >
        {tag}
      </span>
      <span
        style={{
          fontFamily: MONO,
          fontSize: 11,
          lineHeight: 1.5,
          color: 'var(--ink)',
          whiteSpace: 'pre-wrap',
        }}
      >
        {body}
      </span>
    </div>
  );
}

export default function CopilotVerdictCard({
  verdict,
  action,
}: {
  verdict: CopilotVerdict;
  /** Optional operator next-step, rendered as the ACTION register. */
  action?: string;
}) {
  const { verdict: head, basis } = splitVerdict(verdict.answer);
  const src = sourceLabel(verdict.source);

  return (
    <div
      data-testid="copilot-verdict"
      data-source={verdict.source}
      style={{
        border: '1px solid var(--border-hairline)',
        // An untrusted answer is flagged on its leading edge, not by colouring
        // the whole card — the text stays as legible as any other.
        borderLeft: src.trusted
          ? '2px solid var(--cobalt)'
          : '2px solid var(--oxide-risk, #B4531F)',
        background: 'var(--paper)',
        borderRadius: 2,
        padding: '9px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
      }}
    >
      <Register tag="VERDICT" body={head} />
      <Register tag="BASIS" body={basis} />
      <Register tag="ACTION" body={action ?? ''} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          paddingTop: 6,
          borderTop: '1px solid var(--border-hairline)',
          fontFamily: MONO,
          fontSize: 8.5,
          letterSpacing: '0.1em',
          color: MUTED,
        }}
      >
        <span
          style={{
            padding: '1px 5px',
            border: `1px solid ${src.trusted ? 'var(--border-hairline)' : 'var(--oxide-risk, #B4531F)'}`,
            color: src.trusted ? MUTED : 'var(--oxide-risk, #B4531F)',
            borderRadius: 2,
          }}
        >
          {src.text}
        </span>
        {verdict.provenance && <span>DATA {String(verdict.provenance).toUpperCase()}</span>}
      </div>
    </div>
  );
}
