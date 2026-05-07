import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { About } from '../About';
import { samplePerson } from './fixtures';

describe('About', () => {
  it('renders an About region with an h2 inside', () => {
    render(<About person={samplePerson} />);
    const region = screen.getByRole('region', { name: 'About' });
    const heading = screen.getByRole('heading', { level: 2 });
    expect(region).toContainElement(heading);
  });

  it('renders the person statement and one paragraph per longBio entry', () => {
    render(<About person={samplePerson} />);
    expect(screen.getByText(samplePerson.statement)).toBeInTheDocument();
    for (const paragraph of samplePerson.longBio) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }
  });
});
