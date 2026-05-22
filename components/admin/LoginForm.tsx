'use client';

import { signIn } from 'next-auth/react';
import { type FormEvent, useState } from 'react';

/**
 * Magic-link sign-in form, mounted on `/login`.
 *
 * Layout mirrors `design_handoff_portfolio/design/login.html` (lines 196 to
 * 233): a two-step flow that starts with the email input ("Step 01 of 02")
 * and switches to a "Check your inbox" panel ("Step 02 of 02") once the
 * caller has submitted. The classNames here match the CSS block appended to
 * `app/globals.css`, so theme tokens (mono caps eyebrow, italic Fraunces
 * h1, accent-bordered focus state) come through without further wiring.
 *
 * The optional `error` prop drives the on-brand error banner styled by the
 * `.err` class (design_handoff_portfolio/design/login.html lines 125 to 129
 * and 216). Two values surface the "expired or already-used link" copy:
 *  - `expired` is the local, on-brand redirect target for slice #39.
 *  - `Verification` is the native Auth.js v5 code emitted when a
 *    verification token is missing, expired, or already consumed; we map
 *    it to the same copy so the visitor never lands on a NextAuth default.
 * Any other value is ignored (no banner) so the page does not echo
 * arbitrary query strings back into the DOM.
 *
 * Submission uses Auth.js v5 client-side `signIn('resend', ...)`, which
 * routes through `/api/auth/signin/resend` and triggers the Resend provider.
 * The success copy is intentionally generic so #37 (non-admin emails) can
 * reuse this same shell without exposing whether the entered address is on
 * the allowlist.
 */

type LoginFormProps = {
  error?: string;
};

const EXPIRED_ERROR_CODES = new Set(['expired', 'Verification']);
const EXPIRED_COPY = 'That sign-in link has expired or already been used. Request a new one below.';

export function LoginForm({ error }: LoginFormProps = {}) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const showExpired = typeof error === 'string' && EXPIRED_ERROR_CODES.has(error);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || submitting) {
      return;
    }
    setSubmitting(true);
    try {
      await signIn('resend', { email: trimmed, redirectTo: '/admin' });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    const trimmedEmail = email.trim();
    return (
      <div className="sent-state on">
        <div className="login-eyebrow">Step 02 of 02</div>
        <div className="sent-icon" aria-hidden="true">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <title>Sent</title>
            <path d="M5 12l4 4L19 6" />
          </svg>
        </div>
        <h1>
          Check your <em>inbox</em>.
        </h1>
        <p className="lede">
          If <strong style={{ color: 'var(--fg)' }}>{trimmedEmail}</strong> is registered, we sent a
          one-time link. It expires in 10 minutes.
        </p>
      </div>
    );
  }

  return (
    <div id="step-email">
      <div className="login-eyebrow">Step 01 of 02</div>
      <h1>
        Welcome <em>back</em>.
      </h1>
      <p className="lede">
        Enter the admin email and we will send a one-time link. No password, no friction.
      </p>
      <form onSubmit={onSubmit} autoComplete="off" noValidate>
        <div className="field">
          <label htmlFor="email-input">Email address</label>
          <input
            id="email-input"
            type="email"
            name="email"
            required
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <button type="submit" className="submit-btn" disabled={submitting}>
          <span>{submitting ? 'Sending' : 'Send magic link'}</span>
          <span className="arr" aria-hidden="true">
            {'→'}
          </span>
        </button>
      </form>
      {showExpired ? (
        <div className="err" role="alert">
          {EXPIRED_COPY}
        </div>
      ) : null}
    </div>
  );
}
