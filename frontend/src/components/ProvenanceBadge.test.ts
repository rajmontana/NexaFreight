import { describe, it, expect } from 'vitest';
import { getProvenanceConfig, getProvenanceBadgeHtml } from './ProvenanceBadge';

// Chartroom contract (DESIGN.md): flat chips, ink text, law-palette dots.
// Labels are the four provenance classes: REAL / CALIBRATED / DERIVED / SIMULATED.
describe('ProvenanceBadge helpers (Chartroom contract)', () => {
  it('maps REAL to REAL with moss dot and ink text', () => {
    const cfg = getProvenanceConfig('REAL');
    expect(cfg.label).toBe('REAL');
    expect(cfg.text).toBe('var(--ink)');
    expect(cfg.dotColor).toBe('var(--moss-positive)');
    expect(cfg.cssClass).toBe('provenance-live');
  });

  it('maps CALIBRATED to its own label with cobalt dot', () => {
    const cfg = getProvenanceConfig('CALIBRATED');
    expect(cfg.label).toBe('CALIBRATED');
    expect(cfg.text).toBe('var(--ink)');
    expect(cfg.dotColor).toBe('var(--cobalt)');
  });

  it('maps REPLAYED and DERIVED to DERIVED with grey dot', () => {
    const replayCfg = getProvenanceConfig('REPLAYED');
    expect(replayCfg.label).toBe('DERIVED');
    expect(replayCfg.text).toBe('var(--ink)');
    expect(replayCfg.dotColor).toBe('var(--text-secondary)');
    expect(replayCfg.cssClass).toBe('provenance-replay');

    const derivedCfg = getProvenanceConfig('DERIVED');
    expect(derivedCfg.label).toBe('DERIVED');
  });

  it('maps SIMULATED, MOCK, undefined to SIMULATED: dashed border, oxide dot', () => {
    const simCfg = getProvenanceConfig('SIMULATED');
    expect(simCfg.label).toBe('SIMULATED');
    expect(simCfg.text).toBe('var(--ink)');
    expect(simCfg.dotColor).toBe('var(--oxide-risk)');
    expect(simCfg.border).toContain('dashed');

    expect(getProvenanceConfig('MOCK').label).toBe('SIMULATED');
    expect(getProvenanceConfig(undefined).label).toBe('SIMULATED');
  });

  it('generates valid HTML string with appropriate sizes', () => {
    const htmlXs = getProvenanceBadgeHtml('REAL', 'xs');
    expect(htmlXs).toContain('REAL');
    expect(htmlXs).toContain('provenance-live');
    expect(htmlXs).toContain('var(--moss-positive)');

    const htmlSm = getProvenanceBadgeHtml('REPLAYED', 'sm');
    expect(htmlSm).toContain('DERIVED');
    expect(htmlSm).toContain('provenance-replay');

    const htmlMd = getProvenanceBadgeHtml('SIMULATED', 'md');
    expect(htmlMd).toContain('SIMULATED');
    expect(htmlMd).toContain('provenance-sim');
  });
});
