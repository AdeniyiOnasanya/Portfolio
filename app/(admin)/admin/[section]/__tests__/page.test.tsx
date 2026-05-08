import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ADMIN_SECTION_IDS } from '../../../../../components/admin/sections';

/*
 * Per-section route tests.
 *
 * Originally written for slice #41 (every section renders a placeholder
 * mentioning the upcoming slice number). Slice #42 promotes `hero` from
 * the placeholder to the real `HeroEditor`, so this file now covers two
 * shapes: the live hero render plus the still-placeholder rendering for
 * the other seven sections.
 *
 * The page imports the draft store transitively; we mock the store and
 * the HeroEditor so the suite stays a unit test on the route logic and
 * does not pull next-auth or the Neon client into vitest's module graph.
 */

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/lib/draft/store', () => ({
  getDraft: vi.fn(async () => null),
}));

// Mock the server-only seam so the page does not pull `'server-only'`
// into the Node test runtime. The mock returns an empty seed list; the
// ProjectsEditor stub below ignores the value.
vi.mock('@/lib/draft/projects.server', () => ({
  loadProjectsDraft: vi.fn(async () => ({ projects: [], updatedAt: null, hidden: false })),
  readOrSeedProjects: vi.fn(),
}));

// SectionVisibilityToggle calls saveDraftAction transitively, which pulls
// next-auth into the module graph. Stub it out so this suite stays a
// unit test on the route logic.
vi.mock('@/components/admin/SectionVisibilityToggle', () => ({
  SectionVisibilityToggle: ({
    section,
    initialHidden,
  }: {
    section: string;
    initialHidden: boolean;
  }) => <div data-testid={`visibility-toggle-${section}`} data-hidden={String(initialHidden)} />,
}));

vi.mock('@/components/admin/HeroEditor', () => ({
  HeroEditor: ({
    initialDraft,
    initialUpdatedAt,
  }: {
    initialDraft: unknown;
    initialUpdatedAt: string | null;
  }) => (
    <article data-testid="hero-editor-stub">
      <h2>Hero</h2>
      <p>
        draft={JSON.stringify(initialDraft)} updatedAt={initialUpdatedAt ?? 'null'}
      </p>
    </article>
  ),
}));

vi.mock('@/components/admin/ProjectsEditor', () => ({
  ProjectsEditor: () => (
    <article data-testid="projects-editor-stub">
      <h2>Projects</h2>
    </article>
  ),
}));

async function loadPage() {
  const mod = await import('../page');
  return mod.default;
}

describe('AdminSectionPage at /admin/[section]', () => {
  it.each(
    ADMIN_SECTION_IDS.filter((id) => id !== 'hero' && id !== 'projects'),
  )('renders an editor placeholder for the %s section', async (section) => {
    const AdminSectionPage = await loadPage();
    const ui = await AdminSectionPage({ params: Promise.resolve({ section }) });
    render(ui);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent?.length ?? 0).toBeGreaterThan(0);
    expect(screen.getByText(/slice/i)).toBeInTheDocument();
  });

  it('renders the live HeroEditor at /admin/hero', async () => {
    const AdminSectionPage = await loadPage();
    const ui = await AdminSectionPage({ params: Promise.resolve({ section: 'hero' }) });
    render(ui);
    expect(screen.getByTestId('hero-editor-stub')).toBeInTheDocument();
  });

  it('renders the live ProjectsEditor at /admin/projects', async () => {
    const AdminSectionPage = await loadPage();
    const ui = await AdminSectionPage({ params: Promise.resolve({ section: 'projects' }) });
    render(ui);
    expect(screen.getByTestId('projects-editor-stub')).toBeInTheDocument();
  });

  it('numbers each placeholder section visibly so the sidebar and editor stay in sync', async () => {
    const AdminSectionPage = await loadPage();
    const ui = await AdminSectionPage({ params: Promise.resolve({ section: 'about' }) });
    render(ui);
    expect(screen.getByText(/section\s+02/i)).toBeInTheDocument();
  });

  it('calls notFound() for an unknown section', async () => {
    const AdminSectionPage = await loadPage();
    await expect(
      AdminSectionPage({ params: Promise.resolve({ section: 'something-else' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
