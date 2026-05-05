import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Marquee } from '../Marquee';

// Single typed bridge between the test fake and the full MediaQueryList
// interface. Replaces the inline `as unknown as MediaQueryList` cast (F6).
interface FakeMediaQueryList {
  matches: boolean;
  media: string;
  onchange: ((ev: MediaQueryListEvent) => void) | null;
  addListener: () => void;
  removeListener: () => void;
  addEventListener: () => void;
  removeEventListener: () => void;
  dispatchEvent: () => boolean;
}

function asMediaQueryList(fake: FakeMediaQueryList): MediaQueryList {
  return fake as unknown as MediaQueryList;
}

function setReducedMotion(reduced: boolean): void {
  const matchMedia = (query: string): MediaQueryList => {
    const matches = query.includes('prefers-reduced-motion: reduce') ? reduced : false;
    return asMediaQueryList({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  };
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMedia,
  });
}

describe('<Marquee />', () => {
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
  });

  it('returns null for an empty items list so it never renders an empty track', () => {
    setReducedMotion(false);

    const { container } = render(<Marquee items={[]} />);

    expect(container.firstChild).toBeNull();
  });

  it('renders the running track when reduced-motion is not set', () => {
    setReducedMotion(false);

    const { container } = render(<Marquee items={['TypeScript', 'React']} />);

    const wrapper = container.querySelector('[data-state]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('data-state')).toBe('running');
    expect(wrapper?.querySelector('.marquee-track')).not.toBeNull();
    expect(wrapper?.querySelector('.marquee-static')).toBeNull();

    expect(screen.getAllByText('TypeScript')).toHaveLength(2);
    expect(screen.getAllByText('React')).toHaveLength(2);
  });

  it('freezes the track and exposes data-state="frozen" under reduced-motion', () => {
    setReducedMotion(true);

    const { container } = render(<Marquee items={['TypeScript', 'React']} />);

    const wrapper = container.querySelector('[data-state]');
    expect(wrapper).not.toBeNull();
    expect(wrapper?.getAttribute('data-state')).toBe('frozen');
    expect(wrapper?.querySelector('.marquee-track')).toBeNull();
    expect(wrapper?.querySelector('.marquee-static')).not.toBeNull();

    expect(screen.getAllByText('TypeScript')).toHaveLength(1);
    expect(screen.getAllByText('React')).toHaveLength(1);
  });

  it('marks the wrapper aria-hidden when no ariaLabel is given', () => {
    setReducedMotion(false);

    const { container } = render(<Marquee items={['TypeScript']} />);

    const wrapper = container.querySelector('[data-state]');
    expect(wrapper?.getAttribute('aria-hidden')).toBe('true');
    expect(wrapper?.getAttribute('aria-label')).toBeNull();
  });

  it('promotes the wrapper to a labelled region when ariaLabel is provided', () => {
    setReducedMotion(false);

    render(<Marquee items={['TypeScript']} ariaLabel="All skills" />);

    const region = screen.getByRole('region', { name: 'All skills' });
    expect(region.getAttribute('data-state')).toBe('running');
  });
});
