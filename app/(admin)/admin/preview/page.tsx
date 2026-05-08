import { redirect } from 'next/navigation';
import { PreviewWorkspace } from '@/components/admin/PreviewWorkspace';
import { auth } from '@/lib/auth';
import { loadSite } from '@/lib/content';
import { getDraft } from '@/lib/draft/store';

/**
 * Live preview route, Phase 7 slice #43.
 *
 * Renders the Hero editor on the left and a live `<Hero>` render on the
 * right. The split lives inside the admin shell's `.admin-main` grid; the
 * `AdminMain` client wrapper drops the `.no-preview` modifier when the
 * pathname starts with `/admin/preview`, so the layout flips to two
 * columns only on this route.
 *
 * Server-side data flow:
 *  - `auth()` gates the route as defence-in-depth on top of
 *    `middleware.ts`. An anonymous request that slips past the middleware
 *    redirects to `/login` before any DB read happens.
 *  - `getDraft('hero')` returns the latest persisted hero draft (or null,
 *    if the operator has never edited).
 *  - `loadSite()` returns the published baseline so the preview's `<Hero>`
 *    has the full `Person`, `Hero`, and `Skills` records it needs. The
 *    client overlays the draft fields on top of the baseline; fields the
 *    Hero editor does not touch (cvUrl, github, email, ...) keep their
 *    published values so the call-to-action buttons still resolve.
 *
 * The component tree below the `<PreviewWorkspace>` boundary is a client
 * tree: the editor's local optimistic state and the preview render share a
 * single React commit per keystroke. No iframe, no router refresh; the
 * "no full rehydration on every keystroke" contract from the slice
 * acceptance criteria is enforced by sharing in-memory state instead of a
 * URL.
 *
 * The shared admin layout already declares `dynamic = 'force-dynamic'`, so
 * this page inherits dynamic rendering and Next will not attempt to
 * prerender the route at build time. That matters because the build must
 * not require `DATABASE_URL`, and `getDraft` only runs at request time.
 */

type HeroPersonDraft = {
  name?: string;
  role?: string;
  location?: string;
  yearsExp?: number;
  statement?: string;
  longBio?: string[];
};

type HeroDraftShape = {
  person?: HeroPersonDraft;
};

function asHeroDraft(value: unknown): HeroDraftShape | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as HeroDraftShape;
  }
  return null;
}

export default async function AdminPreviewPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect('/login');
  }

  const [row, site] = await Promise.all([getDraft('hero'), loadSite()]);

  return (
    <PreviewWorkspace
      initialDraft={asHeroDraft(row?.content)}
      initialUpdatedAt={row?.updatedAt ? row.updatedAt.toISOString() : null}
      basePerson={site.person}
      baseHero={site.hero}
      baseSkills={site.skills}
    />
  );
}
