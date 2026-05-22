import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/*
 * Live preview route tests, slice #43.
 *
 * The route is a server component. We exercise it by calling the default
 * export directly with no params and rendering the returned JSX. Three
 * shapes are pinned:
 *  - the route reads the draft store and the site content, then forwards
 *    them to `<PreviewWorkspace>`;
 *  - an unauthenticated request redirects to `/login`;
 *  - an authenticated request renders the workspace stub.
 *
 * The auth, content, and draft-store seams are mocked at module scope so
 * the suite stays a unit test on the route, not an integration test on
 * Auth.js or Postgres.
 */

const authMock = vi.fn();
const getDraftMock = vi.fn();
const loadSiteMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  auth: () => authMock(),
}));

vi.mock('@/lib/draft/store', () => ({
  getDraft: (...args: unknown[]) => getDraftMock(...args),
}));

vi.mock('@/lib/content', () => ({
  loadSite: () => loadSiteMock(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock('@/components/admin/PreviewWorkspace', () => ({
  PreviewWorkspace: ({
    initialDraft,
    initialUpdatedAt,
    basePerson,
  }: {
    initialDraft: unknown;
    initialUpdatedAt: string | null;
    basePerson: { name: string };
  }) => (
    <div data-testid="preview-workspace-stub">
      <span data-testid="initial-draft">{JSON.stringify(initialDraft)}</span>
      <span data-testid="initial-updated-at">{initialUpdatedAt ?? 'null'}</span>
      <span data-testid="base-name">{basePerson.name}</span>
    </div>
  ),
}));

const fakeSite = {
  person: {
    name: 'David Onasanya',
    nameAccent: 'Onasanya',
    role: 'Engineer',
    location: 'London',
    phone: '+44',
    email: 'hello@example.com',
    cvUrl: '/cv/d.pdf',
    cvDocxUrl: '/cv/d.docx',
    github: 'https://github.com/x',
    linkedin: 'https://linkedin.com/x',
    yearsExp: 9,
    estYear: '2016',
    statement: 'Calm.',
    longBio: ['Para.'],
  },
  hero: {
    meta: ['London'],
    stats: [
      { value: '9', label: 'Years' },
      { value: '40', label: 'Ships' },
      { value: '5', label: 'Teams' },
    ],
  },
  skills: [{ label: 'Frontend', items: ['React'] }],
};

async function loadPage() {
  const mod = await import('../page');
  return mod.default;
}

describe('AdminPreviewPage at /admin/preview', () => {
  it('redirects to /login when there is no session', async () => {
    authMock.mockResolvedValueOnce(null);
    const AdminPreviewPage = await loadPage();
    await expect(AdminPreviewPage()).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(getDraftMock).not.toHaveBeenCalled();
  });

  it('redirects to /login when the session has no email', async () => {
    authMock.mockResolvedValueOnce({ user: { email: null } });
    const AdminPreviewPage = await loadPage();
    await expect(AdminPreviewPage()).rejects.toThrow('NEXT_REDIRECT:/login');
  });

  it('renders the workspace with the draft and the published site baseline', async () => {
    const updatedAt = new Date('2026-05-07T12:00:00Z');
    authMock.mockResolvedValueOnce({ user: { email: 'admin@example.com' } });
    getDraftMock.mockResolvedValueOnce({
      id: 'hero',
      content: { person: { name: 'Live name' } },
      updatedAt,
    });
    loadSiteMock.mockResolvedValueOnce(fakeSite);

    const AdminPreviewPage = await loadPage();
    const ui = await AdminPreviewPage();
    render(ui);

    expect(screen.getByTestId('preview-workspace-stub')).toBeInTheDocument();
    expect(screen.getByTestId('initial-draft').textContent).toBe(
      JSON.stringify({ person: { name: 'Live name' } }),
    );
    expect(screen.getByTestId('initial-updated-at').textContent).toBe(updatedAt.toISOString());
    expect(screen.getByTestId('base-name').textContent).toBe('David Onasanya');
    expect(getDraftMock).toHaveBeenCalledWith('hero');
  });

  it('handles a missing draft row gracefully', async () => {
    authMock.mockResolvedValueOnce({ user: { email: 'admin@example.com' } });
    getDraftMock.mockResolvedValueOnce(null);
    loadSiteMock.mockResolvedValueOnce(fakeSite);

    const AdminPreviewPage = await loadPage();
    const ui = await AdminPreviewPage();
    render(ui);

    expect(screen.getByTestId('initial-draft').textContent).toBe('null');
    expect(screen.getByTestId('initial-updated-at').textContent).toBe('null');
  });
});
