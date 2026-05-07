import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '../LoginForm';

/*
 * LoginForm tests, Phase 6 magic-link sign-in (#36).
 *
 * The component owns four behaviours: it renders the design's two-step
 * editorial form, it submits via Auth.js client-side `signIn('resend', ...)`,
 * it switches to the "check your inbox" sent state on success, and it
 * silently drops empty submissions.
 *
 * `next-auth/react` is mocked at module level so the test never reaches the
 * network. The mock returns a resolved promise so the post-submit state
 * transition runs. Each test resets the mock so call counts stay isolated.
 */

const signInMock = vi.fn();

vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

describe('<LoginForm />', () => {
  beforeEach(() => {
    signInMock.mockReset();
    signInMock.mockResolvedValue({ ok: true, error: null });
  });

  it('renders the email input and submit button from the design', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument();
  });

  it('submits the trimmed email through signIn("resend", ...) on submit', async () => {
    render(<LoginForm />);
    const input = screen.getByLabelText('Email address') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '  user@example.com  ' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledTimes(1);
    });
    expect(signInMock).toHaveBeenCalledWith('resend', {
      email: 'user@example.com',
      redirectTo: '/admin',
    });
  });

  it('switches to the sent state showing the entered email after submit', async () => {
    render(<LoginForm />);
    const input = screen.getByLabelText('Email address') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'user@example.com' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    await waitFor(() => {
      expect(screen.getByText(/check your/i)).toBeInTheDocument();
    });
    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
  });

  it('does not call signIn when the input is empty', () => {
    render(<LoginForm />);
    const input = screen.getByLabelText('Email address') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(signInMock).not.toHaveBeenCalled();
  });
});
