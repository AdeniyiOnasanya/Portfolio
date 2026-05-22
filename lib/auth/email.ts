import { Resend } from 'resend';
import { z } from 'zod';
import { SafeText } from '../text/safeText';

/**
 * Sign-in email payload validation, Phase 6 slice (#40).
 *
 * Why this file exists:
 *  - Auth.js v5 ships a default `sendVerificationRequest` for its Resend
 *    provider that builds the subject and body strings inside the framework
 *    (see `@auth/core/providers/resend`). The default template is concise,
 *    but it gives no hook for the project's "no U+2014, no
 *    `\p{Extended_Pictographic}`" rule. This module replaces the default
 *    with a layer that composes the payload, parses it through
 *    `AuthEmailPayloadSchema`, and only then delegates to the Resend SDK.
 *  - Every email body (subject, html, text) and the from-line all flow
 *    through a `SafeText`-derived rule so neither character can survive the
 *    parse step; if any did, the call throws before a network request is
 *    made.
 *
 * What this file deliberately does not do:
 *  - It does not pull in `react-email` or any templating engine. The
 *    sign-in email is two lines plus a link; a string template is enough,
 *    and the parser is what we trust.
 *  - It does not retry on Resend errors. Auth.js surfaces the throw to the
 *    caller, which is the correct behaviour for a one-time magic link;
 *    retry policy is the deploy infrastructure's job, not this module's.
 *  - It does not validate `to` against the admin allowlist. The sign-in
 *    callback in `lib/auth/config.ts` does that on the way back.
 */

const EmailLine = SafeText;

export const AuthEmailPayloadSchema = z.object({
  from: EmailLine,
  to: z.string().email(),
  subject: EmailLine,
  html: EmailLine,
  text: EmailLine,
});

export type AuthEmailPayload = z.infer<typeof AuthEmailPayloadSchema>;

export type BuildAuthEmailParams = {
  to: string;
  url: string;
  from: string;
  /**
   * Override for the host string used in the subject line. Real callers
   * leave this undefined and let the function derive it from `url`; tests
   * use it to drive the forbidden-char branch directly.
   */
  host?: string;
};

export function buildAuthEmail(params: BuildAuthEmailParams): AuthEmailPayload {
  const { to, url, from } = params;
  const host = params.host ?? new URL(url).host;
  const subject = `Sign in to ${host}`;
  const html = renderHtml(url, host);
  const text = renderText(url, host);
  return AuthEmailPayloadSchema.parse({
    from,
    to,
    subject,
    html,
    text,
  });
}

function renderHtml(url: string, host: string): string {
  return [
    `<p>Hello,</p>`,
    `<p>Click the link below to finish signing in to ${host}.</p>`,
    `<p><a href="${url}">${url}</a></p>`,
    `<p>If you did not request this email, you can safely ignore it.</p>`,
  ].join('');
}

function renderText(url: string, host: string): string {
  return [
    `Hello,`,
    ``,
    `Click the link below to finish signing in to ${host}.`,
    ``,
    url,
    ``,
    `If you did not request this email, you can safely ignore it.`,
  ].join('\n');
}

type SendVerificationRequestParams = {
  identifier: string;
  url: string;
  provider: { apiKey?: string; from?: string };
};

export async function sendVerificationRequest(
  params: SendVerificationRequestParams,
): Promise<void> {
  const { identifier, url, provider } = params;
  const apiKey = provider.apiKey;
  const fromAddress = provider.from;
  if (!apiKey) {
    throw new Error('Resend API key is not configured');
  }
  if (!fromAddress) {
    throw new Error('Resend from-address is not configured');
  }
  const payload = buildAuthEmail({
    to: identifier,
    url,
    from: fromAddress,
  });
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: payload.from,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
  if (error) {
    throw new Error(error.message ?? 'Resend send failed');
  }
}
