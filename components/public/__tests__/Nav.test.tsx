import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../../shared/ThemeProvider';
import { Nav } from '../Nav';
import { samplePerson } from './fixtures';

function renderNav() {
  // ThemeToggle reads from ThemeProvider context; wrap so the inline
  // <ThemeToggle /> in <Nav /> mounts cleanly under jsdom.
  return render(
    <ThemeProvider initialMode="system" initialEffective="dark">
      <Nav person={samplePerson} />
    </ThemeProvider>,
  );
}

describe('<Nav />', () => {
  it('exposes a primary navigation landmark', () => {
    renderNav();
    expect(screen.getByRole('navigation', { name: /primary/i })).toBeInTheDocument();
  });

  it('renders the DO / 2026 mark linking to #home', () => {
    renderNav();
    const mark = screen.getByRole('link', { name: 'DO / 2026' });
    expect(mark).toHaveAttribute('href', '#home');
    expect(mark.className).toContain('nav-mark');
  });

  it('renders the three internal anchor links pointing at #work, #about, #cv', () => {
    renderNav();
    expect(screen.getByRole('link', { name: 'Work' })).toHaveAttribute('href', '#work');
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '#about');
    expect(screen.getByRole('link', { name: 'CV' })).toHaveAttribute('href', '#cv');
  });

  it('renders the GitHub link from person.github with target=_blank and rel=noreferrer noopener', () => {
    renderNav();
    const gh = screen.getByRole('link', { name: 'GitHub' });
    expect(gh).toHaveAttribute('href', samplePerson.github);
    expect(gh).toHaveAttribute('target', '_blank');
    const rel = gh.getAttribute('rel') ?? '';
    expect(rel).toMatch(/noreferrer/);
    expect(rel).toMatch(/noopener/);
  });

  it('renders the LinkedIn link from person.linkedin with target=_blank and rel=noreferrer noopener', () => {
    renderNav();
    const li = screen.getByRole('link', { name: 'LinkedIn' });
    expect(li).toHaveAttribute('href', samplePerson.linkedin);
    expect(li).toHaveAttribute('target', '_blank');
    const rel = li.getAttribute('rel') ?? '';
    expect(rel).toMatch(/noreferrer/);
    expect(rel).toMatch(/noopener/);
  });

  it('renders the ThemeToggle pill inside the nav-links container', () => {
    renderNav();
    const nav = screen.getByRole('navigation', { name: /primary/i });
    const button = within(nav).getByRole('button');
    expect(button.getAttribute('aria-label')).toMatch(/theme/i);
  });

  it('renders five anchor links plus the mark for the desktop layout', () => {
    renderNav();
    const nav = screen.getByRole('navigation', { name: /primary/i });
    // Mark + Work + About + CV + GH + LI = 6 links total.
    const links = within(nav).getAllByRole('link');
    expect(links).toHaveLength(6);
  });
});
