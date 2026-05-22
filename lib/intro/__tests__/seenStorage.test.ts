import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasSeenIntro, markIntroSeen } from '../seenStorage';

describe('seenStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('hasSeenIntro', () => {
    it('returns false when localStorage has no entry', () => {
      expect(hasSeenIntro()).toBe(false);
    });

    it('returns true after markIntroSeen() writes the flag', () => {
      markIntroSeen();
      expect(hasSeenIntro()).toBe(true);
    });

    it('returns false when getItem throws (Safari private mode)', () => {
      const spy = vi.spyOn(window.localStorage, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError: storage disabled');
      });
      try {
        expect(hasSeenIntro()).toBe(false);
      } finally {
        spy.mockRestore();
      }
    });

    it('returns false when the stored value is something other than the seen marker', () => {
      window.localStorage.setItem('intro:seen', '0');
      expect(hasSeenIntro()).toBe(false);
    });
  });

  describe('markIntroSeen', () => {
    it('persists the flag so a subsequent read returns true', () => {
      markIntroSeen();
      expect(window.localStorage.getItem('intro:seen')).toBe('1');
    });

    it('swallows write errors (Safari private mode, quota)', () => {
      const spy = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
      try {
        expect(() => {
          markIntroSeen();
        }).not.toThrow();
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('SSR safety', () => {
    it('hasSeenIntro returns false when window is undefined', async () => {
      // Re-import the module under a stubbed-global where window is absent.
      // Vitest runs each test in a single happy-dom context, so we delete the
      // module from cache, redefine `window` to undefined, and re-evaluate.
      vi.resetModules();
      const originalWindow = globalThis.window;
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        writable: true,
        value: undefined,
      });
      try {
        const mod = await import('../seenStorage');
        expect(mod.hasSeenIntro()).toBe(false);
      } finally {
        Object.defineProperty(globalThis, 'window', {
          configurable: true,
          writable: true,
          value: originalWindow,
        });
        vi.resetModules();
      }
    });

    it('markIntroSeen is a no-op when window is undefined', async () => {
      vi.resetModules();
      const originalWindow = globalThis.window;
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        writable: true,
        value: undefined,
      });
      try {
        const mod = await import('../seenStorage');
        expect(() => {
          mod.markIntroSeen();
        }).not.toThrow();
      } finally {
        Object.defineProperty(globalThis, 'window', {
          configurable: true,
          writable: true,
          value: originalWindow,
        });
        vi.resetModules();
      }
    });
  });
});
