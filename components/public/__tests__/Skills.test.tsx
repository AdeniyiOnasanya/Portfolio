import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skills } from '../Skills';
import { sampleSkills } from './fixtures';

describe('Skills', () => {
  it('renders a Skills region with an h2 inside', () => {
    render(<Skills skills={sampleSkills} />);
    const region = screen.getByRole('region', { name: 'Skills' });
    const heading = screen.getByRole('heading', { level: 2 });
    expect(region).toContainElement(heading);
  });

  it('renders each skill group label and item as list entries', () => {
    render(<Skills skills={sampleSkills} />);
    for (const group of sampleSkills) {
      expect(screen.getByText(group.label)).toBeInTheDocument();
      for (const item of group.items) {
        expect(screen.getByText(item)).toBeInTheDocument();
      }
    }
  });

  it('returns null when hidden is true', () => {
    const { container } = render(<Skills skills={sampleSkills} hidden={true} />);
    expect(container.firstChild).toBeNull();
  });
});
