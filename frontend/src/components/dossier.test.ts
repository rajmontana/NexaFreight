import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildDossierCards } from './DossierHeaderCards';
import { splitVerdict, sourceLabel } from './CopilotVerdictCard';

describe('buildDossierCards', () => {
  const base = {
    origin: 'INNSA',
    destination: 'AEJEA',
    status: 'IN_TRANSIT',
    containers: 3,
  };

  it('renders the lane as origin → destination', () => {
    const [lane] = buildDossierCards(base);
    expect(lane.label).toBe('LANE');
    expect(lane.value).toBe('INNSA → AEJEA');
    expect(lane.note).toBe('IN_TRANSIT');
  });

  it('falls back to an em dash when neither endpoint is known', () => {
    const [lane] = buildDossierCards({});
    expect(lane.value).toBe('—');
  });

  it('prints an em dash for a null lane endpoint rather than "null"', () => {
    const [lane] = buildDossierCards({ origin: 'INNSA', destination: null });
    expect(lane.value).toBe('INNSA → —');
  });

  it('always returns exactly four cards in a fixed order', () => {
    const labels = buildDossierCards(base).map((c) => c.label);
    expect(labels).toEqual(['LANE', 'SLA', 'EXPOSURE', 'CO₂']);
  });

  describe('SLA card', () => {
    it('shows the status with the underscore hyphenated', () => {
      const [, sla] = buildDossierCards({ ...base, slaStatus: 'AT_RISK' });
      expect(sla.value).toBe('AT-RISK');
    });

    it('emphasises a breached SLA', () => {
      const [, sla] = buildDossierCards({ ...base, slaStatus: 'LATE' });
      expect(sla.emphasis).toBe(true);
    });

    it('does not emphasise an on-time SLA', () => {
      const [, sla] = buildDossierCards({ ...base, slaStatus: 'ON_TIME' });
      expect(sla.emphasis).toBe(false);
    });

    it('says "no deadline" rather than inventing one', () => {
      const [, sla] = buildDossierCards(base);
      expect(sla.value).toBe('—');
      expect(sla.note).toBe('no deadline');
    });
  });

  describe('EXPOSURE card', () => {
    const OLD = process.env.NEXT_PUBLIC_USD_INR;
    beforeEach(() => {
      process.env.NEXT_PUBLIC_USD_INR = '100';
    });
    afterEach(() => {
      process.env.NEXT_PUBLIC_USD_INR = OLD;
    });

    it('converts USD to rupees at the configured rate', () => {
      const [, , exp] = buildDossierCards({ ...base, exposureUsd: 12_400 });
      // 12,400 USD x 100 = 12.4 lakh
      expect(exp.value).toBe('₹12.40 L');
    });

    it('discloses the FX rate in the tooltip', () => {
      const [, , exp] = buildDossierCards({ ...base, exposureUsd: 1 });
      expect(exp.title).toContain('fx.usd_inr');
      expect(exp.title).toContain('100');
    });

    it('prints an em dash when financials were not granted', () => {
      const [, , exp] = buildDossierCards({ ...base, exposureUsd: null });
      expect(exp.value).toBe('—');
      expect(exp.emphasis).toBe(false);
    });

    it('distinguishes a genuine zero exposure from missing data', () => {
      const [, , exp] = buildDossierCards({ ...base, exposureUsd: 0 });
      expect(exp.value).not.toBe('—');
      expect(exp.emphasis).toBe(false);
    });
  });

  describe('CO₂ card', () => {
    it('formats kilograms into tonnes', () => {
      const [, , , co2] = buildDossierCards({ ...base, co2Kg: 45_000 });
      expect(co2.value).toBe('45.0 t');
    });

    it('prints an em dash when the ESG figure is absent', () => {
      const [, , , co2] = buildDossierCards(base);
      expect(co2.value).toBe('—');
    });

    it('notes the container count when known', () => {
      const [, , , co2] = buildDossierCards({ ...base, co2Kg: 100 });
      expect(co2.note).toBe('3 container(s)');
    });
  });
});

describe('splitVerdict', () => {
  it('splits on the first sentence', () => {
    const { verdict, basis } = splitVerdict(
      'This shipment will breach its SLA. Vessel is 4 days behind schedule at Jebel Ali.',
    );
    expect(verdict).toBe('This shipment will breach its SLA.');
    expect(basis).toBe('Vessel is 4 days behind schedule at Jebel Ali.');
  });

  it('prefers a newline break when the answer is pre-formatted', () => {
    const { verdict, basis } = splitVerdict('AT RISK\nPort congestion at INNSA adds 3 days.');
    expect(verdict).toBe('AT RISK');
    expect(basis).toBe('Port congestion at INNSA adds 3 days.');
  });

  it('keeps a single short sentence whole with no basis', () => {
    const { verdict, basis } = splitVerdict('On schedule.');
    expect(verdict).toBe('On schedule.');
    expect(basis).toBe('');
  });

  it('handles an empty answer without throwing', () => {
    expect(splitVerdict('')).toEqual({ verdict: '', basis: '' });
  });

  it('does not split on a decimal point mid-figure', () => {
    const { verdict } = splitVerdict('Margin fell to 4.2 percent this week because of demurrage.');
    expect(verdict).toContain('4.2 percent');
  });

  it('survives a multi-paragraph answer', () => {
    const { verdict, basis } = splitVerdict('Delay confirmed.\n\nLine one.\nLine two.');
    expect(verdict).toBe('Delay confirmed.');
    expect(basis).toContain('Line two.');
  });
});

describe('sourceLabel', () => {
  it('treats a model answer as trusted', () => {
    expect(sourceLabel('llm')).toEqual({ text: 'MODEL REASONED', trusted: true });
  });

  it('treats deterministic rules as trusted', () => {
    expect(sourceLabel('rules').trusted).toBe(true);
  });

  it('flags a fallback answer as untrusted — the mock bug this fixes', () => {
    const l = sourceLabel('rules_fallback');
    expect(l.trusted).toBe(false);
    expect(l.text).toContain('MODEL UNREACHABLE');
  });

  it('treats an unrecognised source as untrusted', () => {
    expect(sourceLabel('something_new').trusted).toBe(false);
  });

  it('does not crash on an absent source', () => {
    expect(sourceLabel(undefined as unknown as string).text).toBe('UNKNOWN');
  });
});
