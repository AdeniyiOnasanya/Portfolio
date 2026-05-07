import { handlers } from '@/lib/auth';

/**
 * Auth.js v5 catch-all route. Both GET and POST flow through `handlers`,
 * which the framework returns from `NextAuth(...)` in `lib/auth.ts`. The
 * handler dispatches on the URL segments under `/api/auth/`, e.g.
 * `/api/auth/signin/resend`, `/api/auth/callback/resend`, `/api/auth/csrf`.
 */
export const { GET, POST } = handlers;
