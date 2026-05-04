import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MagneticButton } from '../MagneticButton';

interface MediaState {
  reducedMotion: boolean;
  pointerFine: boolean;
}

function installMatchMedia(state: MediaState): void {
  const matchMedia = (query: string): MediaQueryList => {
    let matches = false;
    if (query.includes('prefers-reduced-motion: reduce')) {
      matches = state.reducedMotion;
    } else if (query.includes('pointer: fine')) {
      matches = state.pointerFine;
    }
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

describe('<MagneticButton />', () => {
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
    vi.restoreAllMocks();
  });

  it('renders the child and marks the wrapper data-magnet="on" when fine pointer and motion is allowed', () => {
    installMatchMedia({ reducedMotion: false, pointerFine: true });

    render(
      <MagneticButton>
        <a href="/cv.pdf">Download CV</a>
      </MagneticButton>,
    );

    const link = screen.getByRole('link', { name: 'Download CV' });
    const wrapper = link.parentElement;
    expect(wrapper).not.toBeNull();
    if (wrapper === null) throw new Error('wrapper missing');
    expect(wrapper.getAttribute('data-magnet')).toBe('on');
  });

  it('disables the magnetic effect on reduced-motion: no listeners attached, wrapper marked off', () => {
    installMatchMedia({ reducedMotion: true, pointerFine: true });

    const addSpy = vi.fn();
    const removeSpy = vi.fn();
    const realAdd = HTMLSpanElement.prototype.addEventListener;
    const realRemove = HTMLSpanElement.prototype.removeEventListener;
    HTMLSpanElement.prototype.addEventListener = function patched(
      ...args: Parameters<typeof realAdd>
    ) {
      addSpy(...args);
      return realAdd.apply(this, args);
    };
    HTMLSpanElement.prototype.removeEventListener = function patched(
      ...args: Parameters<typeof realRemove>
    ) {
      removeSpy(...args);
      return realRemove.apply(this, args);
    };

    try {
      render(
        <MagneticButton>
          <a href="/cv.pdf">Download CV</a>
        </MagneticButton>,
      );

      const link = screen.getByRole('link', { name: 'Download CV' });
      const wrapper = link.parentElement;
      expect(wrapper).not.toBeNull();
      if (wrapper === null) throw new Error('wrapper missing');
      expect(wrapper.getAttribute('data-magnet')).toBe('off');

      // No mousemove or mouseleave listeners attached on the disabled path.
      const types = addSpy.mock.calls.map((call) => call[0]);
      expect(types).not.toContain('mousemove');
      expect(types).not.toContain('mouseleave');
    } finally {
      HTMLSpanElement.prototype.addEventListener = realAdd;
      HTMLSpanElement.prototype.removeEventListener = realRemove;
    }
  });

  it('disables the magnetic effect on coarse pointer (touch): wrapper marked off, no listeners', () => {
    installMatchMedia({ reducedMotion: false, pointerFine: false });

    const addSpy = vi.fn();
    const realAdd = HTMLSpanElement.prototype.addEventListener;
    HTMLSpanElement.prototype.addEventListener = function patched(
      ...args: Parameters<typeof realAdd>
    ) {
      addSpy(...args);
      return realAdd.apply(this, args);
    };

    try {
      render(
        <MagneticButton>
          <button type="button">Press</button>
        </MagneticButton>,
      );

      const button = screen.getByRole('button', { name: 'Press' });
      const wrapper = button.parentElement;
      expect(wrapper).not.toBeNull();
      if (wrapper === null) throw new Error('wrapper missing');
      expect(wrapper.getAttribute('data-magnet')).toBe('off');

      const types = addSpy.mock.calls.map((call) => call[0]);
      expect(types).not.toContain('mousemove');
      expect(types).not.toContain('mouseleave');
    } finally {
      HTMLSpanElement.prototype.addEventListener = realAdd;
    }
  });

  it('passes className through to the wrapper span on both paths', () => {
    installMatchMedia({ reducedMotion: false, pointerFine: true });

    render(
      <MagneticButton className="inline-flex">
        <a href="/cv.pdf">Download CV</a>
      </MagneticButton>,
    );

    const link = screen.getByRole('link', { name: 'Download CV' });
    const wrapper = link.parentElement;
    expect(wrapper).not.toBeNull();
    if (wrapper === null) throw new Error('wrapper missing');
    expect(wrapper.className).toBe('inline-flex');
  });
});
