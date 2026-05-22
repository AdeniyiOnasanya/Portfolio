import 'server-only';
import { eq } from 'drizzle-orm';
import type { AdminSectionId } from '@/components/admin/sections';
import { db } from '@/lib/db';
import { drafts } from '@/lib/db/schema';

/**
 * Draft persistence for the admin CMS.
 *
 * Phase 7 slice #42 introduces the staging area: every editor writes its
 * working copy here, the publish flow (Phase 8) reads it back, validates it
 * against `lib/schema.ts`, and turns it into a GitHub commit. One row per
 * `AdminSectionId`; the row holds an opaque JSON blob in `content`.
 *
 * The store surface stays deliberately small (`getDraft`, `saveDraft`,
 * `clearDraft`) so route handlers and server actions can call it without
 * knowing the underlying SQL. All three helpers are server-only; the
 * `'server-only'` import at the top of this file makes any accidental
 * client-side import a build-time error.
 *
 * The `content` column is typed as `unknown` here on purpose. Drizzle's
 * `jsonb` column type widens to `unknown` because Postgres does not enforce
 * a JSON shape; we let the caller (the editor's server action, the publish
 * pipeline) re-validate against the matching Zod schema. That keeps the
 * draft layer agnostic to the schema iterations Phase 7 brings.
 */

export type DraftRow = {
  id: AdminSectionId;
  content: unknown;
  updatedAt: Date;
};

export async function getDraft(section: AdminSectionId): Promise<DraftRow | null> {
  const rows = await db.select().from(drafts).where(eq(drafts.id, section)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id as AdminSectionId,
    content: row.content,
    updatedAt: row.updatedAt,
  };
}

export async function saveDraft(section: AdminSectionId, content: unknown): Promise<DraftRow> {
  // `onConflictDoUpdate` is an upsert: if the row for this section already
  // exists, replace its content and bump `updatedAt`; otherwise insert. The
  // primary key (`id`) doubles as the conflict target so the upsert holds
  // the one-row-per-section invariant the read side relies on.
  const now = new Date();
  const inserted = await db
    .insert(drafts)
    .values({ id: section, content, updatedAt: now })
    .onConflictDoUpdate({
      target: drafts.id,
      set: { content, updatedAt: now },
    })
    .returning();

  const row = inserted[0];
  if (!row) {
    throw new Error(`saveDraft: insert returned no row for section "${section}"`);
  }
  return {
    id: row.id as AdminSectionId,
    content: row.content,
    updatedAt: row.updatedAt,
  };
}

export async function clearDraft(section: AdminSectionId): Promise<void> {
  await db.delete(drafts).where(eq(drafts.id, section));
}
