import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { About } from '../About';
import { samplePerson } from './fixtures';

describe('About', () => {
  it('renders an h2 titled About inside an About region', () => {
    render(<About longBio={samplePerson.longBio} />);
    const region = screen.getByRole('region', { name: 'About' });
    const heading = screen.getByRole('heading', { level: 2, name: 'About' });
    expect(region).toContainElement(heading);
  });

  it('renders one paragraph per longBio entry', () => {
    render(<About longBio={samplePerson.longBio} />);
    for (const paragraph of samplePerson.longBio) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }
  });
});
