'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { CSSProperties, MouseEvent } from 'react';
import { prefersReducedMotion, usePrefersReducedMotion } from '../../lib/motion/preferences';

/*
 * ProjectRow
 *
 * One row in the home page Projects section. Wraps the row in a `next/link`
 * for SSR + crawlability and on the client intercepts the click to drive a
 * cross-document View Transitions API morph: the row title element shares a
 * `view-transition-name` with the case-study heading at /projects/<slug>, so
 * when navigation runs inside `document.startViewTransition()` the browser
 * pairs them and animates from list position to article position.
 *
 * Reduced-motion bypass:
 *   - `usePrefersReducedMotion()` removes the `view-transition-name` style
 *     entirely on the rendered element so the transition has no name to pair.
 *   - The click handler reads the live preference via `prefersReducedMotion()`
 *     and skips `startViewTransition`, falling through to the default Link
 *     navigation. Both gates land at the same place: instant nav, no morph.
 *
 * The matching destination element is the `<h1>` rendered by
 * `ProjectCaseStudyHeading` on `/projects/<slug>`. The pair is keyed by slug
 * so each row pairs with exactly one heading: `project-<slug>`.
 *
 * The installed `react-view-transitions@0.0.1` package only exports a state
 * wrapper around `document.startViewTransition`; it does not ship a Next.js
 * router integration. The native browser API is the load-bearing surface
 * here, used directly so the transition spans the cross-route navigation.
 */

const VIEW_TRANSITION_PREFIX = 'project-';

export function ProjectRow({ slug, index }: { slug: string; index: number }) {
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const motionAllowed = !reduced;
  const href = `/projects/${slug}`;

  const titleStyle: CSSProperties | undefined = motionAllowed
    ? { viewTransitionName: `${VIEW_TRANSITION_PREFIX}${slug}` }
    : undefined;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // Honour modifier keys and middle-click so users opening in a new tab keep
    // the default browser behaviour. Only intercept primary, unmodified clicks.
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

    if (prefersReducedMotion()) {
      // Reduced-motion: instant navigation, no morph. Let the Link navigate.
      return;
    }

    const startViewTransition = (
      document as Document & {
        startViewTransition?: (callback: () => void | Promise<void>) => unknown;
      }
    ).startViewTransition;

    if (typeof startViewTransition !== 'function') {
      // Older browsers without View Transitions API: also instant nav.
      return;
    }

    event.preventDefault();
    startViewTransition(() => {
      router.push(href);
    });
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className="flex items-baseline gap-md text-fg-primary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-sm"
    >
      <span className="text-fg-muted font-mono text-sm">{String(index + 1).padStart(2, '0')}</span>
      <span data-project-row-title style={titleStyle}>
        {slug}
      </span>
    </Link>
  );
}
