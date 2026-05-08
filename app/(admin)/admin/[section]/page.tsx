import { notFound } from 'next/navigation';
import { HeroEditor } from '@/components/admin/HeroEditor';
import { ProjectsEditor } from '@/components/admin/ProjectsEditor';
import {
  type AdminSectionId,
  getAdminNavItem,
  isAdminSectionId,
} from '@/components/admin/sections';
import { loadProjectsDraft } from '@/lib/draft/projects.server';
import { getDraft } from '@/lib/draft/store';

/**
 * Per-section editor route.
 *
 * Slice #41 shipped the routing frame; slice #42 (this change) wires the
 * Hero editor to a debounced auto-save backed by Neon (`lib/draft/store.ts`).
 * The other section ids still render the placeholder copy until their own
 * slices land.
 *
 * Validation: the `[section]` segment is checked against the closed list in
 * `components/admin/sections.ts`. Anything unknown calls `notFound()`, so an
 * arbitrary URL like /admin/foo renders the root 404 instead of an empty
 * placeholder. `generateStaticParams` is omitted on purpose: the layout is
 * `force-dynamic` (auth reads cookies), so static-params would be ignored.
 *
 * The heading text and section-ribbon styling mirror `.editor-section h2`
 * and `.section-ribbon` in `design_handoff_portfolio/design/admin.css` lines
 * 169 to 179 and 290 to 297.
 */

const COMING_SOON_COPY: Record<Exclude<AdminSectionId, 'hero' | 'projects'>, string> = {
  about: 'The About editor lands in slice #46 (Zod validation across all field editors).',
  skills: 'The Skills editor lands in slice #46.',
  experience: 'The Experience editor lands in slice #46.',
  ai: 'The AI Practice editor lands in slice #46.',
  footer: 'The Footer editor lands in slice #46.',
  settings: 'Site-wide settings (theme defaults, danger zone) land in slice #47.',
};

type HeroDraftShape = {
  person?: {
    name?: string;
    role?: string;
    location?: string;
    yearsExp?: number;
    statement?: string;
    longBio?: string[];
  };
};

function asHeroDraft(value: unknown): HeroDraftShape | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as HeroDraftShape;
  }
  return null;
}

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!isAdminSectionId(section)) {
    notFound();
  }

  if (section === 'hero') {
    const row = await getDraft('hero');
    return (
      <HeroEditor
        initialDraft={asHeroDraft(row?.content)}
        initialUpdatedAt={row?.updatedAt ? row.updatedAt.toISOString() : null}
      />
    );
  }

  if (section === 'projects') {
    const { projects, updatedAt } = await loadProjectsDraft();
    return <ProjectsEditor initialProjects={projects} initialUpdatedAt={updatedAt} />;
  }

  const item = getAdminNavItem(section);
  return (
    <article className="editor-section">
      <header className="head">
        <div>
          <div className="section-ribbon">
            <span className="bar" aria-hidden="true" />
            <span>Section {item.num}</span>
          </div>
          <h2>{item.label}</h2>
        </div>
        <span className="num">Editor</span>
      </header>
      <p style={{ color: 'var(--fg-dim)', fontSize: 14, lineHeight: 1.55, maxWidth: '60ch' }}>
        {COMING_SOON_COPY[section]}
      </p>
    </article>
  );
}
