'use client';

import { Turnstile } from '@marsidev/react-turnstile';
import { useId, useState } from 'react';
import { resolveTurnstileSiteKey } from '../../lib/contact/turnstile';

/**
 * Contact form, Phase 10 slice #58.
 *
 * Not on first paint: the component renders as a single `.btn-ghost`
 * pill ("Show contact form") that matches the existing footer-action
 * buttons (`design_handoff_portfolio/design/styles.css#L1025-L1078`).
 * Activating the pill expands the form in place, mounts the
 * Cloudflare Turnstile widget, and disables submission until the
 * widget hands back a token.
 *
 * Slice scope (#58):
 *   - reveal + Turnstile widget mount
 *   - submission posts to `/api/contact` (stub route, returns `ok: true`)
 *   - generic success / error UI
 *
 * Out of scope:
 *   - server-side Resend send + Zod payload guards (slice #59)
 *   - server-side Turnstile token verification (slice #60)
 *
 * Design handoff anchors:
 *   - app.jsx#L297-L326: Footer block, button placement next to
 *     `Download CV` / `GitHub` / `LinkedIn`.
 *   - styles.css#L1025-L1078: `.btn-primary`, `.btn-ghost`,
 *     `.footer-actions` tokens. The form reuses these primitives so it
 *     stays visually paired with the rest of the footer.
 */

type SubmitStatus = 'idle' | 'sending' | 'sent' | 'error';

export function ContactForm({ siteKey }: { siteKey?: string } = {}) {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const headingId = useId();
  const nameId = useId();
  const emailId = useId();
  const messageId = useId();
  const statusId = useId();
  const resolvedSiteKey = siteKey ?? resolveTurnstileSiteKey();

  if (!open) {
    return (
      <button
        type="button"
        className="btn-ghost contact-toggle"
        onClick={() => setOpen(true)}
        data-magnetic
      >
        <span>Show contact form</span>
        <span aria-hidden="true">{String.fromCodePoint(0x2193)}</span>
      </button>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus('sending');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: String(data.get('name') ?? ''),
          email: String(data.get('email') ?? ''),
          message: String(data.get('message') ?? ''),
          turnstileToken: token,
        }),
      });
      if (!response.ok) {
        setStatus('error');
        return;
      }
      setStatus('sent');
      form.reset();
      setToken(null);
    } catch {
      setStatus('error');
    }
  }

  return (
    <form
      className="contact-form"
      onSubmit={onSubmit}
      aria-labelledby={headingId}
      noValidate={false}
    >
      <h3 id={headingId} className="contact-form-heading">
        Or send a message
      </h3>
      <div className="contact-form-field">
        <label htmlFor={nameId} className="contact-form-label">
          Name
        </label>
        <input
          id={nameId}
          name="name"
          type="text"
          required
          maxLength={120}
          autoComplete="name"
          className="contact-form-input"
        />
      </div>
      <div className="contact-form-field">
        <label htmlFor={emailId} className="contact-form-label">
          Email
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          required
          maxLength={200}
          autoComplete="email"
          className="contact-form-input"
        />
      </div>
      <div className="contact-form-field">
        <label htmlFor={messageId} className="contact-form-label">
          Message
        </label>
        <textarea
          id={messageId}
          name="message"
          required
          maxLength={4000}
          rows={5}
          className="contact-form-input contact-form-textarea"
        />
      </div>
      <div className="contact-form-turnstile">
        <Turnstile
          siteKey={resolvedSiteKey}
          onSuccess={(value) => setToken(value)}
          onExpire={() => setToken(null)}
          onError={() => setToken(null)}
        />
      </div>
      <div className="contact-form-actions">
        <button
          type="submit"
          className="btn-primary"
          disabled={!token || status === 'sending'}
          aria-describedby={status !== 'idle' ? statusId : undefined}
        >
          <span>{status === 'sending' ? 'Sending' : 'Send message'}</span>
        </button>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => {
            setOpen(false);
            setStatus('idle');
            setToken(null);
          }}
        >
          <span>Cancel</span>
        </button>
      </div>
      {status === 'sent' ? (
        <p id={statusId} className="contact-form-status" role="status">
          Thanks. Reply on the way.
        </p>
      ) : null}
      {status === 'error' ? (
        <p id={statusId} className="contact-form-status contact-form-status--error" role="alert">
          Something went wrong. Try again.
        </p>
      ) : null}
    </form>
  );
}
