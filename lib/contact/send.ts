import { Resend } from 'resend';
import type { ContactPayload } from './schema';

/**
 * Resend send helper for the contact form, Phase 10 slice #59.
 *
 * Separated from the route handler so the parse + send pipeline can be
 * unit-tested with a stubbed sender. The Resend SDK is constructed
 * once per call rather than memoised so tests can inject a custom
 * factory; production traffic is well under the rate limit that would
 * otherwise make memoisation worthwhile.
 *
 * Required env vars (validated at call time, not module load, so the
 * import does not break the build when the deployment is missing them
 * temporarily during a Phase 10 rollout):
 *   - RESEND_API_KEY  Resend API key with `emails:send` scope.
 *   - RESEND_FROM     Verified from-address. Same value the auth flow uses.
 *   - ADMIN_EMAIL     Recipient. The form forwards every submission here.
 */

export type ContactSendDeps = {
  resendApiKey: string | undefined;
  fromAddress: string | undefined;
  toAddress: string | undefined;
  /** Override Resend client construction in tests. */
  createSender?: (apiKey: string) => {
    emails: {
      send: (input: ResendEmailInput) => Promise<ResendEmailResult>;
    };
  };
};

type ResendEmailInput = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

type ResendEmailResult = {
  data?: { id?: string } | null;
  error?: { message?: string } | null;
};

export class ContactSendConfigError extends Error {
  readonly field: 'RESEND_API_KEY' | 'RESEND_FROM' | 'ADMIN_EMAIL';
  constructor(field: 'RESEND_API_KEY' | 'RESEND_FROM' | 'ADMIN_EMAIL') {
    super(`contact send config missing: ${field}`);
    this.name = 'ContactSendConfigError';
    this.field = field;
  }
}

export class ContactSendDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContactSendDeliveryError';
  }
}

export async function sendContactMessage(
  payload: ContactPayload,
  deps: ContactSendDeps,
): Promise<{ id: string | undefined }> {
  if (!deps.resendApiKey) throw new ContactSendConfigError('RESEND_API_KEY');
  if (!deps.fromAddress) throw new ContactSendConfigError('RESEND_FROM');
  if (!deps.toAddress) throw new ContactSendConfigError('ADMIN_EMAIL');

  const sender = deps.createSender
    ? deps.createSender(deps.resendApiKey)
    : new Resend(deps.resendApiKey);

  const subject = `Contact form: ${payload.name}`;
  const html = renderHtml(payload);
  const text = renderText(payload);

  const result = await sender.emails.send({
    from: deps.fromAddress,
    to: deps.toAddress,
    subject,
    html,
    text,
    // Replies go to the visitor, not to the site owner's outbound box.
    replyTo: payload.email,
  });
  if (result.error) {
    throw new ContactSendDeliveryError(result.error.message ?? 'Resend send failed');
  }
  return { id: result.data?.id };
}

function renderHtml(payload: ContactPayload): string {
  return [
    `<p>New contact message via davidonasanya.com.</p>`,
    `<p><strong>From:</strong> ${escapeHtml(payload.name)} &lt;${escapeHtml(payload.email)}&gt;</p>`,
    `<p>${escapeHtml(payload.message).replace(/\n/g, '<br />')}</p>`,
  ].join('');
}

function renderText(payload: ContactPayload): string {
  return [
    `New contact message via davidonasanya.com.`,
    ``,
    `From: ${payload.name} <${payload.email}>`,
    ``,
    payload.message,
  ].join('\n');
}

const HTML_ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPE[char] ?? char);
}
