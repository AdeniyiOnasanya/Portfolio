import { describe, expect, it, vi } from 'vitest';
import { assertAuthBoot, buildSignInCallback } from '../config';

/*
 * Sign-in callback shape, Phase 6 magic-link slice (#36, #37).
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

/*
 * Boot-time guard, Phase 6 magic-link slice (#37).
 *
 * `assertAuthBoot` is invoked from the auth route handler so a deployment
 * with an empty or missing `ADMIN_EMAIL` fails fast with a generic 500
 * instead of silently dropping every sign-in attempt. The signIn callback
 * already fails closed for an empty allowlist, but the boot-time throw turns
 * a quiet misconfiguration into a loud one for the operator without leaking
 * the configured value back to the caller.
 */

describe('assertAuthBoot()', () => {
  it('does not throw when ADMIN_EMAIL is set', () => {
    expect(() => assertAuthBoot({ ADMIN_EMAIL: 'admin@example.com' })).not.toThrow();
  });

  it('throws when ADMIN_EMAIL is missing', () => {
    expect(() => assertAuthBoot({})).toThrow(/ADMIN_EMAIL is not configured/);
  });

  it('throws when ADMIN_EMAIL is an empty string', () => {
    expect(() => assertAuthBoot({ ADMIN_EMAIL: '' })).toThrow(/ADMIN_EMAIL is not configured/);
  });

  it('throws when ADMIN_EMAIL is whitespace-only', () => {
    expect(() => assertAuthBoot({ ADMIN_EMAIL: '   ' })).toThrow(/ADMIN_EMAIL is not configured/);
  });

  it('does not echo the configured value in the thrown message', () => {
    let message = '';
    try {
      assertAuthBoot({ ADMIN_EMAIL: '' });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toBe('ADMIN_EMAIL is not configured');
  });
});

/*
 * Resend zero-send contract, Phase 6 magic-link slice (#37).
 *
 * Auth.js v5 invokes `callbacks.signIn` before `provider.sendVerificationRequest`
 * inside `@auth/core/lib/actions/signin/send-token.js`. If `signIn` returns
 * `false`, Auth.js throws `AccessDenied` and `sendVerificationRequest` is
 * never reached. The simulator below mirrors that ordering with a stub
 * provider so a regression in our callback shape (e.g. accidentally returning
 * `true` on rejection, or resolving to a redirect string) is caught here
 * without spinning up a live Auth.js handler.
 */

describe('non-admin sign-in attempts never invoke Resend (contract simulation)', () => {
  async function simulateSendToken(
    signInCallback: ReturnType<typeof buildSignInCallback>,
    sendVerificationRequest: ReturnType<typeof vi.fn>,
    email: string,
  ): Promise<{ sent: boolean; rejected: boolean }> {
    const authorized = await signInCallback({ user: { email } });
    if (!authorized) {
      return { sent: false, rejected: true };
    }
    sendVerificationRequest({ identifier: email });
    return { sent: true, rejected: false };
  }

  it('does not call sendVerificationRequest for a non-admin email', async () => {
    const cb = buildSignInCallback('admin@example.com');
    const sendStub = vi.fn();
    const result = await simulateSendToken(cb, sendStub, 'attacker@example.com');
    expect(result.sent).toBe(false);
    expect(result.rejected).toBe(true);
    expect(sendStub).not.toHaveBeenCalled();
  });

  it('does not call sendVerificationRequest when the allowlist is empty (fail-closed)', async () => {
    const cb = buildSignInCallback('');
    const sendStub = vi.fn();
    const result = await simulateSendToken(cb, sendStub, 'admin@example.com');
    expect(result.sent).toBe(false);
    expect(result.rejected).toBe(true);
    expect(sendStub).not.toHaveBeenCalled();
  });

  it('does not call sendVerificationRequest when the allowlist is undefined (fail-closed)', async () => {
    const cb = buildSignInCallback(undefined);
    const sendStub = vi.fn();
    const result = await simulateSendToken(cb, sendStub, 'admin@example.com');
    expect(result.sent).toBe(false);
    expect(result.rejected).toBe(true);
    expect(sendStub).not.toHaveBeenCalled();
  });

  it('calls sendVerificationRequest exactly once for the configured admin email', async () => {
    const cb = buildSignInCallback('admin@example.com');
    const sendStub = vi.fn();
    const result = await simulateSendToken(cb, sendStub, 'admin@example.com');
    expect(result.sent).toBe(true);
    expect(result.rejected).toBe(false);
    expect(sendStub).toHaveBeenCalledTimes(1);
    expect(sendStub).toHaveBeenCalledWith({ identifier: 'admin@example.com' });
  });
});
