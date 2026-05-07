import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectCaseStudy } from '../ProjectCaseStudy';
import { sampleProjectFile } from './fixtures';

vi.mock('../../../lib/motion/preferences', () => ({
  prefersReducedMotion: () => false,
  usePrefersReducedMotion: () => false,
}));

describe('ProjectCaseStudy', () => {
  it('renders the title as the only h1', () => {
    render(<ProjectCaseStudy file={sampleProjectFile} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(sampleProjectFile.frontmatter.title);
  });

  it('renders subtitle, tagline, and summary from frontmatter', () => {
    render(<ProjectCaseStudy file={sampleProjectFile} />);
    expect(screen.getAllByText(sampleProjectFile.frontmatter.subtitle).length).toBeGreaterThan(0);
    expect(screen.getByText(sampleProjectFile.frontmatter.tagline)).toBeInTheDocument();
    expect(screen.getByText(sampleProjectFile.frontmatter.summary)).toBeInTheDocument();
  });

  it('renders meta keys Year, Role, Sector, Status with their values inside .proj-meta', () => {
    const { container } = render(<ProjectCaseStudy file={sampleProjectFile} />);
    const meta = container.querySelector('.proj-meta') as HTMLElement | null;
    expect(meta).not.toBeNull();
    if (!meta) return;
    const scope = within(meta);
    for (const [key, value] of Object.entries(sampleProjectFile.frontmatter.meta)) {
      expect(scope.getByText(key)).toBeInTheDocument();
      expect(scope.getByText(value)).toBeInTheDocument();
    }
  });

  it('renders one stack chip per declared technology', () => {
    render(<ProjectCaseStudy file={sampleProjectFile} />);
    for (const tech of sampleProjectFile.frontmatter.stack) {
      expect(screen.getByText(tech)).toBeInTheDocument();
    }
  });

  it('renders one visual placeholder per declared visual', () => {
    render(<ProjectCaseStudy file={sampleProjectFile} />);
    for (const visual of sampleProjectFile.frontmatter.visuals) {
      expect(screen.getByText(visual.label)).toBeInTheDocument();
    }
  });

  it('renders the Notes section when body is present and omits it when empty', () => {
    const { container } = render(<ProjectCaseStudy file={sampleProjectFile} />);
    const notesSection = container.querySelector(
      '[aria-labelledby="case-study-narrative-heading"]',
    );
    expect(notesSection).not.toBeNull();

    const empty = { ...sampleProjectFile, body: '' };
    const { container: emptyContainer } = render(<ProjectCaseStudy file={empty} />);
    const emptyNotes = emptyContainer.querySelector(
      '[aria-labelledby="case-study-narrative-heading"]',
    );
    expect(emptyNotes).toBeNull();
  });
});
