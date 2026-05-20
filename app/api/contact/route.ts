/**
 * Contact form route handler, Phase 10 slice #59.
 *
 * Slice scope:
 *  - Parse the JSON body via `ContactPayloadSchema`. The schema reuses
 *    `SafeText` from the publish pipeline so a U+2014 or emoji in any
 *    field returns 422 with `{ ok: false, error: 'forbidden_character'
 *    | 'invalid_payload' }` before Resend is contacted.
 *  - Forward the submission to `ADMIN_EMAIL` via the Resend SDK; the
 *    sender helper lives in `lib/contact/send.ts` so it can be unit
 *    tested with a stub.
 *  - Return 202 Accepted with `{ ok: true, queued: true, id }` so the
 *    client UI's "Thanks. Reply on the way." state remains the
 *    success surface.
 *
 * Out of scope:
 *  - Server-side Turnstile token verification lands in slice #60. The
 *    token is required by the schema but its value is not yet checked
 *    against the Cloudflare siteverify endpoint.
 */
import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';
import { ContactPayloadSchema } from '@/lib/contact/schema';
import {
  ContactSendConfigError,
  ContactSendDeliveryError,
  sendContactMessage,
} from '@/lib/contact/send';

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const parsed = ContactPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return mapZodFailure(parsed.error);
  }

  try {
    const result = await sendContactMessage(parsed.data, {
      resendApiKey: process.env.RESEND_API_KEY,
      fromAddress: process.env.RESEND_FROM ?? 'contact@davidonasanya.com',
      toAddress: process.env.ADMIN_EMAIL,
    });
    return NextResponse.json({ ok: true, queued: true, id: result.id }, { status: 202 });
  } catch (error) {
    if (error instanceof ContactSendConfigError) {
      // 503: the route is wired but the deployment is missing config.
      // Never echo the secret name in the response body; the caller
      // cannot fix the deployment, so a generic message is enough.
      return NextResponse.json({ ok: false, error: 'contact_send_unavailable' }, { status: 503 });
    }
    if (error instanceof ContactSendDeliveryError) {
      return NextResponse.json({ ok: false, error: 'contact_send_failed' }, { status: 502 });
    }
    return NextResponse.json({ ok: false, error: 'contact_send_failed' }, { status: 500 });
  }
}

function mapZodFailure(error: ZodError): Response {
  const issues = error.issues;
  const firstForbidden = issues.find(
    (issue) =>
      issue.code === 'custom' &&
      typeof issue.message === 'string' &&
      (issue.message.includes('U+2014') || issue.message.includes('emoji')),
  );
  if (firstForbidden) {
    return NextResponse.json(
      {
        ok: false,
        error: 'forbidden_character',
        field: firstForbidden.path.join('.') || undefined,
      },
      { status: 422 },
    );
  }
  return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 422 });
}
