/**
 * Pure helpers for the per-section `hidden` flag introduced in Phase 7
 * slice #47.
 *
 * Each draft row in `drafts` is a JSONB blob whose shape depends on the
 * section. The `hidden` flag is an optional, top-level boolean that lives
 * alongside the section's content, so any editor can read or write it
 * without needing to understand the rest of the draft's structure. The
 * helpers below codify three rules the slice relies on:
 *
 *  1. `isDraftHidden` is truthy only when the persisted blob carries
 *     `hidden === true`. Anything else (missing, false, undefined, null,
 *     a primitive) reads as visible. The default is "shown" so a fresh
 *     draft never disappears from the public preview.
 *  2. `withHidden` returns a new object with `hidden` set to the supplied
 *     value, preserving every other field on the blob. The function is
 *     pure; the caller decides when to persist.
 *  3. The helpers accept `unknown` because the draft layer is intentionally
 *     loose (see `lib/draft/store.ts`); the call site re-validates against
 *     the per-section schema only at publish time.
 *
 * The flag is the source of truth for the admin's preview pane (slice #43)
 * and any future per-section visibility surface. The publish flow (Phase
 * 8) maps the flag onto the corresponding `Site.settings.visibility.*`
 * field so the public site honours it after a publish; the public-site
 * read path itself stays anchored on `settings.visibility` until then.
 */

export type HiddenAware = Record<string, unknown> & { hidden?: boolean };

export function isDraftHidden(content: unknown): boolean {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return false;
  }
  const flag = (content as { hidden?: unknown }).hidden;
  return flag === true;
}

export function withHidden(content: unknown, hidden: boolean): HiddenAware {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    return { hidden };
  }
  return { ...(content as Record<string, unknown>), hidden };
}
