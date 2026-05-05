'use client';

import type { CSSProperties, ReactNode } from 'react';
import { usePrefersReducedMotion } from '../../lib/motion/preferences';

/*
 * ProjectCaseStudyHeading
 *
 * Destination element for the project-row to case-study View Transitions
 * morph. The matching source is the title span rendered by `ProjectRow` on
 * the home page. The pair is keyed by slug as `project-<slug>` so each
 * heading pairs with exactly one row.
 *
 * Reduced-motion bypass: when the OS preference is `reduce`, the
 * `view-transition-name` is omitted entirely so even if a stray
 * `document.startViewTransition` call escapes the gate on the source side,
 * there is no name on this side to pair against.
 *
 * This is the smallest possible client boundary on the case-study page; the
 * surrounding `ProjectCaseStudy` component remains a server component and
 * the rest of the article is server-rendered.
 */

export function ProjectCaseStudyHeading({
  id,
  slug,
  className,
  children,
}: {
  id: string;
  slug: string;
  className?: string;
  children: ReactNode;
}) {
  const reduced = usePrefersReducedMotion();
  const style: CSSProperties | undefined = reduced
    ? undefined
    : { viewTransitionName: `project-${slug}` };

  return (
    <h1 id={id} className={className} style={style}>
      {children}
    </h1>
  );
}
