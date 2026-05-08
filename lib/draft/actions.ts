'use server';

import { z } from 'zod';
import { ADMIN_SECTION_IDS, type AdminSectionId } from '@/components/admin/sections';
import { auth } from '@/lib/auth';
import { assertAllowlistConfigured, isAllowedAdminEmail } from '@/lib/auth/allowlist';
import { applyOrder, type ProjectDraft, type ProjectsDraft, renumberProjects } from './projects';
import { readOrSeedProjects } from './projects.server';
import { saveDraft } from './store';

// Boot-time assertion. A deployment without ADMIN_EMAIL would otherwise
// reject every save silently (isAllowedAdminEmail is fail-closed) with no
// operator-visible error. Mirrors the same guard in the auth route handler.
assertAllowlistConfigured(process.env.ADMIN_EMAIL);

// Cap each draft payload at 32 KiB. A single section's JSON should be a few
// KB at most; anything larger is a misconfigured client or an attacker
// trying to fill the JSONB column.
const MAX_DRAFT_BYTES = 32 * 1024;

/**
 * Server action that persists a section draft.
 *
 * The admin editors call this every time the client-side debounce window
 * fires (300 ms after the last keystroke; the round-trip budget is 350 ms
 * end to end). The action is fire-and-forget from the caller's perspective:
 * the editor wraps it in a `useTransition` so React can mark the call as a
 * non-blocking update, and the form keeps accepting keystrokes while the
 * request is in flight.
 *
 * Auth is two-stage. First, `auth()` must return a session with an email;
 * any anonymous request is rejected before the database is touched.
 * Second, that email is checked against `ADMIN_EMAIL` via the same
 * allowlist helper used by the sign-in callback (`lib/auth/allowlist.ts`).
 * Defence in depth: middleware already gates `/admin/*`, but a server
 * action is callable from any client-side fetch in the app, so the action
 * cannot rely on the middleware alone.
 *
 * Validation is intentionally light at this layer: the section id must
 * match the closed list in `components/admin/sections.ts`, and `content`
 * must be a JSON-serialisable record. The full per-section Zod parse runs
 * on publish (Phase 8), not on every keystroke; partial drafts are the
 * point of the staging area.
 */

const SectionIdSchema = z.enum(ADMIN_SECTION_IDS);

// Generic, JSON-shaped draft content. Tighter per-section schemas land in
// slice #46; for now we only require an object so a stray primitive cannot
// blow up `jsonb`'s storage assumptions.
const DraftContentSchema = z.record(z.string(), z.unknown());

export type SaveDraftResult =
  | { ok: true; updatedAt: string }
  | { ok: false; error: 'unauthenticated' | 'forbidden' | 'invalid_section' | 'invalid_content' };

export async function saveDraftAction(
  section: AdminSectionId,
  content: unknown,
): Promise<SaveDraftResult> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return { ok: false, error: 'unauthenticated' };
  }
  if (!isAllowedAdminEmail(email, process.env.ADMIN_EMAIL)) {
    return { ok: false, error: 'forbidden' };
  }

  const sectionResult = SectionIdSchema.safeParse(section);
  if (!sectionResult.success) {
    return { ok: false, error: 'invalid_section' };
  }
  const contentResult = DraftContentSchema.safeParse(content);
  if (!contentResult.success) {
    return { ok: false, error: 'invalid_content' };
  }

  // Size check after Zod confirms `content` is a record so JSON.stringify is
  // bounded; we still want to bail before writing to Postgres.
  if (JSON.stringify(contentResult.data).length > MAX_DRAFT_BYTES) {
    return { ok: false, error: 'invalid_content' };
  }

  const row = await saveDraft(sectionResult.data, contentResult.data);
  return { ok: true, updatedAt: row.updatedAt.toISOString() };
}

/**
 * Server action invoked when the operator finishes a drag or a keyboard
 * pickup-move-drop in the projects editor (slice #44). The wire payload is
 * just the new slug order; the server reads the current draft (or seeds
 * from MDX), applies the order, renumbers `n` contiguously, and persists.
 *
 * The action is intentionally narrow: it does not accept the full project
 * objects from the client because the publish-time schema has not had a
 * chance to validate them on this hot path. Reorder is order-only;
 * structural edits to a project (title, subtitle, ...) flow through a
 * different per-row editor in slices #45 and #46.
 *
 * Auth and the 32 KiB cap mirror `saveDraftAction` so the two write
 * surfaces share an audit shape: any admin write is rejected unless the
 * session email matches `ADMIN_EMAIL`, and any payload that would exceed
 * the JSONB column's soft ceiling bails before the database is touched.
 */

const OrderedSlugsSchema = z
  .array(z.string().min(1))
  .max(64, 'Too many project slugs in reorder payload.');

export type ReorderProjectsResult =
  | { ok: true; updatedAt: string; projects: ProjectDraft[] }
  | {
      ok: false;
      error: 'unauthenticated' | 'forbidden' | 'invalid_order' | 'invalid_content';
    };

export async function reorderProjectsAction(orderedSlugs: unknown): Promise<ReorderProjectsResult> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return { ok: false, error: 'unauthenticated' };
  }
  if (!isAllowedAdminEmail(email, process.env.ADMIN_EMAIL)) {
    return { ok: false, error: 'forbidden' };
  }

  const orderResult = OrderedSlugsSchema.safeParse(orderedSlugs);
  if (!orderResult.success) {
    return { ok: false, error: 'invalid_order' };
  }

  const current = await readOrSeedProjects();
  const reordered = applyOrder(current, orderResult.data);
  const renumbered = renumberProjects(reordered);

  const next: ProjectsDraft = { projects: renumbered };
  if (JSON.stringify(next).length > MAX_DRAFT_BYTES) {
    return { ok: false, error: 'invalid_content' };
  }

  const row = await saveDraft('projects', next);
  return {
    ok: true,
    updatedAt: row.updatedAt.toISOString(),
    projects: renumbered,
  };
}
