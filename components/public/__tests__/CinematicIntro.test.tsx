import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CinematicIntro } from '../CinematicIntro';
import { samplePerson } from './fixtures';

/*
 * CinematicIntro component tests.
 *
 * The intro is the first thing users meet on the home page, so the contract
 * is exercised end-to-end at the React layer: visibility gates, skip paths,
 * and the seenStorage handshake. The full visual sequence (rAF clock,
 * progress bar, phase transitions) is left to manual verification under
 * design_handoff_portfolio/design/shared.jsx#Intro because timing values
 * are explicitly excluded from the TDD discipline (implementation-plan.md).
 */

const introPerson = {
  role: samplePerson.role,
  location: samplePerson.location,
  estYear: samplePerson.estYear,
};

function mockMatchMedia(reduceMotion: boolean) {
  const media = vi.fn().mockImplementation((query: string) => ({
    matches: query === '(prefers-reduced-motion: reduce)' ? reduceMotion : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: media,
  });
}

describe('CinematicIntro', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('renders nothing when prefers-reduced-motion: reduce is set, and marks the intro as seen', () => {
    mockMatchMedia(true);
    const { container } = render(<CinematicIntro person={introPerson} />);
    expect(container.querySelector('.intro')).toBeNull();
    expect(window.localStorage.getItem('intro:seen')).toBe('1');
  });

  it('renders nothing on the second visit because seenStorage is set', () => {
    window.localStorage.setItem('intro:seen', '1');
    const { container } = render(<CinematicIntro person={introPerson} />);
    expect(container.querySelector('.intro')).toBeNull();
  });

  it('mounts the overlay on the first visit and exposes a Skip button', () => {
    render(<CinematicIntro person={introPerson} />);
    const skip = screen.getByRole('button', { name: /skip intro/i });
    expect(skip).toBeInTheDocument();
    expect(skip).toHaveAttribute('aria-label', 'Skip intro');
  });

  it('renders the footer metadata row from person.role / location / estYear', () => {
    render(<CinematicIntro person={introPerson} />);
    expect(screen.getByText(introPerson.role)).toBeInTheDocument();
    expect(screen.getByText(introPerson.location)).toBeInTheDocument();
    expect(screen.getByText(`Est. ${introPerson.estYear}`)).toBeInTheDocument();
  });

  it('clicking Skip transitions the intro to done and marks seenStorage', async () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<CinematicIntro person={introPerson} />);
      const skip = screen.getByRole('button', { name: /skip intro/i });
      fireEvent.click(skip);
      // Advance through the fade-out and the post-fade unmount.
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(container.querySelector('.intro')).toBeNull();
      expect(window.localStorage.getItem('intro:seen')).toBe('1');
    } finally {
      vi.useRealTimers();
    }
  });

  it('pressing Escape transitions the intro to done', async () => {
    vi.useFakeTimers();
    try {
      const { container } = render(<CinematicIntro person={introPerson} />);
      // Confirm the overlay is mounted before the keypress.
      expect(container.querySelector('.intro')).not.toBeNull();
      fireEvent.keyDown(window, { key: 'Escape' });
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(container.querySelector('.intro')).toBeNull();
      expect(window.localStorage.getItem('intro:seen')).toBe('1');
    } finally {
      vi.useRealTimers();
    }
  });
});
