import { DrizzleAdapter } from '@auth/drizzle-adapter';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import Resend from 'next-auth/providers/resend';
import { buildSignInCallback } from './auth/config';
import { getDb } from './db';
import { accounts, sessions, users, verificationTokens } from './db/schema';

/**
 * Auth.js v5 wiring.
 *
 * What this file does:
 *  - Composes the Drizzle adapter against the lazy `getDb()` factory in
 *    `lib/db/index.ts`. The adapter is the single component that touches the
 *    database, so middleware, route handlers, and admin pages can import
 *    `auth`, `signIn`, and `signOut` without each one re-instantiating a
 *    Postgres client.
 *  - Wires the Resend email provider to send the magic link. The provider
 *    pulls `RESEND_API_KEY` and `RESEND_FROM` from the environment; if
 *    `RESEND_FROM` is unset we fall back to the verified domain documented
 *    in `tech-stack.md`.
 *  - Pins the sign-in page to `/login` so unauthenticated traffic redirects
 *    there instead of to the default Auth.js page.
 *  - Drops the sign-in attempt unless the email matches `ADMIN_EMAIL`. The
 *    callback is exported separately from `lib/auth/config.ts` so unit tests
 *    can exercise it without instantiating the adapter.
 *
 * What this file deliberately does not do:
 *  - Throw at module load when `ADMIN_EMAIL` is empty. The callback already
 *    fails closed (every email is rejected when the allowlist is empty), and
 *    a load-time throw would crash unit tests that import this module
 *    transitively. The boot-time guard for #37 lives in the route layer.
 *  - Handle rate limiting. That arrives in slice #38 (Phase 6) via
 *    `lib/auth/rate-limit.ts` against Upstash Redis.
 */

export const authConfig = {
  adapter: DrizzleAdapter(getDb(), {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY ?? '',
      from: process.env.RESEND_FROM ?? 'auth@davidonasanya.com',
    }),
  ],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    signIn: buildSignInCallback(process.env.ADMIN_EMAIL),
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
