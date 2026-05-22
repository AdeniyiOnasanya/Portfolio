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

  it('renders the "Let’s talk." big block with the email link beside it', () => {
    render(<Footer footer={sampleFooter} person={samplePerson} />);
    // The headline collapses into one accessible name combining the visible
    // text and the inline accent <em>; assert presence by partial text match.
    expect(screen.getByText(/Let’s/)).toBeInTheDocument();
    expect(screen.getByText('talk')).toBeInTheDocument();
    const headlineMail = screen.getAllByRole('link', {
      name: new RegExp(samplePerson.email),
    });
    expect(headlineMail.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the CV download, github, and linkedin action buttons', () => {
    render(<Footer footer={sampleFooter} person={samplePerson} />);
    const cvLink = screen.getByRole('link', { name: /Download CV/i });
    expect(cvLink).toHaveAttribute('href', samplePerson.cvUrl);
    expect(cvLink).toHaveAttribute('download');
    expect(screen.getByRole('link', { name: /GitHub/ })).toHaveAttribute(
      'href',
      samplePerson.github,
    );
    expect(screen.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute(
      'href',
      samplePerson.linkedin,
    );
  });

  it('returns null when hidden is true', () => {
    const { container } = render(
      <Footer footer={sampleFooter} person={samplePerson} hidden={true} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders copy, availability, copyright, and phone in the foot row', () => {
    render(<Footer footer={sampleFooter} person={samplePerson} />);
    expect(screen.getByText(sampleFooter.copy)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(sampleFooter.availability))).toBeInTheDocument();
    expect(screen.getByText(sampleFooter.copyright)).toBeInTheDocument();
    expect(screen.getByText(samplePerson.phone)).toBeInTheDocument();
    expect(screen.getByText('v6.0')).toBeInTheDocument();
  });
});
