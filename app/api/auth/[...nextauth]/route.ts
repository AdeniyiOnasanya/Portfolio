import { handlers } from '@/lib/auth';
import { assertAuthBoot } from '@/lib/auth/config';

/**
 * Auth.js v5 catch-all route. Both GET and POST flow through `handlers`,
 * which the framework returns from `NextAuth(...)` in `lib/auth.ts`. The
 * handler dispatches on the URL segments under `/api/auth/`, e.g.
 * `/api/auth/signin/resend`, `/api/auth/callback/resend`, `/api/auth/csrf`.
 *
 * The `assertAuthBoot(process.env)` call is the slice #37 boot-time guard:
 * if `ADMIN_EMAIL` is missing or empty the route fails closed with a
 * generic 500 rather than silently dropping every sign-in attempt. The
 * signIn callback in `lib/auth/config.ts` is the second line of defence
 * (returns false for any non-admin email, which makes Auth.js throw
 * AccessDenied before `provider.sendVerificationRequest` ever runs, so
 * Resend records zero sends for non-admin and unconfigured cases alike).
 *
 * The throw is wrapped per-request rather than at module load so unit tests
 * that import `lib/auth.ts` transitively do not crash on import.
 */

const baseHandlers = handlers;

export async function GET(req: Parameters<typeof baseHandlers.GET>[0]): Promise<Response> {
  assertAuthBoot({ ADMIN_EMAIL: process.env.ADMIN_EMAIL });
  return baseHandlers.GET(req);
}

export async function POST(req: Parameters<typeof baseHandlers.POST>[0]): Promise<Response> {
  assertAuthBoot({ ADMIN_EMAIL: process.env.ADMIN_EMAIL });
  return baseHandlers.POST(req);
}
