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

  it('wraps person.nameAccent in an em with the accent class inside the h1', () => {
    render(<Hero person={samplePerson} />);
    const heading = screen.getByRole('heading', { level: 1 });
    const em = heading.querySelector('em');
    expect(em).not.toBeNull();
    expect(em?.textContent).toBe(samplePerson.nameAccent);
    expect(em?.className).toMatch(/text-accent/);
  });

  it('renders the plain name when nameAccent is omitted', () => {
    const { nameAccent: _omit, ...rest } = samplePerson;
    render(<Hero person={rest} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.querySelector('em')).toBeNull();
    expect(heading.textContent).toBe(samplePerson.name);
  });

  it('renders a CV download link pointing at person.cvUrl with the download attribute', () => {
    render(<Hero person={samplePerson} />);
    const link = screen.getByRole('link', { name: /download cv/i });
    expect(link).toHaveAttribute('href', samplePerson.cvUrl);
    expect(link).toHaveAttribute('download');
    expect(link.className).toMatch(/focus-visible:ring-accent/);
  });

  it('locks the download filename to the trailing segment of the cvUrl', () => {
    render(<Hero person={{ ...samplePerson, cvUrl: '/cv/Versioned-CV-2026.pdf' }} />);
    const link = screen.getByRole('link', { name: /download cv/i });
    expect(link).toHaveAttribute('download', 'Versioned-CV-2026.pdf');
  });
});
