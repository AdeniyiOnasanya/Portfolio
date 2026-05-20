/**
 * Server-side Cloudflare Turnstile token verifier, Phase 10 slice #60.
 *
 * The contact route calls this before forwarding the submission to
 * Resend. A token that fails verification, or that has already been
 * redeemed (rapid resubmit), causes the route to reply with 403
 * `turnstile_failed` and the message is never sent.
 *
 * Cloudflare's siteverify endpoint:
 *   POST https://challenges.cloudflare.com/turnstile/v0/siteverify
 *   Body: { secret, response, remoteip? }
 *   Response: { success, "error-codes": string[], hostname?, challenge_ts? }
 *
 * Docs: /websites/developers_cloudflare_turnstile
 *       (server-side validation, error codes reference).
 *
 * For local dev and Vitest runs the secret defaults to the Cloudflare
 * always-passes test secret (`1x0000000000000000000000000000000AA`),
 * which matches the always-passes sitekey already returned by
 * `resolveTurnstileSiteKey`. Production deployments MUST set
 * `TURNSTILE_SECRET` to the real secret from the Cloudflare dashboard;
 * the verifier neither enforces nor warns about that here so a missing
 * value naturally degrades to a no-op pass under test keys.
 */
export const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';
export const TURNSTILE_SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type TurnstileVerifyResult =
  | {
      ok: true;
      hostname?: string;
      challengeTs?: string;
    }
  | {
      ok: false;
      errorCodes: string[];
      reason: 'rejected' | 'transport_error';
    };

export type TurnstileVerifyDeps = {
  secret: string | undefined;
  remoteIp?: string | undefined;
  /** Override fetch in tests so the verifier never hits the wire. */
  fetchImpl?: typeof fetch;
  /** Override the siteverify endpoint in tests. */
  endpoint?: string;
};

export function resolveTurnstileSecret(): string {
  return process.env.TURNSTILE_SECRET ?? TURNSTILE_TEST_SECRET;
}

export async function verifyTurnstileToken(
  token: string,
  deps: TurnstileVerifyDeps = { secret: undefined },
): Promise<TurnstileVerifyResult> {
  const secret = deps.secret ?? TURNSTILE_TEST_SECRET;
  const endpoint = deps.endpoint ?? TURNSTILE_SITEVERIFY_URL;
  const doFetch = deps.fetchImpl ?? fetch;

  const body = new URLSearchParams();
  body.set('secret', secret);
  body.set('response', token);
  if (deps.remoteIp) body.set('remoteip', deps.remoteIp);

  let response: Response;
  try {
    response = await doFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch {
    // Network error reaching Cloudflare. Treat as a fail-closed reject
    // so we never email the admin on a verification we could not run.
    return { ok: false, errorCodes: ['transport_error'], reason: 'transport_error' };
  }

  let payload: SiteverifyPayload;
  try {
    payload = (await response.json()) as SiteverifyPayload;
  } catch {
    return { ok: false, errorCodes: ['invalid_response'], reason: 'transport_error' };
  }

  if (payload.success === true) {
    const result: TurnstileVerifyResult = { ok: true };
    if (payload.hostname !== undefined) result.hostname = payload.hostname;
    if (payload['challenge_ts'] !== undefined) result.challengeTs = payload['challenge_ts'];
    return result;
  }

  return {
    ok: false,
    errorCodes: payload['error-codes'] ?? [],
    reason: 'rejected',
  };
}

type SiteverifyPayload = {
  success?: boolean;
  hostname?: string;
  challenge_ts?: string;
  'error-codes'?: string[];
};
