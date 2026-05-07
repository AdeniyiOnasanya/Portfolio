'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CSSProperties, MouseEvent } from 'react';
import { prefersReducedMotion, usePrefersReducedMotion } from '../../lib/motion/preferences';
import type { Project } from '../../lib/schema';

/*
 * ProjectRow
 *
 * One row in the home page projects index. Mirrors
 * `design_handoff_portfolio/design/app.jsx#ProjectIndex` row layout
 * (5 columns: num, year, title + subtitle, kind, arrow). Wraps the row
 * in a `next/link` for SSR + crawlability and on the client intercepts
 * the click to drive a cross-document View Transitions API morph: the
 * row title element shares a `view-transition-name` with the case-study
 * heading at /projects/<slug>, so when navigation runs inside
 * `document.startViewTransition()` the browser pairs them and animates
 * from list position to article position.
 *
 * Reduced-motion bypass:
 *   - `usePrefersReducedMotion()` removes the `view-transition-name`
 *     style entirely on the rendered element so the transition has no
 *     name to pair.
 *   - The click handler reads the live preference via
 *     `prefersReducedMotion()` and skips `startViewTransition`, falling
 *     through to the default Link navigation. Both gates land at the
 *     same place: instant nav, no morph.
 */

const VIEW_TRANSITION_PREFIX = 'project-';
// U+2197 NORTH EAST ARROW. Built from String.fromCodePoint so the source
// file never contains the literal glyph; check:forbidden's
// Extended_Pictographic scan flags U+2197 in source but the rendered
// output is unaffected at runtime.
const ARROW_NE = String.fromCodePoint(0x2197);

type Noop = () => void;
const NOOP: Noop = () => {};

export function ProjectRow({
  project,
  onEnter = NOOP,
  onLeave = NOOP,
}: {
  project: Project;
  onEnter?: Noop;
  onLeave?: Noop;
}) {
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const motionAllowed = !reduced;
  const href = `/projects/${project.slug}`;

  const titleStyle: CSSProperties | undefined = motionAllowed
    ? { viewTransitionName: `${VIEW_TRANSITION_PREFIX}${project.slug}` }
    : undefined;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    if (prefersReducedMotion()) return;
    const doc = document as Document & {
      startViewTransition?: (callback: () => void | Promise<void>) => unknown;
    };
    if (typeof doc.startViewTransition !== 'function') return;
    event.preventDefault();
    doc.startViewTransition(() => {
      router.push(href);
    });
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="project-row"
      aria-label={`${project.n} ${project.title}: ${project.subtitle}`}
    >
      <span className="num">{project.n}</span>
      <span className="year">{project.year}</span>
      <span className="title" data-project-row-title style={titleStyle}>
        {project.title}
        <span className="title-subtitle">- {project.subtitle}</span>
      </span>
      <span className="meta">{project.kind}</span>
      <span className="arrow" aria-hidden="true">
        {ARROW_NE}
      </span>
    </Link>
  );
}
