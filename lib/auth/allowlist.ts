/**
 * Admin email allowlist for the magic-link sign-in flow.
 *
 * The two functions exported here are the only place a user-supplied email is
 * compared to `ADMIN_EMAIL`. They are pure (no env reads, no side effects), so
 * unit tests can hammer them without env juggling and the call sites in
 * `lib/auth.ts` and `app/api/auth/[...nextauth]/*` can pass `process.env`
 * explicitly.
 *
 * Behaviour:
 * - Comparison is case-insensitive and trims surrounding whitespace on both
 *   sides. Most modern mail providers treat the local-part case-insensitively
 *   (RFC 5321 leaves it implementation-defined, but in practice nobody runs
 *   case-sensitive local-parts) so the tighter check would just confuse a
 *   legitimate sign-in attempt.
 * - Both inputs default to "no match" when missing. An undefined `configured`
 *   value (env var not set) means every email is rejected, which is the
 *   correct fail-closed behaviour for a security boundary.
 * - The error thrown by `assertAllowlistConfigured` is intentionally generic
 *   so a misconfigured deployment does not echo the configured (or missing)
 *   value back to the caller through stack traces.
 */

export function isAllowedAdminEmail(
  email: string | null | undefined,
  configured: string | undefined,
): boolean {
  if (typeof email !== 'string' || typeof configured !== 'string') {
    return false;
  }
  const candidate = email.trim().toLowerCase();
  const allowed = configured.trim().toLowerCase();
  if (!candidate || !allowed) {
    return false;
  }
  return candidate === allowed;
}

export function assertAllowlistConfigured(
  configured: string | undefined,
): asserts configured is string {
  if (typeof configured !== 'string' || configured.trim() === '') {
    throw new Error('ADMIN_EMAIL is not configured');
  }
}
