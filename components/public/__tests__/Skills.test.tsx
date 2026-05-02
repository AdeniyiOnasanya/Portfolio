import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skills } from '../Skills';
import { sampleSkills } from './fixtures';

describe('Skills', () => {
  it('renders an h2 titled Skills inside a Skills region', () => {
    render(<Skills skills={sampleSkills} />);
    const region = screen.getByRole('region', { name: 'Skills' });
    const heading = screen.getByRole('heading', { level: 2, name: 'Skills' });
    expect(region).toContainElement(heading);
  });

  it('renders each skill group label and its items joined', () => {
    render(<Skills skills={sampleSkills} />);
    for (const group of sampleSkills) {
      expect(screen.getByText(group.label)).toBeInTheDocument();
      expect(screen.getByText(group.items.join(', '))).toBeInTheDocument();
    }
  });
});
