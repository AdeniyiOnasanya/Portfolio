import { describe, expect, it } from 'vitest';
import { generateMagicToken, isWithinExpiry, safeCompareTokens } from '../token';

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
