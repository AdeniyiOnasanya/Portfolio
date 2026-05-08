import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/*
 * AdminMain tests, Phase 7 slice #43.
 *
 * Two behaviours pinned:
 *  - On any non-preview admin URL, render `<main className="admin-main
 *    no-preview">` and wrap children in `<div className="admin-editor">`,
 *    matching the slice #41 layout shape.
 *  - On `/admin/preview` (or any deeper path under it), render `<main
 *    className="admin-main">` (no `no-preview` modifier) and skip the
 *    `.admin-editor` wrapper so the page can place editor and preview as
 *    siblings inside the grid (`design_handoff_portfolio/design/admin/
 *    admin-app.jsx` lines 181 to 201).
 */

const usePathnameMock = vi.fn<() => string | null>();

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

async function loadAdminMain() {
  const mod = await import('../AdminMain');
  return mod.AdminMain;
}

describe('<AdminMain />', () => {
  it('keeps the no-preview modifier and the .admin-editor wrapper on /admin/hero', async () => {
    usePathnameMock.mockReturnValue('/admin/hero');
    const AdminMain = await loadAdminMain();
    const { container } = render(
      <AdminMain>
        <p data-testid="child">child</p>
      </AdminMain>,
    );
    const main = container.querySelector('main');
    expect(main?.className).toBe('admin-main no-preview');
    const editor = container.querySelector('.admin-editor');
    expect(editor).not.toBeNull();
    expect(editor?.contains(screen.getByTestId('child'))).toBe(true);
  });

  it('drops the no-preview modifier and the .admin-editor wrapper on /admin/preview', async () => {
    usePathnameMock.mockReturnValue('/admin/preview');
    const AdminMain = await loadAdminMain();
    const { container } = render(
      <AdminMain>
        <p data-testid="child">child</p>
      </AdminMain>,
    );
    const main = container.querySelector('main');
    expect(main?.className).toBe('admin-main');
    expect(container.querySelector('.admin-editor')).toBeNull();
    expect(main?.contains(screen.getByTestId('child'))).toBe(true);
  });

  it('treats a null pathname as a non-preview route', async () => {
    usePathnameMock.mockReturnValue(null);
    const AdminMain = await loadAdminMain();
    const { container } = render(
      <AdminMain>
        <p>child</p>
      </AdminMain>,
    );
    expect(container.querySelector('main')?.className).toBe('admin-main no-preview');
  });
});
