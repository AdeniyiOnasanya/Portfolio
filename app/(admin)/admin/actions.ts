'use server';

import { signOut } from '@/lib/auth';

/**
 * Server actions scoped to the admin shell.
 *
 * `signOutAction` wraps Auth.js v5 `signOut({ redirectTo: '/login' })` so the
 * sidebar's <form action={signOutAction}> can call it without pulling
 * `next-auth` into the client bundle. The redirect target matches the
 * Phase 6 sign-in page; once the cookie is cleared, `middleware.ts` would
 * bounce any subsequent /admin request back here anyway, but the explicit
 * redirect keeps the flow tight.
 */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}
