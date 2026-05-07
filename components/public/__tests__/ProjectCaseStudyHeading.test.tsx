import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePrefersReducedMotion } from '../../../lib/motion/preferences';
import { ProjectCaseStudyHeading } from '../ProjectCaseStudyHeading';

vi.mock('../../../lib/motion/preferences', () => ({
  prefersReducedMotion: vi.fn(() => false),
  usePrefersReducedMotion: vi.fn(),
}));

describe('ProjectCaseStudyHeading', () => {
  beforeEach(() => {
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders an h1 with the title text and the supplied id', () => {
    const { container } = render(
      <ProjectCaseStudyHeading id="case-study-heading" slug="alpha" className="font-serif">
        Alpha title
      </ProjectCaseStudyHeading>,
    );
    const h1 = container.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1?.id).toBe('case-study-heading');
    expect(h1?.textContent).toBe('Alpha title');
    expect(h1?.className).toContain('font-serif');
  });

  it('carries the per-slug view-transition-name when motion is allowed', () => {
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
    const { container } = render(
      <ProjectCaseStudyHeading id="case-study-heading" slug="alpha">
        Alpha title
      </ProjectCaseStudyHeading>,
    );
    const h1 = container.querySelector('h1') as HTMLElement;
    expect(h1.style.viewTransitionName).toBe('project-alpha');
  });

  it('does NOT set view-transition-name under reduced-motion (instant nav, no morph)', () => {
    vi.mocked(usePrefersReducedMotion).mockReturnValue(true);
    const { container } = render(
      <ProjectCaseStudyHeading id="case-study-heading" slug="alpha">
        Alpha title
      </ProjectCaseStudyHeading>,
    );
    const h1 = container.querySelector('h1') as HTMLElement;
    expect(h1.style.viewTransitionName ?? '').toBe('');
    expect(h1.getAttribute('style') ?? '').not.toMatch(/view-transition-name/);
  });

  it('uses a unique view-transition-name per slug', () => {
    vi.mocked(usePrefersReducedMotion).mockReturnValue(false);
    const { container, rerender } = render(
      <ProjectCaseStudyHeading id="h" slug="alpha">
        Title A
      </ProjectCaseStudyHeading>,
    );
    expect((container.querySelector('h1') as HTMLElement).style.viewTransitionName).toBe(
      'project-alpha',
    );

    rerender(
      <ProjectCaseStudyHeading id="h" slug="beta">
        Title B
      </ProjectCaseStudyHeading>,
    );
    expect((container.querySelector('h1') as HTMLElement).style.viewTransitionName).toBe(
      'project-beta',
    );
  });
});
