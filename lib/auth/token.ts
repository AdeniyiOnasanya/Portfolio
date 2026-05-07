import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Magic-link token primitives.
 *
 * Auth.js v5 owns the actual sign-in token in the verification_tokens table,
 * but the helpers here are what Phase 6 slice #39 (expired or already-used
 * link error state) and any future "claim this draft" link compose against.
 * They live in `lib/auth/` rather than `lib/` so the import graph keeps
 * secrets logic in one place.
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
 * - `hashMagicToken` is sha256 hex. The verification_tokens row stores the
 *   hash, never the raw token, so a database read does not hand an attacker
 *   the secret. The hex output is constant-length (64 chars), which keeps
 *   `safeCompareTokens` on its happy path of equal-length buffers.
 * - `verifyMagicToken` composes expiry plus constant-time compare into a
 *   discriminated result. Expiry is checked first so the call site cannot
 *   leak through a side channel that "the token was at least correct, it
 *   just timed out". Single-use enforcement (deleting the row from
 *   verification_tokens after { ok: true }) stays the call site's job; the
 *   Auth.js v5 Drizzle adapter already does that for the framework's own
 *   flow, and a future bespoke link composes this helper around its own
 *   DELETE.
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

export function hashMagicToken(token: string): string {
  if (typeof token !== 'string') {
    throw new TypeError('hashMagicToken requires a string token');
  }
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

export type VerifyMagicTokenInput = {
  candidate: string;
  storedHash: string;
  expiresAt: number | Date;
  now?: number | Date;
};

export type VerifyMagicTokenResult =
  | { ok: true }
  | { ok: false; reason: 'expired' | 'invalid' };

export function verifyMagicToken(input: VerifyMagicTokenInput): VerifyMagicTokenResult {
  const { candidate, storedHash, expiresAt, now = Date.now() } = input;
  if (!isWithinExpiry(expiresAt, now)) {
    return { ok: false, reason: 'expired' };
  }
  if (typeof candidate !== 'string' || candidate.length === 0) {
    return { ok: false, reason: 'invalid' };
  }
  const candidateHash = hashMagicToken(candidate);
  if (!safeCompareTokens(candidateHash, storedHash)) {
    return { ok: false, reason: 'invalid' };
  }
  return { ok: true };
}
