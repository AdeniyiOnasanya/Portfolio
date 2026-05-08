'use client';

import { useCallback, useMemo, useState } from 'react';
import { Hero } from '@/components/public/Hero';
import type { HeroDraft, HeroPersonDraft } from '@/lib/draft/hero-types';
import type { Hero as HeroType, Person, Skills as SkillsType } from '@/lib/schema';
import { HeroEditor } from './HeroEditor';

/**
 * Live preview workspace for the Hero section, slice #43.
 *
 * Mirrors `design_handoff_portfolio/design/admin/admin-app.jsx` lines 181
 * to 201: the same `.admin-editor` (left) plus `.admin-preview` (right)
 * pair inside the layout's `.admin-main` grid, with a `.preview-bar`
 * status strip at the top of the preview column. The handoff renders the
 * preview as an iframe pointed at `index.html?preview=draft`. The
 * acceptance contract for #43 is "no full rehydration on every keystroke",
 * so this slice swaps the iframe for an in-tree React render of the same
 * `<Hero>` component the public site uses; updates are state-driven, not
 * page reloads.
 *
 * State sharing. The optimistic person draft lives here. The editor
 * receives `onPersonChange`, which fires once per committed local edit
 * inside `HeroEditor`. The preview reads from this state, so the right
 * pane reflects keystrokes the moment React commits them; no debounce, no
 * round-trip. The server-side debounced auto-save is unaffected and still
 * happens inside `HeroEditor` against `saveDraftAction`.
 *
 * Reduced motion. The public `<Hero>` already gates marquee animation and
 * the magnetic-button effect on `usePrefersReducedMotion()`, so the
 * preview inherits the contract for free; no additional gate is needed
 * here.
 */

export type PreviewWorkspaceProps = {
  initialDraft: HeroDraft | null;
  initialUpdatedAt: string | null;
  // Baseline content from `content/site.json`. The hero render needs the
  // full `Person`, `Hero`, and `Skills` records to satisfy its prop
  // contract; the draft only carries the operator-editable fields, so we
  // overlay the draft on top of the baseline at preview time.
  basePerson: Person;
  baseHero: HeroType;
  baseSkills: SkillsType;
};

function mergePerson(base: Person, draft: HeroPersonDraft | undefined): Person {
  // Overlay only the fields the Hero editor actually edits. Anything the
  // draft does not carry (cvUrl, github, email, ...) keeps its base value
  // so the preview's call-to-action buttons still link somewhere.
  if (!draft) return base;
  const merged: Person = { ...base };
  if (typeof draft.name === 'string' && draft.name.length > 0) {
    merged.name = draft.name;
    // The publish-time `Person` schema requires `nameAccent` to appear
    // verbatim inside `name`. When the operator types a new name the base
    // accent may no longer be a substring; clear it so the public
    // `<Hero>`'s `splitName(name, nameAccent)` falls back to its
    // first-word-of-name path instead of rendering a corrupt split.
    if (
      typeof merged.nameAccent === 'string' &&
      !merged.name.includes(merged.nameAccent)
    ) {
      merged.nameAccent = merged.name;
    }
  }
  if (typeof draft.role === 'string' && draft.role.length > 0) merged.role = draft.role;
  if (typeof draft.location === 'string' && draft.location.length > 0) {
    merged.location = draft.location;
  }
  if (typeof draft.yearsExp === 'number' && Number.isFinite(draft.yearsExp)) {
    merged.yearsExp = draft.yearsExp;
  }
  if (typeof draft.statement === 'string' && draft.statement.length > 0) {
    merged.statement = draft.statement;
  }
  if (Array.isArray(draft.longBio) && draft.longBio.length > 0) {
    merged.longBio = draft.longBio;
  }
  return merged;
}

export function PreviewWorkspace({
  initialDraft,
  initialUpdatedAt,
  basePerson,
  baseHero,
  baseSkills,
}: PreviewWorkspaceProps) {
  const [person, setPerson] = useState<HeroPersonDraft>(() => initialDraft?.person ?? {});

  const handlePersonChange = useCallback((next: HeroPersonDraft) => {
    setPerson(next);
  }, []);

  // Memoize so a re-render that does not change `person` or `basePerson`
  // does not produce a new prop reference for `<Hero>`. `<Hero>` itself is
  // not memo-wrapped, so identity-stable props let React skip its render
  // when its parent re-renders for unrelated reasons (e.g. a Suspense
  // boundary settling above).
  const previewPerson = useMemo(() => mergePerson(basePerson, person), [basePerson, person]);

  return (
    <>
      <div className="admin-editor">
        <HeroEditor
          initialDraft={initialDraft}
          initialUpdatedAt={initialUpdatedAt}
          onPersonChange={handlePersonChange}
        />
      </div>
      <div className="admin-preview" data-testid="admin-preview">
        <div className="preview-bar">
          <span>Live preview</span>
        </div>
        <div className="preview-frame">
          <Hero person={previewPerson} hero={baseHero} skills={baseSkills} />
        </div>
      </div>
    </>
  );
}
