/**
 * Admin nav configuration.
 *
 * Mirrors the section list enumerated in slice #41 (Phase 7): hero, about,
 * skills, experience, ai, projects, footer, settings. The grouping (Content,
 * Catalog, Site) and the two-digit `num` prefix come from
 * `design_handoff_portfolio/design/admin/admin-app.jsx` lines 44 to 59. The
 * design groups Hero and About into a single "Hero & About" entry; the slice
 * spec splits them so each section has its own URL, and we keep both inside
 * the Content group so the sidebar reads top-to-bottom in the same order as
 * the public page.
 *
 * The `id` of each item is also the dynamic `[section]` segment value used by
 * `app/(admin)/admin/[section]/page.tsx`. Keep this list as the single
 * source of truth: the section page validates against `ADMIN_SECTION_IDS`,
 * the sidebar renders from `ADMIN_NAV`, and tests in this slice assert
 * parity between the two.
 */

export type AdminSectionId =
  | 'hero'
  | 'about'
  | 'skills'
  | 'experience'
  | 'ai'
  | 'projects'
  | 'footer'
  | 'settings';

export type AdminNavItem = {
  id: AdminSectionId;
  num: string;
  label: string;
};

export type AdminNavGroup = {
  group: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV: readonly AdminNavGroup[] = [
  {
    group: 'Content',
    items: [
      { id: 'hero', num: '01', label: 'Hero' },
      { id: 'about', num: '02', label: 'About' },
      { id: 'skills', num: '03', label: 'Skills' },
      { id: 'experience', num: '04', label: 'Experience' },
      { id: 'ai', num: '05', label: 'AI Practice' },
    ],
  },
  {
    group: 'Catalog',
    items: [{ id: 'projects', num: '06', label: 'Projects' }],
  },
  {
    group: 'Site',
    items: [
      { id: 'footer', num: '07', label: 'Footer' },
      { id: 'settings', num: '08', label: 'Settings' },
    ],
  },
] as const;

export const ADMIN_SECTION_IDS: readonly AdminSectionId[] = ADMIN_NAV.flatMap((group) =>
  group.items.map((item) => item.id),
);

export const DEFAULT_ADMIN_SECTION: AdminSectionId = 'hero';

export function isAdminSectionId(value: string): value is AdminSectionId {
  return (ADMIN_SECTION_IDS as readonly string[]).includes(value);
}

export function getAdminNavItem(id: AdminSectionId): AdminNavItem {
  for (const group of ADMIN_NAV) {
    const match = group.items.find((item) => item.id === id);
    if (match) return match;
  }
  // ADMIN_NAV is the single source for AdminSectionId, so this is unreachable
  // unless the union and the array drift apart. Throw so the build catches it.
  throw new Error(`Unknown admin section id: ${id}`);
}
