/**
 * Contact form route handler stub, Phase 10 slice #58.
 *
 * The contact form (`components/public/ContactForm.tsx`) posts here
 * once the Turnstile challenge is satisfied. This slice ships the
 * route shell so the client pipeline is complete end-to-end; slice
 * #59 swaps the body for a Resend send + Zod payload guard, and
 * slice #60 layers the Turnstile token verifier on top.
 *
 * The stub currently:
 *   - parses the JSON body so a malformed POST is rejected early;
 *   - rejects requests missing the Turnstile token (the same guard
 *     #60 will harden) so even before server verification the form
 *     cannot be submitted unauthenticated;
 *   - returns 202 Accepted with `{ ok: true, queued: true }` so the
 *     UI's "Thanks. Reply on the way." state is honest (the message
 *     will be delivered once #59 lands; until then it is held by the
 *     stub, not silently dropped on the floor).
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  turnstileToken?: unknown;
};

export async function POST(request: Request): Promise<Response> {
  let payload: ContactPayload;
  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }
  if (typeof payload.turnstileToken !== 'string' || payload.turnstileToken.length === 0) {
    return NextResponse.json({ ok: false, error: 'missing_turnstile_token' }, { status: 400 });
  }
  return NextResponse.json({ ok: true, queued: true }, { status: 202 });
}
