import { describe, it, expect } from 'vitest';
import LoadingGlobe from './illustrations/LoadingGlobe';
import PlexusHeader from './illustrations/PlexusHeader';
import LoginHeroIllustration from './illustrations/LoginHeroIllustration';
import RouteMiniMap from './RouteMiniMap';
import GlobalBackdrop from './art/GlobalBackdrop';
import ArtLoadingGlobe from './art/LoadingGlobe';
import { CompassRose, ScaleBar } from './art/MapOrnaments';
import ArtPlexusHeader from './art/PlexusHeader';
import { landDots, LAND_MASK } from './art/landMask';

describe('5B Illustrations and Map components', () => {
  it('exports LoadingGlobe as a valid component', () => {
    expect(typeof LoadingGlobe).toBe('function');
  });

  it('exports PlexusHeader as a valid component', () => {
    expect(typeof PlexusHeader).toBe('function');
  });

  it('exports LoginHeroIllustration as a valid component', () => {
    expect(typeof LoginHeroIllustration).toBe('function');
  });

  it('exports RouteMiniMap as a valid component', () => {
    expect(typeof RouteMiniMap).toBe('function');
  });
});

describe('Chartroom Art Components', () => {
  it('exports GlobalBackdrop as a valid component', () => {
    expect(typeof GlobalBackdrop).toBe('function');
  });

  it('exports ArtLoadingGlobe as a valid component', () => {
    expect(typeof ArtLoadingGlobe).toBe('function');
  });

  it('exports CompassRose and ScaleBar as valid components', () => {
    expect(typeof CompassRose).toBe('function');
    expect(typeof ScaleBar).toBe('function');
  });

  it('exports ArtPlexusHeader as a valid component', () => {
    expect(typeof ArtPlexusHeader).toBe('function');
  });

  it('generates landDots from LAND_MASK', () => {
    const dots = landDots();
    expect(Array.isArray(dots)).toBe(true);
    expect(dots.length).toBeGreaterThan(0);
    expect(LAND_MASK.length).toBe(36);
  });
});
