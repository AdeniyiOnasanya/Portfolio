import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * Admin gate.
 *
 * Auth.js exposes `auth(handler)` as a higher-order middleware that injects
 * the resolved session onto `req.auth`. We use it to redirect unauthenticated
 * traffic away from `/admin/*` to `/login`. The matcher below scopes the
 * middleware so it never runs on public routes; that keeps the cold-start
 * cost off the public paint path.
 *
 * The redirect is always to a relative `/login` URL on the same origin to
 * avoid open-redirect bugs. The user lands on the login form; on success the
 * Auth.js callback returns them to `/admin` (per `LoginForm.tsx`).
 */

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAdminApi = pathname.startsWith('/api/cms/');
  if ((isAdmin || isAdminApi) && !req.auth) {
    if (isAdminApi) {
      return new NextResponse(null, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ['/admin/:path*', '/api/cms/:path*'],
};
