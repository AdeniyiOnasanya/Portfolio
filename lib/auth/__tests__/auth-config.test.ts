import { describe, expect, it } from 'vitest';
import { buildSignInCallback } from '../config';

/*
 * Sign-in callback shape, Phase 6 magic-link slice (#36).
 *
 * The full `NextAuth(...)` wiring requires a database adapter and pulls in
 * Auth.js internals that are awkward to instantiate inside a unit test. The
 * callback we own, however, is pure logic on top of the allowlist module; we
 * cover that here so any regression in case-handling or null-handling fails
 * fast.
 *
 * The integration that the callback feeds into (NextAuth + DrizzleAdapter +
 * Resend provider) is exercised by the Playwright spec at
 * `e2e/sign-in.spec.ts` against a Vercel preview, so this test can stay
 * narrow.
 */

describe('buildSignInCallback()', () => {
  it('returns a function', () => {
    const cb = buildSignInCallback('admin@example.com');
    expect(typeof cb).toBe('function');
  });

  it('approves the configured admin email', async () => {
    const cb = buildSignInCallback('admin@example.com');
    await expect(cb({ user: { email: 'admin@example.com' } })).resolves.toBe(true);
  });

  it('approves a case-variant of the admin email', async () => {
    const cb = buildSignInCallback('admin@example.com');
    await expect(cb({ user: { email: 'ADMIN@example.com' } })).resolves.toBe(true);
  });

  it('rejects a different email', async () => {
    const cb = buildSignInCallback('admin@example.com');
    await expect(cb({ user: { email: 'attacker@example.com' } })).resolves.toBe(false);
  });

  it('rejects when user.email is null', async () => {
    const cb = buildSignInCallback('admin@example.com');
    await expect(cb({ user: { email: null } })).resolves.toBe(false);
  });

  it('rejects when user.email is undefined', async () => {
    const cb = buildSignInCallback('admin@example.com');
    await expect(cb({ user: {} })).resolves.toBe(false);
  });

  it('rejects every email when the configured admin is empty (fail-closed)', async () => {
    const cb = buildSignInCallback('');
    await expect(cb({ user: { email: 'admin@example.com' } })).resolves.toBe(false);
  });

  it('rejects every email when the configured admin is undefined (fail-closed)', async () => {
    const cb = buildSignInCallback(undefined);
    await expect(cb({ user: { email: 'admin@example.com' } })).resolves.toBe(false);
  });
});
