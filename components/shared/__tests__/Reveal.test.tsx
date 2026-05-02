import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Reveal } from '../Reveal';

interface ObserverInstance {
  callback: IntersectionObserverCallback;
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  options: IntersectionObserverInit | undefined;
}

function setReducedMotion(reduced: boolean): void {
  const matchMedia = (query: string): MediaQueryList => {
    const matches = query.includes('prefers-reduced-motion: reduce') ? reduced : false;
    return {
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;
  };
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMedia,
  });
}

describe('<Reveal />', () => {
  let instances: ObserverInstance[] = [];
  let originalMatchMedia: typeof window.matchMedia;
  let originalIO: typeof IntersectionObserver | undefined;

  beforeEach(() => {
    instances = [];
    originalMatchMedia = window.matchMedia;
    originalIO = (globalThis as { IntersectionObserver?: typeof IntersectionObserver })
      .IntersectionObserver;

    class FakeObserver implements IntersectionObserver {
      readonly root: Element | Document | null = null;
      readonly rootMargin: string = '';
      readonly thresholds: ReadonlyArray<number> = [];
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn(() => []);

      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        instances.push({
          callback,
          observe: this.observe,
          unobserve: this.unobserve,
          disconnect: this.disconnect,
          options,
        });
      }
    }

    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: FakeObserver,
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
    if (originalIO === undefined) {
      // happy-dom does not ship IntersectionObserver natively; remove the fake.
      Reflect.deleteProperty(globalThis, 'IntersectionObserver');
    } else {
      Object.defineProperty(globalThis, 'IntersectionObserver', {
        configurable: true,
        writable: true,
        value: originalIO,
      });
    }
  });

  it('renders hidden, observes the node, and reveals on first intersection', () => {
    setReducedMotion(false);

    render(
      <Reveal>
        <p>hello</p>
      </Reveal>,
    );

    const wrapper = screen.getByText('hello').parentElement;
    expect(wrapper).not.toBeNull();
    if (wrapper === null) throw new Error('wrapper missing');

    expect(wrapper.getAttribute('data-reveal')).toBe('hidden');
    expect(instances).toHaveLength(1);
    const inst = instances[0];
    if (inst === undefined) throw new Error('observer instance missing');

    expect(inst.observe).toHaveBeenCalledTimes(1);
    expect(inst.observe.mock.calls[0]?.[0]).toBe(wrapper);

    act(() => {
      inst.callback(
        [
          {
            isIntersecting: true,
            target: wrapper,
            time: 0,
            intersectionRatio: 1,
            intersectionRect: {} as DOMRectReadOnly,
            boundingClientRect: {} as DOMRectReadOnly,
            rootBounds: null,
          },
        ] as IntersectionObserverEntry[],
        inst as unknown as IntersectionObserver,
      );
    });

    expect(wrapper.getAttribute('data-reveal')).toBe('visible');
    expect(inst.disconnect).toHaveBeenCalledTimes(1);
  });

  it('skips the observer entirely when prefers-reduced-motion is reduce', () => {
    setReducedMotion(true);

    render(
      <Reveal>
        <p>reduced</p>
      </Reveal>,
    );

    const wrapper = screen.getByText('reduced').parentElement;
    expect(wrapper).not.toBeNull();
    if (wrapper === null) throw new Error('wrapper missing');

    expect(wrapper.getAttribute('data-reveal')).toBe('visible');
    expect(instances).toHaveLength(0);
  });

  it('passes through className and merges custom style with the reveal styles', () => {
    setReducedMotion(false);

    render(
      <Reveal className="space-y-md" style={{ color: 'red' }}>
        <p>styled</p>
      </Reveal>,
    );

    const wrapper = screen.getByText('styled').parentElement;
    expect(wrapper).not.toBeNull();
    if (wrapper === null) throw new Error('wrapper missing');

    expect(wrapper.className).toBe('space-y-md');
    expect(wrapper.style.color).toBe('red');
    expect(wrapper.style.opacity).toBe('0');
  });
});
