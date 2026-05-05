import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useReveal } from '../useReveal';

/*
 * Unit tests for the global reveal-on-scroll hook.
 *
 * Covers:
 * - Reduced-motion fast path: every observed `.reveal` and `.line-mask`
 *   gets `.in` on mount with no IntersectionObserver instance created.
 * - IntersectionObserver entry: a stub observer fires `isIntersecting`
 *   and the target receives `.in`; non-intersecting entries do not.
 * - Unmount cleanup: the IO and MO disconnect; the resize listener is
 *   removed.
 * - MutationObserver re-scan: a node inserted into the document body
 *   after mount is picked up and observed.
 */

interface ObservedEntryShape {
  target: Element;
  isIntersecting: boolean;
}

interface IOInstance {
  observed: Set<Element>;
  unobserved: Set<Element>;
  disconnected: boolean;
  options: IntersectionObserverInit | undefined;
  trigger: (entries: ObservedEntryShape[]) => void;
}

function installIntersectionObserverStub(): {
  instances: IOInstance[];
  restore: () => void;
} {
  const instances: IOInstance[] = [];
  const original = (globalThis as unknown as { IntersectionObserver?: unknown })
    .IntersectionObserver;

  class FakeIntersectionObserver {
    observed = new Set<Element>();
    unobserved = new Set<Element>();
    disconnected = false;
    options: IntersectionObserverInit | undefined;
    private cb: IntersectionObserverCallback;
    private instance: IOInstance;
    constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.cb = cb;
      this.options = options;
      this.instance = {
        observed: this.observed,
        unobserved: this.unobserved,
        disconnected: false,
        options,
        trigger: (entries) => {
          const ioEntries = entries.map(
            (e) =>
              ({
                target: e.target,
                isIntersecting: e.isIntersecting,
                intersectionRatio: e.isIntersecting ? 1 : 0,
                boundingClientRect: e.target.getBoundingClientRect(),
                intersectionRect: e.target.getBoundingClientRect(),
                rootBounds: null,
                time: 0,
              }) as IntersectionObserverEntry,
          );
          this.cb(ioEntries, this as unknown as IntersectionObserver);
        },
      };
      instances.push(this.instance);
    }
    observe(el: Element): void {
      this.observed.add(el);
    }
    unobserve(el: Element): void {
      this.unobserved.add(el);
      this.observed.delete(el);
    }
    disconnect(): void {
      this.disconnected = true;
      this.instance.disconnected = true;
      this.observed.clear();
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  Object.defineProperty(globalThis, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: FakeIntersectionObserver,
  });

  const restore = (): void => {
    if (typeof original === 'undefined') {
      delete (globalThis as unknown as Record<string, unknown>).IntersectionObserver;
    } else {
      Object.defineProperty(globalThis, 'IntersectionObserver', {
        configurable: true,
        writable: true,
        value: original,
      });
    }
  };

  return { instances, restore };
}

function setReducedMotion(reduced: boolean): () => void {
  const original = window.matchMedia;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn((query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce') ? reduced : false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
    })),
  });
  return () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: original,
    });
  };
}

function makeRevealNode(className = 'reveal'): HTMLDivElement {
  const el = document.createElement('div');
  el.className = className;
  // Place out of the viewport so the on-mount in-view fast path does not
  // fire and we can drive intersection through the stub directly.
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    top: 10_000,
    bottom: 11_000,
    left: 0,
    right: 100,
    width: 100,
    height: 1_000,
    x: 0,
    y: 10_000,
    toJSON: () => ({}),
  } as DOMRect);
  return el;
}

describe('useReveal', () => {
  let restoreReducedMotion: (() => void) | null = null;
  let ioHandle: ReturnType<typeof installIntersectionObserverStub> | null = null;

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    if (restoreReducedMotion) {
      restoreReducedMotion();
      restoreReducedMotion = null;
    }
    if (ioHandle) {
      ioHandle.restore();
      ioHandle = null;
    }
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('reduced-motion fast path: marks every .reveal and .line-mask with .in on mount', () => {
    restoreReducedMotion = setReducedMotion(true);
    const a = makeRevealNode('reveal');
    const b = makeRevealNode('line-mask');
    document.body.append(a, b);
    ioHandle = installIntersectionObserverStub();

    const { unmount } = renderHook(() => useReveal());
    expect(a.classList.contains('in')).toBe(true);
    expect(b.classList.contains('in')).toBe(true);
    // No IntersectionObserver instance is constructed under reduced-motion.
    expect(ioHandle.instances.length).toBe(0);
    unmount();
  });

  it('IntersectionObserver: applies .in only when the entry is intersecting', () => {
    restoreReducedMotion = setReducedMotion(false);
    const enter = makeRevealNode('reveal');
    const stay = makeRevealNode('reveal');
    document.body.append(enter, stay);
    ioHandle = installIntersectionObserverStub();

    renderHook(() => useReveal());
    expect(ioHandle.instances.length).toBe(1);
    const io = ioHandle.instances[0];
    expect(io.observed.has(enter)).toBe(true);
    expect(io.observed.has(stay)).toBe(true);

    io.trigger([
      { target: enter, isIntersecting: true },
      { target: stay, isIntersecting: false },
    ]);

    expect(enter.classList.contains('in')).toBe(true);
    expect(stay.classList.contains('in')).toBe(false);
    // The intersected target is unobserved; the non-intersecting one keeps watching.
    expect(io.unobserved.has(enter)).toBe(true);
    expect(io.unobserved.has(stay)).toBe(false);
  });

  it('does not stomp existing .in: a node already revealed is not re-observed', () => {
    restoreReducedMotion = setReducedMotion(false);
    const fresh = makeRevealNode('reveal');
    const already = makeRevealNode('reveal');
    already.classList.add('in');
    document.body.append(fresh, already);
    ioHandle = installIntersectionObserverStub();

    renderHook(() => useReveal());
    const io = ioHandle.instances[0];
    expect(io.observed.has(fresh)).toBe(true);
    expect(io.observed.has(already)).toBe(false);
    // The already-revealed node stays revealed.
    expect(already.classList.contains('in')).toBe(true);
  });

  it('unmount: disconnects observers and removes the resize listener', () => {
    restoreReducedMotion = setReducedMotion(false);
    const node = makeRevealNode('reveal');
    document.body.append(node);
    ioHandle = installIntersectionObserverStub();
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useReveal());
    const io = ioHandle.instances[0];
    expect(io.disconnected).toBe(false);

    unmount();
    expect(io.disconnected).toBe(true);
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('MutationObserver: a node inserted after mount is picked up', async () => {
    restoreReducedMotion = setReducedMotion(false);
    ioHandle = installIntersectionObserverStub();

    renderHook(() => useReveal());
    const io = ioHandle.instances[0];
    expect(io.observed.size).toBe(0);

    const inserted = makeRevealNode('reveal');
    document.body.append(inserted);
    // Allow the MutationObserver microtask to flush.
    await Promise.resolve();
    await Promise.resolve();

    expect(io.observed.has(inserted)).toBe(true);
  });
});
