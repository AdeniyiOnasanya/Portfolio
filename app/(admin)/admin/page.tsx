import { redirect } from 'next/navigation';
import { DEFAULT_ADMIN_SECTION } from '@/components/admin/sections';

/**
 * /admin landing.
 *
 * Slice #41 (Phase 7) gives every section its own URL under
 * /admin/<section>. The bare /admin entry is a server-side redirect to the
 * default section so the magic-link flow (which lands on /admin) and any
 * direct visit both end up on /admin/hero. The redirect runs on the server,
 * so there is no flash of empty admin shell on the client.
 *
 * `force-dynamic` is inherited from the layout's `dynamic` export; we keep
 * the page itself thin so the redirect happens before anything renders.
 */

export default function AdminLanding(): never {
  redirect(`/admin/${DEFAULT_ADMIN_SECTION}`);
}
