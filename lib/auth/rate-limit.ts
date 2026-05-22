import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Sign-in rate limit, Phase 6 (#38).
 *
 * Anyone who has guessed the URL of `/login` can fire magic-link requests at
 * the Resend provider. We cap that at five attempts per IP per fifteen
 * minutes (sliding window) using Upstash Redis through the
 * `@upstash/ratelimit` library; the sixth attempt within the window returns
 * `allowed=false`, the route layer turns that into a 429, and a Sentry-shaped
 * breadcrumb is emitted so an operator can see the deny path firing.
 *
 * Two design choices worth pinning down for the next reader:
 *
 *  1. Fail-closed. If the Upstash client throws (network outage, missing
 *     env, bad token), every callable returns `{ allowed: false }`. An
 *     attacker cannot bypass the limit by knocking the Redis instance over;
 *     a legitimate operator sees the breadcrumb and can fix the deploy.
 *  2. Lazy boundary. The Upstash client is only instantiated on first use
 *     via `getSignInRateLimitClient()`. CI builds (`pnpm build` in
 *     `.github/workflows/ci.yml`) do not have `KV_REST_API_URL` set, and
 *     module-load instantiation would crash the build. Mirrors the lazy
 *     `neon` pattern in `lib/db/index.ts`.
 *
 * The pure helpers (`extractClientIp`, `checkSignInRateLimit`) accept a
 * `RateLimitClient` shape so unit tests can inject a fake without hitting
 * Upstash. The factory at the bottom of the file is the only place
 * `KV_REST_API_URL` and `KV_REST_API_TOKEN` are read.
 */

export type RateLimitVerdict = {
  success: boolean;
  remaining: number;
  limit: number;
  reset: number;
};

export type RateLimitClient = {
  limit: (key: string) => Promise<RateLimitVerdict>;
};

export type RateLimitBreadcrumb = {
  category: 'auth.rate-limit';
  level: 'warning' | 'error';
  message: string;
  data: {
    ip: string;
    remaining?: number;
    reset?: number;
  };
};

export type CheckSignInRateLimitOptions = {
  onBreadcrumb?: (event: RateLimitBreadcrumb) => void;
};

export type CheckSignInRateLimitResult = {
  allowed: boolean;
  remaining: number;
  reset: number;
};

/**
 * Pull the originating client IP from a Headers-like object. Vercel sets
 * `x-forwarded-for` as `client, proxy1, proxy2`; only the first entry is the
 * real client. `x-real-ip` is a fallback Vercel also sets in some
 * configurations. When neither header is present we return the caller-supplied
 * fallback so the limiter still gets a stable, non-empty key.
 */
export function extractClientIp(headers: Headers, fallback = 'unknown'): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    const trimmed = realIp.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return fallback;
}

/**
 * Ask the limiter whether `ip` may attempt a sign-in. Fail-closed: any
 * thrown error from the limiter denies the request. The optional
 * `onBreadcrumb` hook fires on every deny path (rejected verdict + thrown
 * error) so the route layer can route the event to Sentry without the
 * rate-limit module taking a hard dependency on `@sentry/nextjs`.
 */
export async function checkSignInRateLimit(
  client: RateLimitClient,
  ip: string,
  options: CheckSignInRateLimitOptions = {},
): Promise<CheckSignInRateLimitResult> {
  const { onBreadcrumb } = options;
  let verdict: RateLimitVerdict;
  try {
    verdict = await client.limit(ip);
  } catch {
    onBreadcrumb?.({
      category: 'auth.rate-limit',
      level: 'error',
      message: 'rate-limit client threw; failing closed',
      data: {
        ip,
      },
    });
    return { allowed: false, remaining: 0, reset: 0 };
  }
  if (!verdict.success) {
    onBreadcrumb?.({
      category: 'auth.rate-limit',
      level: 'warning',
      message: 'sign-in rate limit exceeded',
      data: {
        ip,
        remaining: verdict.remaining,
        reset: verdict.reset,
      },
    });
  }
  return {
    allowed: verdict.success,
    remaining: verdict.remaining,
    reset: verdict.reset,
  };
}

/**
 * Lazy factory for the Upstash-backed rate-limit client. The Vercel KV
 * marketplace integration with Upstash injects `KV_REST_API_URL` and
 * `KV_REST_API_TOKEN` (not `UPSTASH_REDIS_REST_*`), so we read those names
 * directly. The Redis client is constructed on first call and reused.
 *
 * Build-time invariants: this function must not be called at module load.
 * Next.js page-data collection runs without env vars in CI, and reading them
 * eagerly would crash `pnpm build`. Callers should defer the call until they
 * actually need to throttle a request.
 */
let cachedClient: RateLimitClient | null = null;

export function getSignInRateLimitClient(): RateLimitClient {
  if (cachedClient) {
    return cachedClient;
  }
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error('KV_REST_API_URL and KV_REST_API_TOKEN are not configured');
  }
  const redis = new Redis({ url, token });
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'auth:signin',
    analytics: false,
  });
  cachedClient = {
    async limit(key: string) {
      const verdict = await limiter.limit(key);
      return {
        success: verdict.success,
        remaining: verdict.remaining,
        limit: verdict.limit,
        reset: verdict.reset,
      };
    },
  };
  return cachedClient;
}

/**
 * Test-only helper. Reset the cached client so a unit test that exercises
 * the factory does not bleed state into the next test.
 */
export function _resetSignInRateLimitClientForTests(): void {
  cachedClient = null;
}
