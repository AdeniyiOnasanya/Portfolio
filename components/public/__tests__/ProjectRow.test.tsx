import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion, usePrefersReducedMotion } from '../../../lib/motion/preferences';
import { ProjectRow } from '../ProjectRow';

vi.mock('../../../lib/motion/preferences', () => ({
  prefersReducedMotion: vi.fn(),
  usePrefersReducedMotion: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe('ProjectRow', () => {
  beforeEach(() => {
    vi.mocked(prefersReducedMotion).mockReturnValue(false);
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders a link to /projects/<slug> with the slug as visible text', () => {
    render(<ProjectRow slug="project-one" index={0} />);
    const link = screen.getByRole('link', { name: /project-one/ });
    expect(link).toHaveAttribute('href', '/projects/project-one');
    expect(link).toHaveTextContent('project-one');
  });

  it('renders the index padded to two digits', () => {
    render(<ProjectRow slug="project-one" index={0} />);
    expect(screen.getByText('01')).toBeInTheDocument();
  });

  it('carries the per-slug view-transition-name on the title when motion is allowed', () => {
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
    const { container } = render(<ProjectRow slug="project-one" index={0} />);
    const titled = container.querySelector('[data-project-row-title]') as HTMLElement | null;
    expect(titled).not.toBeNull();
    expect(titled?.style.viewTransitionName).toBe('project-project-one');
  });

  it('does NOT set view-transition-name when reduced-motion is on (instant nav)', () => {
    vi.mocked(usePrefersReducedMotion).mockReturnValue(true);
    const { container } = render(<ProjectRow slug="project-one" index={0} />);
    const titled = container.querySelector('[data-project-row-title]') as HTMLElement | null;
    expect(titled).not.toBeNull();
    expect(titled?.style.viewTransitionName ?? '').toBe('');
    expect(titled?.getAttribute('style') ?? '').not.toMatch(/view-transition-name/);
  });

  it('uses a unique view-transition-name per slug (pairs with the case-study heading)', () => {
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
    const { container, rerender } = render(<ProjectRow slug="alpha" index={0} />);
    const first = container.querySelector('[data-project-row-title]') as HTMLElement;
    expect(first.style.viewTransitionName).toBe('project-alpha');

    rerender(<ProjectRow slug="beta" index={1} />);
    const second = container.querySelector('[data-project-row-title]') as HTMLElement;
    expect(second.style.viewTransitionName).toBe('project-beta');
  });
});
