import { describe, it, expect } from 'vitest';
import LoadingGlobe from './illustrations/LoadingGlobe';
import PlexusHeader from './illustrations/PlexusHeader';
import LoginHeroIllustration from './illustrations/LoginHeroIllustration';
import RouteMiniMap from './RouteMiniMap';

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
