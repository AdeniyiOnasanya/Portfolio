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
      const event = { matches, media: mql.media } as MediaQueryListEvent;
      for (const listener of listeners) listener(event);
    },
  };
  return mql;
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
      value: vi.fn(() => mql as unknown as MediaQueryList),
    });
    expect(prefersReducedMotion()).toBe(false);
  });

  it('returns true when the OS preference is reduce', () => {
    const mql = makeMediaQueryList(true);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => mql as unknown as MediaQueryList),
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

  it('SSR default is false: the initial state mirrors the no-window contract before effects fire', () => {
    // In a server render there is no `window`. The hook returns its initial
    // useState value, which by contract is `false`. We assert by simulating
    // a no-window environment for the synchronous initial render path.
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
      value: vi.fn(() => mql as unknown as MediaQueryList),
    });
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it('flips when the OS toggle changes while the page is open', () => {
    const mql = makeMediaQueryList(false);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn(() => mql as unknown as MediaQueryList),
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
      value: vi.fn(() => mql as unknown as MediaQueryList),
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
