'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_NAV, type AdminSectionId, isAdminSectionId } from './sections';

/**
 * Admin sidebar.
 *
 * Mirrors `design_handoff_portfolio/design/admin/admin-app.jsx` lines 234 to
 * 281 (the `Sidebar` component) and the `.admin-sidebar` styles in
 * `design_handoff_portfolio/design/admin.css` lines 76 to 144. The brand
 * block, nav groups, item rendering, and footer with avatar plus sign-out
 * action are kept verbatim. Active-state highlighting is driven by
 * `usePathname()` instead of the design's React-state setter because the
 * App Router gives every section its own URL (`/admin/<section>`); the
 * leading-edge accent border on the active nav item is the same.
 *
 * Sign-out is a real Auth.js v5 action: a `<form action={...}>` posts to a
 * server action that calls `signOut({ redirectTo: '/login' })`. That keeps
 * the destructive request out of client JS, and the server action lives in
 * `app/(admin)/admin/actions.ts` so it ships only with the admin bundle.
 *
 * The signed-in email comes from the layout's `auth()` call and is passed
 * down as a prop. The avatar shows the first letter of that email; the
 * design's hard-coded "D" is replaced with the dynamic initial so the
 * shell looks right even before the personal data is wired up.
 */

type AdminSidebarProps = {
  email: string;
  signOutAction: () => Promise<void>;
};

function deriveActiveSection(pathname: string | null): AdminSectionId | null {
  if (!pathname) return null;
  // Strip the `/admin/` prefix and read the next segment. Anything past that
  // is ignored (a future nested editor route still highlights its parent).
  const match = pathname.match(/^\/admin\/([^/?#]+)/);
  if (!match) return null;
  const candidate = match[1];
  if (!candidate) return null;
  return isAdminSectionId(candidate) ? candidate : null;
}

function avatarInitial(email: string): string {
  const trimmed = email.trim();
  if (!trimmed) return 'A';
  const first = trimmed.charAt(0).toUpperCase();
  return first || 'A';
}

export function AdminSidebar({ email, signOutAction }: AdminSidebarProps) {
  const pathname = usePathname();
  const active = deriveActiveSection(pathname);

  return (
    <aside className="admin-sidebar" aria-label="Admin sections">
      <div className="brand">
        <div className="brand-mark">
          <span style={{ fontStyle: 'italic' }}>D</span>
        </div>
        <div>
          <div style={{ fontWeight: 500, fontSize: 14 }}>Portfolio CMS</div>
          <div className="brand-name">Onasanya / v1</div>
        </div>
      </div>

      <nav aria-label="Editor sections">
        {ADMIN_NAV.map((group) => (
          <div key={group.group}>
            <div className="nav-group">{group.group}</div>
            {group.items.map((item) => {
              const isActive = active === item.id;
              return (
                <Link
                  key={item.id}
                  href={`/admin/${item.id}`}
                  className={`nav-item${isActive ? ' active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span className="num">{item.num}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="footer">
        <div className="user">
          <div className="avatar" aria-hidden="true">
            {avatarInitial(email)}
          </div>
          <div className="meta">
            <b>{email || 'admin'}</b>
            <span style={{ color: 'var(--fg-mute)' }}>SIGNED IN</span>
          </div>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="btn btn-ghost btn-sm" style={{ width: '100%' }}>
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
