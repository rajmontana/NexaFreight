import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BackendColdStartBanner, { resolveHealthUrl } from './BackendColdStartBanner';

describe('BackendColdStartBanner Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('is exported as a function/component', () => {
    expect(typeof BackendColdStartBanner).toBe('function');
  });

  describe('resolveHealthUrl (local vs cloud behavior)', () => {
    it('uses localhost origin when running locally on localhost', () => {
      const url = resolveHealthUrl('localhost', 'http:', 'http://localhost:8000');
      expect(url).toBe('http://localhost:8000/healthz');
    });

    it('uses 127.0.0.1 origin when running locally on 127.0.0.1', () => {
      const url = resolveHealthUrl('127.0.0.1', 'http:', 'http://127.0.0.1:8000');
      expect(url).toBe('http://127.0.0.1:8000/healthz');
    });

    it('falls back to live Render backend on vercel.app when origin is localhost (prevent mixed-content / unreachable client localhost)', () => {
      const url = resolveHealthUrl('nexafreight.vercel.app', 'https:', 'http://localhost:8000');
      expect(url).toBe('https://nexafreight-backend.onrender.com/healthz');
    });

    it('falls back to live Render backend on vercel.app when origin is empty or dummy', () => {
      const url = resolveHealthUrl('nexafreight.vercel.app', 'https:', '');
      expect(url).toBe('https://nexafreight-backend.onrender.com/healthz');
    });

    it('uses same-origin /api/nexa proxy on other cloud domains when origin is localhost', () => {
      const url = resolveHealthUrl('custom-domain.com', 'https:', 'http://localhost:8000');
      expect(url).toBe('/api/nexa/healthz');
    });

    it('preserves valid custom HTTPS backend URL on cloud domains', () => {
      const url = resolveHealthUrl('nexafreight.vercel.app', 'https:', 'https://api.nexafreight.io');
      expect(url).toBe('https://api.nexafreight.io/healthz');
    });

    it('upgrades or proxies to /api/nexa/healthz if page is HTTPS but backend is HTTP on cloud domain', () => {
      const url = resolveHealthUrl('custom-domain.com', 'https:', 'http://insecure-backend.com');
      expect(url).toBe('/api/nexa/healthz');
    });
  });
});
