import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hero } from '../Hero';
import { samplePerson } from './fixtures';

describe('Hero', () => {
  it('renders the only h1 with the person name', () => {
    render(<Hero person={samplePerson} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(samplePerson.name);
  });

  it('exposes a section landmark labelled by the heading', () => {
    render(<Hero person={samplePerson} />);
    const section = screen.getByRole('region', { name: samplePerson.name });
    expect(section).toBeInTheDocument();
  });

  it('renders the role, statement, and location from content', () => {
    render(<Hero person={samplePerson} />);
    expect(screen.getByText(samplePerson.role)).toBeInTheDocument();
    expect(screen.getByText(samplePerson.statement)).toBeInTheDocument();
    expect(screen.getByText(samplePerson.location)).toBeInTheDocument();
  });
});
