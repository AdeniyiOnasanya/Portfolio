import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ADMIN_SECTION_IDS } from '../../../../../components/admin/sections';
import AdminSectionPage from '../page';

/*
 * Per-section route tests, Phase 7 slice #41.
 *
 * Every entry in ADMIN_SECTION_IDS resolves through the dynamic `[section]`
 * route to a rendered editor placeholder. The placeholder shows the section
 * label as an h2 plus a "coming soon" paragraph. Anything outside that
 * closed list calls notFound().
 */

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

describe('AdminSectionPage at /admin/[section]', () => {
  it.each(
    ADMIN_SECTION_IDS,
  )('renders an editor placeholder for the %s section', async (section) => {
    const ui = await AdminSectionPage({ params: Promise.resolve({ section }) });
    render(ui);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent?.length ?? 0).toBeGreaterThan(0);
    // Every placeholder mentions the upcoming slice number so the user knows
    // this is intentionally minimal; the copy lives in the page module.
    expect(screen.getByText(/slice/i)).toBeInTheDocument();
  });

  it('numbers each section visibly so the sidebar and editor stay in sync', async () => {
    const ui = await AdminSectionPage({ params: Promise.resolve({ section: 'hero' }) });
    render(ui);
    expect(screen.getByText(/section\s+01/i)).toBeInTheDocument();
  });

  it('calls notFound() for an unknown section', async () => {
    await expect(
      AdminSectionPage({ params: Promise.resolve({ section: 'something-else' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
