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

async function loadPage() {
  const mod = await import('../page');
  return mod.default;
}

describe('AdminSectionPage at /admin/[section]', () => {
  it.each(
    ADMIN_SECTION_IDS.filter((id) => id !== 'hero'),
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
