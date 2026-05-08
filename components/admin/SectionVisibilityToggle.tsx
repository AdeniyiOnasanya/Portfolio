'use client';

/**
 * SectionVisibilityToggle, Phase 7 slice #47.
 *
 * Renders a `VisibilityToggle` in the editor's head row (next to the
 * autosave-status indicator) and persists the change as `hidden: true`
 * on the section's draft via `saveDraftAction`. Toggling off keeps the
 * rest of the draft content untouched so the operator can flip the
 * section back on later without retyping.
 *
 * The wire shape is intentionally minimal: the action receives the full
 * draft content with `hidden` patched. The section-specific draft schema
 * (Hero, Projects, etc.) is not threaded through because the slice keeps
 * the toggle decoupled from each editor's own form state. The trade-off:
 * if an editor does not pass `initialContent`, the saved blob will only
 * contain `{ hidden }`. Editors with a richer draft (HeroEditor) compose
 * the toggle inline and own the merge themselves.
 *
 * Mirrors the design's `Switch` row used in `admin-editors.jsx` line 316
 * onward and `admin.css` `.toggle-row` / `.switch` styling lines 207 to
 * 231 (already on develop from slice #46). The label "Show on site" is
 * the affirmative phrasing the operator expects when reading the head
 * row top-to-bottom: when the switch is on the section is shown.
 */

import { useState, useTransition } from 'react';
import type { AdminSectionId } from '@/components/admin/sections';
import { saveDraftAction } from '@/lib/draft/actions';
import { withHidden } from '@/lib/draft/hidden';
import { VisibilityToggle } from './VisibilityToggle';

export type SectionVisibilityToggleProps = {
  section: AdminSectionId;
  /**
   * Initial value of the `hidden` flag from the persisted draft. Default
   * `false` so a fresh section is shown on the public preview.
   */
  initialHidden: boolean;
  /**
   * The current draft content (without the `hidden` flag) so a toggle
   * does not blow away the rest of the section's record. For sections
   * without a draft yet (placeholders), pass `null`; the action will
   * insert a fresh row with just `{ hidden }`.
   */
  initialContent?: unknown;
  /**
   * Optional callback fired after a successful save with the server's
   * `updatedAt` timestamp. The Hero and Projects editors use this to
   * keep their autosave-status line in sync with the visibility write.
   */
  onSaved?: (updatedAt: string) => void;
};

export function SectionVisibilityToggle({
  section,
  initialHidden,
  initialContent,
  onSaved,
}: SectionVisibilityToggleProps) {
  const [hidden, setHidden] = useState<boolean>(initialHidden);
  const [, startTransition] = useTransition();

  function handleChange(nextOn: boolean): void {
    // The toggle is "Show on site": on => visible, off => hidden.
    const nextHidden = !nextOn;
    setHidden(nextHidden);
    const nextContent = withHidden(initialContent, nextHidden);
    startTransition(async () => {
      const result = await saveDraftAction(section, nextContent);
      if (result.ok && onSaved) {
        onSaved(result.updatedAt);
      }
    });
  }

  return (
    <VisibilityToggle
      id={`${section}-visible`}
      label="Show on site"
      sub="Section visible on public preview"
      on={!hidden}
      onChange={handleChange}
    />
  );
}
