import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { handlers } from '@/lib/auth';
import {
  checkSignInRateLimit,
  extractClientIp,
  getSignInRateLimitClient,
} from '@/lib/auth/rate-limit';

/**
 * Auth.js v5 catch-all route.
 *
 * GET passes straight through to `handlers.GET`; POST is wrapped with the
 * sign-in rate limit (#38). The wrap only fires on requests that target the
 * Resend sign-in path (`/api/auth/signin/resend`), so the CSRF and callback
 * endpoints stay on the cheap, unmetered path.
 *
 * On the deny path the response is a 429 with a short generic body. The
 * `LoginForm` client component commits to its "Check your inbox" state
 * optimistically once `signIn(...)` resolves, so the user sees the same
 * generic copy whether they were rate-limited or not. That is the
 * deliberate, security-positive outcome: an attacker cannot tell from the
 * UI whether the limit was hit.
 *
 * The Upstash-backed client is constructed lazily on the first denied or
 * allowed request; CI builds without `KV_REST_API_URL` never trigger the
 * factory.
 */
export const { GET } = handlers;

const RESEND_SIGNIN_PATH = '/api/auth/signin/resend';

function emitBreadcrumb(event: {
  category: string;
  level: string;
  message: string;
  data: unknown;
}): void {
  // Sentry lands in Phase 10. Until then we surface the deny path through
  // console.warn so the deploy logs show every 429 the rate-limit fired. The
  // breadcrumb shape is the same one `Sentry.addBreadcrumb()` expects, so the
  // Phase 10 swap is a one-line change at the call site.
  // biome-ignore lint/suspicious/noConsole: deliberate placeholder for Sentry breadcrumb
  console.warn('[auth.rate-limit]', event);
}

export async function POST(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  if (url.pathname === RESEND_SIGNIN_PATH) {
    const ip = extractClientIp(req.headers);
    let client: ReturnType<typeof getSignInRateLimitClient>;
    try {
      client = getSignInRateLimitClient();
    } catch {
      // Missing env: fail-closed. The route surfaces a 429 rather than
      // letting the request through, mirroring the contract `checkSignInRateLimit`
      // honours when the limiter itself throws.
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
