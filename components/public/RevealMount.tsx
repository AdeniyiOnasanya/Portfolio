'use client';

import { useReveal } from '../../lib/motion/useReveal';

/*
 * Mount point for the global reveal-on-scroll observer.
 *
 * Pure side-effect component: calls `useReveal()` once and renders
 * nothing. Lives in the public layout (`app/(public)/layout.tsx`) so it
 * exists exactly once across every public route. Keeping the layout a
 * server component while still installing client effects requires this
 * tiny client island; the rest of the layout stays SSR-safe.
 */
export function RevealMount(): null {
  useReveal();
  return null;
}
