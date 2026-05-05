import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion, usePointerFine, usePrefersReducedMotion } from '../preferences';

interface FakeMediaQueryList {
  matches: boolean;
  media: string;
  addEventListener: (type: 'change', listener: (ev: MediaQueryListEvent) => void) => void;
  removeEventListener: (type: 'change', listener: (ev: MediaQueryListEvent) => void) => void;
  dispatchEvent: (event: Event) => boolean;
  fire: (matches: boolean) => void;
  onchange: ((ev: MediaQueryListEvent) => void) | null;
  addListener: (listener: (ev: MediaQueryListEvent) => void) => void;
  removeListener: (listener: (ev: MediaQueryListEvent) => void) => void;
}

function makeMediaQueryList(
  initialMatches: boolean,
  media: string = '(prefers-reduced-motion: reduce)',
): FakeMediaQueryList {
  const listeners = new Set<(ev: MediaQueryListEvent) => void>();
  const mql: FakeMediaQueryList = {
    matches: initialMatches,
    media,
    onchange: null,
    addEventListener: (_type, listener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type, listener) => {
      listeners.delete(listener);
    },
    addListener: (listener) => {
      listeners.add(listener);
    },
    removeListener: (listener) => {
      listeners.delete(listener);
    },
    dispatchEvent: () => true,
    fire: (matches) => {
      mql.matches = matches;
      const event: MediaQueryListEvent = Object.assign(new Event('change'), {
        matches,
        media: mql.media,
      });
      for (const listener of listeners) listener(event);
    },
  };
  return mql;
}

// Single typed bridge between FakeMediaQueryList and the full MediaQueryList
// interface. Replaces five inline `as unknown as MediaQueryList` casts so the
// cast surface is one explicit helper, not scattered double-casts (F6).
function asMediaQueryList(fake: FakeMediaQueryList): MediaQueryList {
  return fake as unknown as MediaQueryList;
}

describe('prefersReducedMotion (one-shot)', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
    vi.restoreAllMocks();
  });

  it('returns false when the OS preference is not reduce', () => {
    const mql = makeMediaQueryList(false);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => asMediaQueryList(mql)),
    });
    expect(prefersReducedMotion()).toBe(false);
  });

  it('returns true when the OS preference is reduce', () => {
    const mql = makeMediaQueryList(true);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => asMediaQueryList(mql)),
    });
    expect(prefersReducedMotion()).toBe(true);
  });

  it('returns false when matchMedia is unavailable', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    expect(prefersReducedMotion()).toBe(false);
  });
});

describe('usePrefersReducedMotion', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('returns false when matchMedia is unavailable on mount (covers the SSR contract path)', () => {
    // We cannot fully simulate SSR inside happy-dom; this test exercises the
    // matchMedia-absent branch in the useEffect, which is the same code path
    // a server render hits (window is undefined; matchMedia is unavailable).
    // The hook's `useState(false)` initial value is what produces `false`
    // here, mirroring the SSR contract documented in preferences.ts.
    const originalWindowMatchMedia = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalWindowMatchMedia,
    });
  });

  it('reads the live media query value on mount', () => {
    const mql = makeMediaQueryList(true);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => asMediaQueryList(mql)),
    });
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it('flips when the OS toggle changes while the page is open', () => {
    const mql = makeMediaQueryList(false);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => asMediaQueryList(mql)),
    });
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      mql.fire(true);
    });
    expect(result.current).toBe(true);

    act(() => {
      mql.fire(false);
    });
    expect(result.current).toBe(false);
  });

  it('unsubscribes the listener on unmount', () => {
    const mql = makeMediaQueryList(false);
    const removeSpy = vi.spyOn(mql, 'removeEventListener');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => asMediaQueryList(mql)),
    });
    const { unmount } = renderHook(() => usePrefersReducedMotion());
    unmount();
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });
});

describe('usePointerFine', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('SSR default is false: the initial state mirrors the no-window contract before effects fire', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    const { result } = renderHook(() => usePointerFine());
    expect(result.current).toBe(false);
  });

  it('returns true when the live media query matches (pointer: fine)', () => {
    const mql = makeMediaQueryList(true, '(pointer: fine)');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => mql as unknown as MediaQueryList),
    });
    const { result } = renderHook(() => usePointerFine());
    expect(result.current).toBe(true);
  });

  it('returns false when the live media query is coarse', () => {
    const mql = makeMediaQueryList(false, '(pointer: fine)');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => mql as unknown as MediaQueryList),
    });
    const { result } = renderHook(() => usePointerFine());
    expect(result.current).toBe(false);
  });

  it('flips when the input class changes while the page is open', () => {
    const mql = makeMediaQueryList(false, '(pointer: fine)');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => mql as unknown as MediaQueryList),
    });
    const { result } = renderHook(() => usePointerFine());
    expect(result.current).toBe(false);

    act(() => {
      mql.fire(true);
    });
    expect(result.current).toBe(true);
  });

  it('unsubscribes the listener on unmount', () => {
    const mql = makeMediaQueryList(false, '(pointer: fine)');
    const removeSpy = vi.spyOn(mql, 'removeEventListener');
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => mql as unknown as MediaQueryList),
    });
    const { unmount } = renderHook(() => usePointerFine());
    unmount();
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });
});
