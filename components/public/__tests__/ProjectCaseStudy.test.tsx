import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProjectCaseStudy } from '../ProjectCaseStudy';
import { sampleProjectFile } from './fixtures';

describe('ProjectCaseStudy', () => {
  it('renders the title as the only h1', () => {
    render(<ProjectCaseStudy file={sampleProjectFile} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(sampleProjectFile.frontmatter.title);
  });

  it('renders subtitle, tagline, and summary from frontmatter', () => {
    render(<ProjectCaseStudy file={sampleProjectFile} />);
    expect(screen.getByText(sampleProjectFile.frontmatter.subtitle)).toBeInTheDocument();
    expect(screen.getByText(sampleProjectFile.frontmatter.tagline)).toBeInTheDocument();
    expect(screen.getByText(sampleProjectFile.frontmatter.summary)).toBeInTheDocument();
  });

  it('renders meta keys Year, Role, Sector, Status with their values', () => {
    render(<ProjectCaseStudy file={sampleProjectFile} />);
    for (const [key, value] of Object.entries(sampleProjectFile.frontmatter.meta)) {
      expect(screen.getByText(key)).toBeInTheDocument();
      expect(screen.getByText(value)).toBeInTheDocument();
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

  it('renders the body when present, omits the Notes heading when empty', () => {
    render(<ProjectCaseStudy file={sampleProjectFile} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Notes' })).toBeInTheDocument();

    const empty = { ...sampleProjectFile, body: '' };
    const { container } = render(<ProjectCaseStudy file={empty} />);
    const notesHeadings = Array.from(container.querySelectorAll('h2')).filter(
      (h) => h.textContent === 'Notes',
    );
    expect(notesHeadings).toHaveLength(0);
  });
});
