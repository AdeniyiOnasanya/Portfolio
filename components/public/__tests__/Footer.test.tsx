import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Footer } from '../Footer';
import { sampleFooter, samplePerson } from './fixtures';

describe('Footer', () => {
  it('renders inside a contentinfo landmark', () => {
    render(<Footer footer={sampleFooter} person={samplePerson} />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
  });

  it('renders the heading at h2 level', () => {
    render(<Footer footer={sampleFooter} person={samplePerson} />);
    expect(
      screen.getByRole('heading', { level: 2, name: sampleFooter.heading }),
    ).toBeInTheDocument();
  });

  it('renders email, github, and linkedin links pointing at person values', () => {
    render(<Footer footer={sampleFooter} person={samplePerson} />);
    expect(screen.getByRole('link', { name: 'Email' })).toHaveAttribute(
      'href',
      `mailto:${samplePerson.email}`,
    );
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      samplePerson.github,
    );
    expect(screen.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      samplePerson.linkedin,
    );
  });

  it('renders copy, availability, and copyright lines', () => {
    render(<Footer footer={sampleFooter} person={samplePerson} />);
    expect(screen.getByText(sampleFooter.copy)).toBeInTheDocument();
    expect(screen.getByText(sampleFooter.availability)).toBeInTheDocument();
    expect(screen.getByText(sampleFooter.copyright)).toBeInTheDocument();
  });
});
