import { auth } from '@/lib/auth';

/*
 * Admin landing stub.
 *
 * Phase 6 ships only the happy-path sign-in: the magic link routes here, and
 * the page renders a minimal "you are signed in" affordance. The full editor
 * shell (Hero, About, Skills, etc.) lands in Phase 7 (#42 onward), at which
 * point this file is replaced by `app/(admin)/admin/[section]/page.tsx`.
 *
 * `force-dynamic` keeps Next from prerendering the page during `next build`,
 * because `auth()` reads cookies at request time. Without it the build
 * compiles fine but throws at static-generation time.
 */
export const dynamic = 'force-dynamic';

export default async function AdminLanding() {
  const session = await auth();
  return (
    <main style={{ padding: 48 }}>
      <h1>Admin</h1>
      <p>Signed in as {session?.user?.email ?? 'unknown'}.</p>
    </main>
  );
}
