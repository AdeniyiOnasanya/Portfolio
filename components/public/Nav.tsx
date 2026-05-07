import type { Person } from '../../lib/schema';
import { ThemeToggle } from '../shared/ThemeToggle';

/**
 * Public site Nav strip.
 *
 * Server component. Mounts above main in `app/(public)/layout.tsx`. The
 * outer nav element is fixed to the top of the viewport and uses
 * `mix-blend-mode: difference` (declared in `app/globals.css`) so the bar
 * inverts its colour over both the dark Hero and lighter sections below.
 *
 * Anchors (Work, About, CV) jump to in-page section ids (`#work`,
 * `#about`, `#cv`). External links (GitHub, LinkedIn) carry
 * `target="_blank"` and `rel="noreferrer noopener"` per repo convention.
 *
 * Mirrors `design_handoff_portfolio/design/shared.jsx#Nav` lines 154-176.
 * Mobile breakpoint hides the link list (the mark + ThemeToggle pill stay
 * visible); a future P3 slice can add a sheet menu.
 */
export function Nav({ person }: { person: Person }) {
  return (
    <nav className="nav" aria-label="Primary">
      <a href="#home" className="nav-mark">
        DO / 2026
      </a>
      <div className="nav-links">
        <a href="#work">Work</a>
        <a href="#about">About</a>
        <a href="#cv">CV</a>
        <a href={person.github} target="_blank" rel="noreferrer noopener" aria-label="GitHub">
          GH
        </a>
        <a href={person.linkedin} target="_blank" rel="noreferrer noopener" aria-label="LinkedIn">
          LI
        </a>
        <ThemeToggle />
      </div>
    </nav>
  );
}
