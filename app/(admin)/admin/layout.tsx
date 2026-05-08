import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { auth } from '@/lib/auth';
import { signOutAction } from './actions';

/**
 * Admin shell layout.
 *
 * Mirrors `design_handoff_portfolio/design/admin.html` (32 lines: shell with
 * sidebar + topbar + main content frame) and `admin.css` lines 4 to 13
 * (`.admin-app` grid: 280px sidebar column, 1fr main column, 56px topbar
 * row, 1fr main row). Every editor route under /admin shares this frame; the
 * topbar and full content frame land in #42 onward, so this slice ships the
 * sidebar plus a minimal main area that the per-section pages render into.
 *
 * The layout is a server component: it reads `auth()` at request time and
 * passes `session.user.email` down to the sidebar. The sidebar is a client
 * component because it needs `usePathname()` for the active-section
 * highlight, but the email rendering, the brand block, and the layout grid
 * stay on the server.
 *
 * Auth gating: two layers. `middleware.ts` already redirects unauthenticated
 * traffic on `/admin/*` to `/login`. The layout adds a defence-in-depth
 * server-side redirect: if `auth()` returns null or no email, it redirects
 * before rendering, so a future middleware misconfig cannot leak the admin
 * shell to an anonymous request.
 *
 * `dynamic = 'force-dynamic'` keeps Next from prerendering the layout at
 * build time; `auth()` reads cookies and the build would otherwise throw at
 * static-generation. `metadata.robots = noindex, nofollow` matches the
 * design's `<meta name="robots">` and keeps the admin URL out of search
 * indexes.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Admin, David Onasanya',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/login');
  }
  const email = session.user.email;

  return (
    <div className="admin-app">
      <AdminSidebar email={email} signOutAction={signOutAction} />
      <header className="admin-topbar">
        <div className="crumb">
          <span>Admin</span>
          <span className="slash">/</span>
          <b>Editor</b>
        </div>
      </header>
      <main className="admin-main no-preview">
        <div className="admin-editor">{children}</div>
      </main>
    </div>
  );
}
