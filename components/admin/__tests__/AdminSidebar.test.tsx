import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdminSidebar } from '../AdminSidebar';
import { ADMIN_NAV } from '../sections';

/*
 * AdminSidebar tests, Phase 7 slice #41.
 *
 * The sidebar owns four behaviours:
 *  - it renders every section in `ADMIN_NAV` as an anchor pointing at
 *    `/admin/<id>` (the slice spec lists hero, about, skills, experience,
 *    ai, projects, footer, settings);
 *  - it highlights the link whose section matches the current pathname via
 *    the `.active` class and `aria-current="page"`;
 *  - it renders the signed-in admin email and an avatar derived from the
 *    first letter of that email;
 *  - it exposes the sign-out server action through a real <form>.
 *
 * `next/navigation`'s `usePathname` hook is mocked at module level so each
 * test can drive the active-state logic; `next/link` is exercised as-is so
 * the rendered output is a real <a href>.
 */

const usePathnameMock = vi.fn<() => string | null>();

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}));

const noopSignOut = vi.fn(async () => {});

function renderSidebar(pathname: string | null, email = 'admin@example.com') {
  usePathnameMock.mockReturnValue(pathname);
  return render(<AdminSidebar email={email} signOutAction={noopSignOut} />);
}

describe('<AdminSidebar />', () => {
  it('renders every section from ADMIN_NAV with the matching href', () => {
    renderSidebar('/admin/hero');
    for (const group of ADMIN_NAV) {
      for (const item of group.items) {
        const link = screen.getByRole('link', { name: new RegExp(`${item.num}.*${item.label}`) });
        expect(link).toHaveAttribute('href', `/admin/${item.id}`);
      }
    }
  });

  it('renders the eight section labels demanded by slice #41', () => {
    renderSidebar('/admin/hero');
    const expected = [
      'Hero',
      'About',
      'Skills',
      'Experience',
      'AI Practice',
      'Projects',
      'Footer',
      'Settings',
    ];
    for (const label of expected) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it.each([
    ['/admin/hero', 'hero'],
    ['/admin/about', 'about'],
    ['/admin/skills', 'skills'],
    ['/admin/experience', 'experience'],
    ['/admin/ai', 'ai'],
    ['/admin/projects', 'projects'],
    ['/admin/footer', 'footer'],
    ['/admin/settings', 'settings'],
  ])('marks the %s link as active on %s', (pathname, sectionId) => {
    renderSidebar(pathname);
    const active = screen.getByRole('link', { current: 'page' });
    expect(active).toHaveAttribute('href', `/admin/${sectionId}`);
    expect(active.className).toContain('active');
  });

  it('marks no link as active on a pathname outside the closed section list', () => {
    renderSidebar('/admin/something-else');
    expect(screen.queryByRole('link', { current: 'page' })).not.toBeInTheDocument();
  });

  it('renders the signed-in email and uppercase initial in the footer', () => {
    renderSidebar('/admin/hero', 'david@example.com');
    expect(screen.getByText('david@example.com')).toBeInTheDocument();
    // The avatar is aria-hidden so query by text content directly.
    const avatar = screen.getByText('D', { selector: '.avatar' });
    expect(avatar).toBeInTheDocument();
  });

  it('exposes the sign-out action through a form', () => {
    const { container } = renderSidebar('/admin/hero');
    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    const submit = screen.getByRole('button', { name: /sign out/i });
    expect(submit).toHaveAttribute('type', 'submit');
  });

  it('renders all three nav-group headings from the design grouping', () => {
    renderSidebar('/admin/hero');
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Catalog')).toBeInTheDocument();
    expect(screen.getByText('Site')).toBeInTheDocument();
  });
});
