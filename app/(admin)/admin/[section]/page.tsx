import { notFound } from 'next/navigation';
import {
  type AdminSectionId,
  getAdminNavItem,
  isAdminSectionId,
} from '../../../../components/admin/sections';

/**
 * Per-section editor placeholder.
 *
 * Slice #41 (Phase 7) ships only the routing + visible editor frame. Each
 * section renders an editorial heading and a "coming soon" paragraph; the
 * real editors land in slice #42 (Hero), #44 (Projects drag-reorder), #45
 * (image upload), and #46 (Zod validation). Do not pre-empt those slices
 * from here.
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

const COMING_SOON_COPY: Record<AdminSectionId, string> = {
  hero: 'The Hero editor lands in slice #42.',
  about: 'The About editor lands in slice #46 (Zod validation across all field editors).',
  skills: 'The Skills editor lands in slice #46.',
  experience: 'The Experience editor lands in slice #46.',
  ai: 'The AI Practice editor lands in slice #46.',
  projects: 'The Projects editor (drag-reorder + image upload) lands in slices #44 and #45.',
  footer: 'The Footer editor lands in slice #46.',
  settings: 'Site-wide settings (theme defaults, danger zone) land in slice #47.',
};

export default async function AdminSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!isAdminSectionId(section)) {
    notFound();
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
