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
