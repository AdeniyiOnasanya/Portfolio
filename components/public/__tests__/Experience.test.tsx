import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Experience } from '../Experience';
import { sampleExperience } from './fixtures';

describe('Experience', () => {
  it('renders an h2 titled Experience inside an Experience region', () => {
    render(<Experience experience={sampleExperience} />);
    const region = screen.getByRole('region', { name: 'Experience' });
    const heading = screen.getByRole('heading', {
      level: 2,
      name: 'Experience',
    });
    expect(region).toContainElement(heading);
  });

  it('renders an ordered list with one entry per role', () => {
    render(<Experience experience={sampleExperience} />);
    const items = screen.getAllByRole('listitem');
    const roleItems = items.filter((item) => item.textContent?.includes(sampleExperience[0].role));
    expect(roleItems).toHaveLength(sampleExperience.length);
  });

  it('renders the company, when, where, desc, and tags for each entry', () => {
    render(<Experience experience={sampleExperience} />);
    for (const entry of sampleExperience) {
      expect(screen.getByText(entry.when)).toBeInTheDocument();
      expect(screen.getByText(entry.where)).toBeInTheDocument();
      expect(screen.getByText(entry.desc)).toBeInTheDocument();
      for (const tag of entry.tags) {
        expect(screen.getByText(tag)).toBeInTheDocument();
      }
    }
  });
});
