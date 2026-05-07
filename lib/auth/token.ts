import { randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Magic-link token primitives.
 *
 * Auth.js v5 owns the actual sign-in token in the verification_tokens table,
 * but the helpers here are what Phase 6 slices #4 (single-use enforcement,
 * expiry, constant-time compare) and any future "claim this draft" link will
 * compose against. They live in `lib/auth/` rather than `lib/` so the import
 * graph keeps secrets logic in one place.
 *
 * Choices:
 * - 32 bytes of entropy (256 bits) is the IETF recommendation for secrets
 *   that should resist offline brute force; 22 bytes (176 bits) is fine for
 *   short-lived links but the default stays at 32 to match Auth.js.
 * - `base64url` encoding (no padding, `-`/`_` instead of `+`/`/`) makes the
 *   token safe to drop into a query string without further encoding.
 * - `isWithinExpiry` is exclusive on the upper bound, so a token that
 *   "expires at" a given instant is already expired the moment that instant
 *   is reached. Equivalent to "must be strictly before".
 * - `safeCompareTokens` always uses `timingSafeEqual` once it knows the two
 *   buffers have equal length, eliminating the early-exit timing leak that
 *   `===` would have on long strings.
 */

export function generateMagicToken(bytes = 32): string {
  if (!Number.isInteger(bytes) || bytes <= 0) {
    throw new Error('generateMagicToken requires a positive integer byte count');
  }
  return randomBytes(bytes).toString('base64url');
}

export function isWithinExpiry(expiresAt: number | Date, now: number | Date): boolean {
  const expiry = typeof expiresAt === 'number' ? expiresAt : expiresAt.getTime();
  const current = typeof now === 'number' ? now : now.getTime();
  return current < expiry;
}

export function safeCompareTokens(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length === 0 || b.length === 0) return false;
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}
