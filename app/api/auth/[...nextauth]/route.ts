import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handlers } from '@/lib/auth';
import { assertAuthBoot } from '@/lib/auth/config';
import {
  checkSignInRateLimit,
  extractClientIp,
  getSignInRateLimitClient,
} from '@/lib/auth/rate-limit';

/**
 * Auth.js v5 catch-all route. Defense-in-depth ordering on every request:
 *
 *   1. `assertAuthBoot` (slice #37): missing or empty `ADMIN_EMAIL` throws a
 *      generic 500 before any work happens. Wrapped per-request, not at
 *      module load, so unit tests that import `lib/auth.ts` transitively
 *      stay importable in CI without env vars.
 *   2. Rate limit (slice #38): POST to `/api/auth/signin/resend` is metered
 *      against Upstash via a sliding 5/15min/IP window, fail-closed if the
 *      Upstash client is unreachable or unconfigured. The deny path returns
 *      a 429 with a generic body so an attacker cannot tell from the UI
 *      whether they were rate-limited (the LoginForm commits optimistically
 *      to "check your inbox" once `signIn(...)` resolves).
 *   3. Auth.js dispatch: `handlers.GET` / `handlers.POST` route to the
 *      framework, which then runs the `signIn` callback (allowlist check),
 *      hits the Drizzle adapter, and ships the magic link via Resend.
 */

const RESEND_SIGNIN_PATH = '/api/auth/signin/resend';

function emitBreadcrumb(event: {
  category: string;
  level: string;
  message: string;
  data: unknown;
}): void {
  // Sentry lands in Phase 10. Until then we surface the deny path through
  // console.warn so the deploy logs show every 429 the rate-limit fired. The
  // breadcrumb shape matches `Sentry.addBreadcrumb()` so the Phase 10 swap
  // is a one-line change at the call site.
  // biome-ignore lint/suspicious/noConsole: deliberate placeholder for Sentry breadcrumb
  console.warn('[auth.rate-limit]', event);
}

export async function GET(req: Parameters<typeof handlers.GET>[0]): Promise<Response> {
  assertAuthBoot({ ADMIN_EMAIL: process.env.ADMIN_EMAIL });
  return handlers.GET(req);
}

export async function POST(req: NextRequest): Promise<Response> {
  assertAuthBoot({ ADMIN_EMAIL: process.env.ADMIN_EMAIL });
  const url = new URL(req.url);
  if (url.pathname === RESEND_SIGNIN_PATH) {
    const ip = extractClientIp(req.headers);
    let client: ReturnType<typeof getSignInRateLimitClient>;
    try {
      client = getSignInRateLimitClient();
    } catch {
      emitBreadcrumb({
        category: 'auth.rate-limit',
        level: 'error',
        message: 'rate-limit client unavailable; failing closed',
        data: { ip },
      });
      return new NextResponse('Too Many Requests', { status: 429 });
    }
    const verdict = await checkSignInRateLimit(client, ip, {
      onBreadcrumb: emitBreadcrumb,
    });
    if (!verdict.allowed) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': verdict.reset
            ? String(Math.max(0, Math.ceil((verdict.reset - Date.now()) / 1000)))
            : '900',
        },
      });
    }
  }
  return handlers.POST(req);
}
