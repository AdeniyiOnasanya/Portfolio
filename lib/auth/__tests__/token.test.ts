import { describe, expect, it } from 'vitest';
import {
  generateMagicToken,
  hashMagicToken,
  isWithinExpiry,
  safeCompareTokens,
  verifyMagicToken,
} from '../token';

/*
 * Magic-link token helpers.
 *
 * Auth.js v5 generates its own verification token internally; the helpers
 * here exist so that:
 *   1. Phase 6 slice #4 (single-use enforcement, expiry, constant-time
 *      compare) can be tested in isolation, away from the framework.
 *   2. Future server-side flows (one-time-link previews, draft-claim links)
 *      reuse the same primitive without re-rolling crypto.
 *
 * Properties asserted:
 *   - URL-safe alphabet (`A-Z a-z 0-9 - _`), no `+`, `/`, or `=`.
 *   - 32 random bytes default, encoded base64url, gives a 43-char string.
 *   - Two calls in a row never collide (overwhelmingly probable but the
 *     test still asserts difference because identical output would mean a
 *     constant or buggy randomness source).
 *   - Expiry comparison is exclusive on the upper bound (a token expiring
 *     "now" is already expired).
 *   - `safeCompareTokens` returns false when lengths differ without
 *     throwing, and uses constant-time compare under the hood.
 */

describe('generateMagicToken()', () => {
  it('returns a URL-safe base64url string with no `+`, `/`, or `=`', () => {
    const token = generateMagicToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(token).not.toContain('+');
    expect(token).not.toContain('/');
    expect(token).not.toContain('=');
  });

  it('produces a 43-char string for the default 32 bytes of entropy', () => {
    const token = generateMagicToken();
    expect(token).toHaveLength(43);
  });

  it('produces a different output on a fresh call', () => {
    const a = generateMagicToken();
    const b = generateMagicToken();
    expect(a).not.toBe(b);
  });

  it('respects a custom byte count', () => {
    const token = generateMagicToken(16);
    // 16 bytes -> 22 base64url chars (no padding).
    expect(token).toHaveLength(22);
  });
});

describe('isWithinExpiry()', () => {
  it('returns true when now is strictly before expiresAt', () => {
    const now = new Date('2026-05-05T12:00:00Z').getTime();
    const expiresAt = now + 60_000;
    expect(isWithinExpiry(expiresAt, now)).toBe(true);
  });

  it('returns false when now equals expiresAt', () => {
    const now = new Date('2026-05-05T12:00:00Z').getTime();
    expect(isWithinExpiry(now, now)).toBe(false);
  });

  it('returns false when now is past expiresAt', () => {
    const now = new Date('2026-05-05T12:00:00Z').getTime();
    const expiresAt = now - 1;
    expect(isWithinExpiry(expiresAt, now)).toBe(false);
  });

  it('accepts Date inputs as well as epoch numbers', () => {
    const now = new Date('2026-05-05T12:00:00Z');
    const expiresAt = new Date(now.getTime() + 60_000);
    expect(isWithinExpiry(expiresAt, now)).toBe(true);
  });
});

describe('safeCompareTokens()', () => {
  it('returns true for identical strings', () => {
    expect(safeCompareTokens('abc123', 'abc123')).toBe(true);
  });

  it('returns false for distinct strings of equal length', () => {
    expect(safeCompareTokens('abc123', 'xyz123')).toBe(false);
  });

  it('returns false when the two strings differ in length', () => {
    expect(safeCompareTokens('abc', 'abcd')).toBe(false);
  });

  it('returns false when either input is empty', () => {
    expect(safeCompareTokens('', '')).toBe(false);
    expect(safeCompareTokens('abc', '')).toBe(false);
    expect(safeCompareTokens('', 'abc')).toBe(false);
  });

  it('does not throw when inputs contain non-ASCII bytes', () => {
    expect(() => safeCompareTokens('café', 'café')).not.toThrow();
    expect(safeCompareTokens('café', 'café')).toBe(true);
  });
});

describe('hashMagicToken()', () => {
  it('returns a 64-char lowercase hex string (sha256)', () => {
    const hash = hashMagicToken('a-token');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns the same hash for identical inputs', () => {
    expect(hashMagicToken('same-input')).toBe(hashMagicToken('same-input'));
  });

  it('returns different hashes for distinct inputs', () => {
    expect(hashMagicToken('one')).not.toBe(hashMagicToken('two'));
  });

  it('throws on non-string input so call sites surface the bug fast', () => {
    // The verifier composes against this; a silent default would hide a
    // mistyped storedHash and produce a confusing "invalid" outcome.
    expect(() => hashMagicToken(undefined as unknown as string)).toThrow();
    expect(() => hashMagicToken(null as unknown as string)).toThrow();
  });
});

describe('verifyMagicToken()', () => {
  /*
   * The verifier composes expiry and constant-time compare into one shape so
   * call sites can route to `/login?error=expired` without re-implementing
   * the precedence rules. Single-use enforcement (deleting the row from
   * verification_tokens on success) stays the call site's job; the Drizzle
   * adapter already does that for Auth.js's own flow, but a future bespoke
   * link (claim-this-draft, share-preview) would compose this helper.
   *
   * Precedence: expiry is checked first. If a token is past its TTL, the
   * outcome is `expired` regardless of whether the hash would have matched;
   * we never want to leak through a side channel that "the token was at
   * least correct, it just timed out".
   */

  function fixedNow() {
    return new Date('2026-05-05T12:00:00Z').getTime();
  }

  it('returns { ok: true } when the candidate matches storedHash and is unexpired', () => {
    const candidate = 'fresh-token-value';
    const result = verifyMagicToken({
      candidate,
      storedHash: hashMagicToken(candidate),
      expiresAt: fixedNow() + 60_000,
      now: fixedNow(),
    });
    expect(result).toEqual({ ok: true });
  });

  it("returns { ok: false, reason: 'expired' } at the exact expiry boundary", () => {
    const candidate = 'fresh-token-value';
    const result = verifyMagicToken({
      candidate,
      storedHash: hashMagicToken(candidate),
      expiresAt: fixedNow(),
      now: fixedNow(),
    });
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it("returns { ok: false, reason: 'expired' } when expired even if the hash matches", () => {
    const candidate = 'fresh-token-value';
    const result = verifyMagicToken({
      candidate,
      storedHash: hashMagicToken(candidate),
      expiresAt: fixedNow() - 1,
      now: fixedNow(),
    });
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it("returns { ok: false, reason: 'invalid' } when the candidate does not match", () => {
    const result = verifyMagicToken({
      candidate: 'wrong-token-value',
      storedHash: hashMagicToken('right-token-value'),
      expiresAt: fixedNow() + 60_000,
      now: fixedNow(),
    });
    expect(result).toEqual({ ok: false, reason: 'invalid' });
  });

  it("returns { ok: false, reason: 'invalid' } when the candidate is empty", () => {
    const result = verifyMagicToken({
      candidate: '',
      storedHash: hashMagicToken('right-token-value'),
      expiresAt: fixedNow() + 60_000,
      now: fixedNow(),
    });
    expect(result).toEqual({ ok: false, reason: 'invalid' });
  });

  it('does not throw when distinct same-length candidates are tested back-to-back', () => {
    // Smoke test for constant-time compare under the hood; if the
    // comparison ever short-circuits on first byte, this still passes
    // logically, but the test doubles as an early warning that the call
    // path stays exception-free for adversarial inputs.
    const stored = hashMagicToken('right-token-value');
    expect(() =>
      verifyMagicToken({
        candidate: 'aaaaaaaaaaaaaaaa',
        storedHash: stored,
        expiresAt: fixedNow() + 60_000,
        now: fixedNow(),
      }),
    ).not.toThrow();
    expect(() =>
      verifyMagicToken({
        candidate: 'bbbbbbbbbbbbbbbb',
        storedHash: stored,
        expiresAt: fixedNow() + 60_000,
        now: fixedNow(),
      }),
    ).not.toThrow();
  });

  it('defaults `now` to Date.now() when omitted', () => {
    const candidate = 'fresh-token-value';
    const result = verifyMagicToken({
      candidate,
      storedHash: hashMagicToken(candidate),
      // 60 s in the past from real wall clock -> expired without any
      // injection of `now`.
      expiresAt: Date.now() - 60_000,
    });
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });
});
