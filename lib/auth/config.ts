import { assertAllowlistConfigured, isAllowedAdminEmail } from './allowlist';

/**
 * Pure helpers shared by `lib/auth.ts` and its unit tests.
 *
 * Splitting the sign-in callback out of `lib/auth.ts` keeps the test surface
 * trivial (no NextAuth instantiation, no Drizzle adapter, no env shape) and
 * leaves the wiring file responsible only for stitching providers, adapter,
 * and pages together.
 */

type SignInParams = {
  user: { email?: string | null };
};

export type SignInCallback = (params: SignInParams) => Promise<boolean>;

export function buildSignInCallback(adminEmail: string | undefined): SignInCallback {
  return async ({ user }) => {
    return isAllowedAdminEmail(user.email, adminEmail);
  };
}

/**
 * Boot-time guard for the auth surface, slice #37.
 *
 * Called from the `[...nextauth]` route handler so a deployment with an empty
 * or missing `ADMIN_EMAIL` fails fast with a generic 500 instead of silently
 * dropping every sign-in attempt. The signIn callback already fails closed
 * for an empty allowlist (and Auth.js throws AccessDenied before
 * sendVerificationRequest is reached, so Resend is never called), but the
 * boot-time throw turns a quiet misconfiguration into a loud one for the
 * operator.
 *
 * The thrown message is intentionally generic so a stack trace cannot leak
 * the configured (or missing) value back to the caller.
 *
 * Accepts a plain env-shape record (rather than reading `process.env`
 * directly) so unit tests can pass synthetic envs without `vi.stubEnv` and
 * the production call site stays explicit at `assertAuthBoot(process.env)`.
 */
export function assertAuthBoot(env: { ADMIN_EMAIL?: string | undefined }): void {
  assertAllowlistConfigured(env.ADMIN_EMAIL);
}
