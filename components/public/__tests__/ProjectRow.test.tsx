import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prefersReducedMotion, usePrefersReducedMotion } from '../../../lib/motion/preferences';
import { ProjectRow } from '../ProjectRow';
import { sampleProjectList } from './fixtures';

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

const sample = sampleProjectList[0];
if (!sample) {
  throw new Error('sampleProjectList must include at least one project for tests.');
}

describe('ProjectRow', () => {
  beforeEach(() => {
    vi.mocked(prefersReducedMotion).mockReturnValue(false);
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders a link to /projects/<slug> with the project title visible', () => {
    render(<ProjectRow project={sample} />);
    const link = screen.getByRole('link', { name: new RegExp(sample.title) });
    expect(link).toHaveAttribute('href', `/projects/${sample.slug}`);
    expect(link).toHaveTextContent(sample.title);
  });

  it('renders the project number, year, kind, and a subtitle', () => {
    render(<ProjectRow project={sample} />);
    expect(screen.getByText(sample.n)).toBeInTheDocument();
    expect(screen.getByText(sample.year)).toBeInTheDocument();
    expect(screen.getByText(sample.kind)).toBeInTheDocument();
    expect(screen.getByText(`- ${sample.subtitle}`)).toBeInTheDocument();
  });

  it('carries the per-slug view-transition-name on the title when motion is allowed', () => {
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
    const { container } = render(<ProjectRow project={sample} />);
    const titled = container.querySelector('[data-project-row-title]') as HTMLElement | null;
    expect(titled).not.toBeNull();
    expect(titled?.style.viewTransitionName).toBe(`project-${sample.slug}`);
  });

  it('does NOT set view-transition-name when reduced-motion is on (instant nav)', () => {
    vi.mocked(usePrefersReducedMotion).mockReturnValue(true);
    const { container } = render(<ProjectRow project={sample} />);
    const titled = container.querySelector('[data-project-row-title]') as HTMLElement | null;
    expect(titled).not.toBeNull();
    expect(titled?.style.viewTransitionName ?? '').toBe('');
    expect(titled?.getAttribute('style') ?? '').not.toMatch(/view-transition-name/);
  });

  it('uses a unique view-transition-name per project (pairs with the case-study heading)', () => {
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
    const second = sampleProjectList[1];
    if (!second) throw new Error('sampleProjectList must include at least two projects.');
    const { container, rerender } = render(<ProjectRow project={sample} />);
    const first = container.querySelector('[data-project-row-title]') as HTMLElement;
    expect(first.style.viewTransitionName).toBe(`project-${sample.slug}`);

    rerender(<ProjectRow project={second} />);
    const next = container.querySelector('[data-project-row-title]') as HTMLElement;
    expect(next.style.viewTransitionName).toBe(`project-${second.slug}`);
  });
});
