import { describe, expect, it, vi } from 'vitest';
import { checkSignInRateLimit, extractClientIp, type RateLimitClient } from '../rate-limit';

/*
 * Sign-in rate-limit tests, Phase 6 (#38).
 *
 * The rate-limit boundary is the only thing standing between an attacker who
 * has discovered `/login` and an unbounded magic-link generation loop. The
 * tests below pin three things that matter for security:
 *
 *  1. The IP extractor reads `x-forwarded-for` correctly (first hop only,
 *     ignoring the proxy chain), falls back to `x-real-ip`, and finally to a
 *     stable string when no headers are present. A bug here would key every
 *     request on the same fallback, defeating per-IP throttling.
 *  2. `checkSignInRateLimit` honours the limiter's verdict and exposes the
 *     remaining/reset metadata callers need to set retry headers.
 *  3. The function is fail-closed: any thrown error from the Upstash client
 *     (network outage, missing env, bad token) denies the request rather than
 *     allowing it. The Sentry breadcrumb hook fires on the deny path so an
 *     operator can see the rate-limit subsystem is misbehaving.
 *
 * The integration with Auth.js (callback wiring, redirect to /login?error=...)
 * is exercised by the Playwright burst spec referenced in the issue.
 */

function makeFakeClient(
  result: Awaited<ReturnType<RateLimitClient['limit']>> | Error,
): RateLimitClient {
  return {
    limit: vi.fn(async () => {
      if (result instanceof Error) {
        throw result;
      }
      return result;
    }),
  };
}

describe('extractClientIp()', () => {
  it('returns the first hop from x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1, 10.0.0.2' });
    expect(extractClientIp(headers)).toBe('203.0.113.7');
  });

  it('trims whitespace around the first hop', () => {
    const headers = new Headers({ 'x-forwarded-for': '   198.51.100.4   , 10.0.0.1' });
    expect(extractClientIp(headers)).toBe('198.51.100.4');
  });

  it('falls back to x-real-ip when x-forwarded-for is missing', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.42' });
    expect(extractClientIp(headers)).toBe('198.51.100.42');
  });

  it('returns the configured fallback when no IP headers are present', () => {
    const headers = new Headers();
    expect(extractClientIp(headers, 'unknown')).toBe('unknown');
  });

  it('returns "unknown" by default when no IP headers are present', () => {
    const headers = new Headers();
    expect(extractClientIp(headers)).toBe('unknown');
  });

  it('returns the fallback when x-forwarded-for is an empty string', () => {
    const headers = new Headers({ 'x-forwarded-for': '' });
    expect(extractClientIp(headers, 'unknown')).toBe('unknown');
  });

  it('returns the fallback when x-forwarded-for is whitespace-only', () => {
    const headers = new Headers({ 'x-forwarded-for': '   ' });
    expect(extractClientIp(headers, 'unknown')).toBe('unknown');
  });
});

describe('checkSignInRateLimit()', () => {
  it('returns allowed=true when the limiter reports success', async () => {
    const client = makeFakeClient({
      success: true,
      remaining: 4,
      limit: 5,
      reset: 1_700_000_000_000,
    });
    const result = await checkSignInRateLimit(client, '203.0.113.7');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.reset).toBe(1_700_000_000_000);
  });

  it('returns allowed=false when the limiter reports failure', async () => {
    const client = makeFakeClient({
      success: false,
      remaining: 0,
      limit: 5,
      reset: 1_700_000_000_000,
    });
    const result = await checkSignInRateLimit(client, '203.0.113.7');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('keys the limiter on the IP', async () => {
    const limit = vi.fn(async () => ({
      success: true,
      remaining: 4,
      limit: 5,
      reset: 1_700_000_000_000,
    }));
    const client: RateLimitClient = { limit };
    await checkSignInRateLimit(client, '203.0.113.7');
    expect(limit).toHaveBeenCalledWith('203.0.113.7');
  });

  it('fails closed when the limiter throws (network outage)', async () => {
    const client = makeFakeClient(new Error('upstash unreachable'));
    const result = await checkSignInRateLimit(client, '203.0.113.7');
    expect(result.allowed).toBe(false);
  });

  it('fires the breadcrumb hook on a denied request', async () => {
    const onBreadcrumb = vi.fn();
    const client = makeFakeClient({
      success: false,
      remaining: 0,
      limit: 5,
      reset: 1_700_000_000_000,
    });
    await checkSignInRateLimit(client, '203.0.113.7', { onBreadcrumb });
    expect(onBreadcrumb).toHaveBeenCalledTimes(1);
    const event = onBreadcrumb.mock.calls[0]?.[0];
    expect(event).toMatchObject({ category: 'auth.rate-limit', level: 'warning' });
  });

  it('fires the breadcrumb hook when the limiter throws', async () => {
    const onBreadcrumb = vi.fn();
    const client = makeFakeClient(new Error('upstash unreachable'));
    await checkSignInRateLimit(client, '203.0.113.7', { onBreadcrumb });
    expect(onBreadcrumb).toHaveBeenCalledTimes(1);
    const event = onBreadcrumb.mock.calls[0]?.[0];
    expect(event).toMatchObject({ category: 'auth.rate-limit', level: 'error' });
  });

  it('does not fire the breadcrumb hook on an allowed request', async () => {
    const onBreadcrumb = vi.fn();
    const client = makeFakeClient({
      success: true,
      remaining: 4,
      limit: 5,
      reset: 1_700_000_000_000,
    });
    await checkSignInRateLimit(client, '203.0.113.7', { onBreadcrumb });
    expect(onBreadcrumb).not.toHaveBeenCalled();
  });

  it('does not throw when no breadcrumb hook is provided and the limiter throws', async () => {
    const client = makeFakeClient(new Error('upstash unreachable'));
    await expect(checkSignInRateLimit(client, '203.0.113.7')).resolves.toEqual(
      expect.objectContaining({ allowed: false }),
    );
  });
});
