/**
 * Contact form route handler, Phase 10 slices #58 -> #60.
 *
 * Pipeline (#58 reveal, #59 send, #60 verify):
 *  1. Parse the JSON body via `ContactPayloadSchema`. The schema reuses
 *     `SafeText` from the publish pipeline so a U+2014 or emoji in any
 *     field returns 422 `forbidden_character` before any network call.
 *  2. Verify the Turnstile token against Cloudflare's siteverify
 *     endpoint. A rejection (including `timeout-or-duplicate`, which
 *     is the natural rapid-resubmit block) returns 403
 *     `turnstile_failed` and stops the pipeline before Resend is
 *     contacted.
 *  3. Forward the submission to `ADMIN_EMAIL` via the Resend SDK; the
 *     sender helper lives in `lib/contact/send.ts` so it can be unit
 *     tested with a stub.
 *  4. Return 202 Accepted with `{ ok: true, queued: true, id }`.
 *
 * The verifier defaults to the Cloudflare always-passes test secret
 * (`1x0000000000000000000000000000000AA`) when `TURNSTILE_SECRET` is
 * unset, which matches the always-passes test sitekey already returned
 * by `resolveTurnstileSiteKey`. The local dev pipeline therefore runs
 * end-to-end without any Cloudflare account; production deployments
 * MUST set `TURNSTILE_SECRET` so the real challenge applies.
 */
import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';
import { ContactPayloadSchema } from '@/lib/contact/schema';
import {
  ContactSendConfigError,
  ContactSendDeliveryError,
  sendContactMessage,
} from '@/lib/contact/send';
import { resolveTurnstileSecret, verifyTurnstileToken } from '@/lib/contact/turnstile-verify';

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

  const verification = await verifyTurnstileToken(parsed.data.turnstileToken, {
    secret: resolveTurnstileSecret(),
    remoteIp: extractRemoteIp(request),
  });
  if (!verification.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: 'turnstile_failed',
        // `timeout-or-duplicate` is the rapid-resubmit block from
        // Cloudflare; surfacing it lets the client UI show a clearer
        // message than the generic catch-all when the visitor submits
        // twice with the same token.
        reason: verification.errorCodes[0] ?? verification.reason,
      },
      { status: 403 },
    );
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

// Forward the visitor IP to Cloudflare so the verifier can correlate
// the token to the originating IP. Vercel sets `x-forwarded-for` on
// every public request; the helper here picks the leftmost entry,
// which is the originating client IP per HTTP semantics. When no
// forwarder header is present (local dev), siteverify happily accepts
// requests without `remoteip`.
function extractRemoteIp(request: Request): string | undefined {
  const xff = request.headers.get('x-forwarded-for');
  if (!xff) return undefined;
  const first = xff.split(',')[0]?.trim();
  return first && first.length > 0 ? first : undefined;
}
