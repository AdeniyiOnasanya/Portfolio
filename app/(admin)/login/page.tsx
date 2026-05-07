import type { Metadata } from 'next';
import { LoginForm } from '@/components/admin/LoginForm';

/*
 * Editorial split-pane login.
 *
 * Layout mirrors `design_handoff_portfolio/design/login.html` (lines 13 to
 * 241): a dark brand panel on the left with the italic Fraunces display
 * mark, and the form panel on the right. The form itself lives in the
 * client component `<LoginForm />` so the server-rendered shell stays
 * inert; only the input + submit interaction needs JS.
 *
 * `metadata.robots = noindex, nofollow` keeps the login URL out of search.
 * The page is admin-only and the marketing site never links to it.
 */

export const metadata: Metadata = {
  title: 'Sign in, David Onasanya',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="login-shell">
      <aside className="login-brand">
        <div className="topline">
          <span className="dot" aria-hidden="true" />
          <span>DO / ADMIN</span>
          <span style={{ opacity: 0.4 }}>{'·'}</span>
          <span>RESTRICTED ACCESS</span>
        </div>
        <div>
          <div className="login-display">
            Sign in.
            <br />
            <em>Quietly.</em>
          </div>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              letterSpacing: '0.06em',
              color: 'rgba(255,255,255,0.55)',
              marginTop: 24,
              maxWidth: '38ch',
              lineHeight: 1.6,
            }}
          >
            This is the back of the house. Magic-link sign-in for the portfolio CMS. No public link
            points here; you arrived by knowing the URL.
          </p>
        </div>
        <div className="login-foot">
          <span>STAFFORD / UK</span>
          <span>v1.0</span>
          <span>SECURE</span>
        </div>
      </aside>
      <main className="login-form">
        <LoginForm />
        <div className="login-status">
          <span className="live">SYSTEM ONLINE</span>
          <span>NO PUBLIC LINK</span>
          <span>LOCAL ONLY</span>
        </div>
      </main>
    </div>
  );
}
