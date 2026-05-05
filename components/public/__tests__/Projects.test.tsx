import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Projects } from '../Projects';
import { sampleProjects } from './fixtures';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock the motion hooks the same way ProjectRow.test.tsx does so the assertions
// in this file do not depend on happy-dom's matchMedia behaviour. Default to
// motion allowed (reduced returns false) since these tests do not exercise the
// reduced-motion gate; the dedicated ProjectRow.test.tsx covers that path.
vi.mock('../../../lib/motion/preferences', () => ({
  usePrefersReducedMotion: () => false,
  prefersReducedMotion: () => false,
}));

describe('Projects', () => {
  it('renders an h2 titled Selected work inside a region with that label', () => {
    render(<Projects projects={sampleProjects} />);
    const heading = screen.getByRole('heading', {
      level: 2,
      name: 'Selected work',
    });
    const region = screen.getByRole('region', { name: 'Selected work' });
    expect(region).toContainElement(heading);
  });

  it('renders one link per slug pointing at /projects/<slug>', () => {
    render(<Projects projects={sampleProjects} />);
    for (const slug of sampleProjects) {
      const link = screen.getByRole('link', { name: new RegExp(slug) });
      expect(link).toHaveAttribute('href', `/projects/${slug}`);
    }
  });
});
