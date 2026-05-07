import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomCursor } from '../CustomCursor';

interface FakeMediaQueryList {
  matches: boolean;
  media: string;
  onchange: ((ev: MediaQueryListEvent) => void) | null;
  addEventListener: (type: 'change', listener: (ev: MediaQueryListEvent) => void) => void;
  removeEventListener: (type: 'change', listener: (ev: MediaQueryListEvent) => void) => void;
  addListener: (listener: (ev: MediaQueryListEvent) => void) => void;
  removeListener: (listener: (ev: MediaQueryListEvent) => void) => void;
  dispatchEvent: (event: Event) => boolean;
}

function makeMql(media: string, matches: boolean): FakeMediaQueryList {
  return {
    matches,
    media,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
  };
}

/**
 * Install a synthetic `window.matchMedia` that returns predetermined
 * matches per query. The custom cursor reads two queries:
 * `(prefers-reduced-motion: reduce)` and `(pointer: fine)`. Each test
 * wires the pair it cares about and asserts the rendered output.
 */
function installMatchMedia(reducedMotion: boolean, pointerFine: boolean): void {
  const matchMedia = (query: string): MediaQueryList => {
    if (query.includes('prefers-reduced-motion: reduce')) {
      return makeMql(query, reducedMotion) as unknown as MediaQueryList;
    }
    if (query.includes('pointer: fine')) {
      return makeMql(query, pointerFine) as unknown as MediaQueryList;
    }
    return makeMql(query, false) as unknown as MediaQueryList;
  };
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn(matchMedia),
  });
}

describe('<CustomCursor />', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
    document.documentElement.removeAttribute('data-custom-cursor');
  });

  it('renders nothing when prefers-reduced-motion is reduce', () => {
    installMatchMedia(true, true);
    const { container } = render(<CustomCursor />);
    expect(container.firstChild).toBeNull();
    expect(document.documentElement.hasAttribute('data-custom-cursor')).toBe(false);
  });

  it('renders nothing when the pointer is coarse', () => {
    installMatchMedia(false, false);
    const { container } = render(<CustomCursor />);
    expect(container.firstChild).toBeNull();
    expect(document.documentElement.hasAttribute('data-custom-cursor')).toBe(false);
  });

  it('renders the dot and ring when fine pointer and no reduced-motion', () => {
    installMatchMedia(false, true);
    const { container } = render(<CustomCursor />);
    const dot = container.querySelector('.cursor-dot');
    const ring = container.querySelector('.cursor-ring');
    expect(dot).not.toBeNull();
    expect(ring).not.toBeNull();
    expect(dot?.getAttribute('aria-hidden')).toBe('true');
    expect(ring?.getAttribute('aria-hidden')).toBe('true');
    expect(document.documentElement.hasAttribute('data-custom-cursor')).toBe(true);
  });

  it('removes the data-custom-cursor flag on unmount so the system cursor returns', () => {
    installMatchMedia(false, true);
    const { unmount } = render(<CustomCursor />);
    expect(document.documentElement.hasAttribute('data-custom-cursor')).toBe(true);
    unmount();
    expect(document.documentElement.hasAttribute('data-custom-cursor')).toBe(false);
  });
});
