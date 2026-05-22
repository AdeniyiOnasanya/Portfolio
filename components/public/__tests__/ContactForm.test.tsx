import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ContactForm } from '../ContactForm';

// The Turnstile widget injects a Cloudflare script and renders an
// iframe at runtime, neither of which Happy DOM supports. Stub the
// widget with a deterministic placeholder so the reveal + form
// scaffolding is covered without leaking network calls in unit tests.
vi.mock('@marsidev/react-turnstile', () => ({
  Turnstile: ({ siteKey }: { siteKey: string }) => (
    <div data-testid="turnstile-stub" data-sitekey={siteKey} />
  ),
}));

describe('ContactForm', () => {
  it('renders only the toggle pill on first paint (form not present)', () => {
    render(<ContactForm />);
    expect(screen.getByRole('button', { name: /Show contact form/i })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('reveals the form when the toggle is activated', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await user.click(screen.getByRole('button', { name: /Show contact form/i }));
    expect(screen.getByLabelText(/^Name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Message$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send message/i })).toBeDisabled();
  });

  it('mounts the Turnstile widget once the form is revealed', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await user.click(screen.getByRole('button', { name: /Show contact form/i }));
    expect(screen.getByTestId('turnstile-stub')).toBeInTheDocument();
  });

  it('passes the provided sitekey down to the Turnstile widget', async () => {
    const user = userEvent.setup();
    render(<ContactForm siteKey="1x00000000000000000000AA" />);
    await user.click(screen.getByRole('button', { name: /Show contact form/i }));
    expect(screen.getByTestId('turnstile-stub')).toHaveAttribute(
      'data-sitekey',
      '1x00000000000000000000AA',
    );
  });

  it('collapses back to the toggle pill when Cancel is pressed', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await user.click(screen.getByRole('button', { name: /Show contact form/i }));
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Show contact form/i })).toBeInTheDocument();
  });
});
