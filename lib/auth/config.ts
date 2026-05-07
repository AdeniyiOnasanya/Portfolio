import { isAllowedAdminEmail } from './allowlist';

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
