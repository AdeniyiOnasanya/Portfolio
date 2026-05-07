import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Projects } from '../Projects';
import { sampleProjectList } from './fixtures';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('../../../lib/motion/preferences', () => ({
  usePrefersReducedMotion: () => false,
  prefersReducedMotion: () => false,
}));

describe('Projects', () => {
  it('renders a region labelled Selected work containing the editorial h2', () => {
    render(<Projects projects={sampleProjectList} />);
    const region = screen.getByRole('region', { name: 'Selected work' });
    const heading = screen.getByRole('heading', { level: 2 });
    expect(region).toContainElement(heading);
  });

  it('renders one link per project pointing at /projects/<slug>', () => {
    render(<Projects projects={sampleProjectList} />);
    for (const project of sampleProjectList) {
      const link = screen.getByRole('link', { name: new RegExp(project.title) });
      expect(link).toHaveAttribute('href', `/projects/${project.slug}`);
    }
  });

  it('renders the design 5-cell row content (num, year, title, subtitle, kind)', () => {
    render(<Projects projects={sampleProjectList} />);
    for (const project of sampleProjectList) {
      expect(screen.getByText(project.n)).toBeInTheDocument();
      expect(screen.getByText(project.year)).toBeInTheDocument();
      expect(screen.getByText(project.title)).toBeInTheDocument();
      expect(screen.getByText(`- ${project.subtitle}`)).toBeInTheDocument();
      expect(screen.getByText(project.kind)).toBeInTheDocument();
    }
  });
});
