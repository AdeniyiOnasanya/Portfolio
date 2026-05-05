'use client';

import { useEffect, useState } from 'react';

/*
 * Reduced-motion preference helpers.
 *
 * The whole Phase 5 cinema layer (intro, custom cursor, magnetic buttons,
 * marquee, palette, view transitions) gates on these two helpers. The hook
 * is for components that re-render when the OS preference flips live; the
 * non-hook variant is for one-shot reads inside event handlers and on mount
 * checks where subscribing to changes is unnecessary.
 *
 * SSR contract: both return `false` on the server. Animations are on by
 * default; we only opt out when the user has explicitly set
 * `prefers-reduced-motion: reduce`.
 */

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const POINTER_FINE_QUERY = '(pointer: fine)';

/**
 * One-shot read of the user's reduced-motion preference. Returns `false`
 * on the server (no `window`). Intended for event handlers and on-mount
 * checks; use `usePrefersReducedMotion` when the component must react to
 * a live OS toggle.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Subscribe a component to the reduced-motion media query. Returns `false`
 * during SSR and on the first client render so the markup is stable; the
 * hook flips to the live value after mount and re-flips if the user toggles
 * the OS setting while the page is open.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const apply = () => {
      setReduced(mq.matches);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
    };
  }, []);

  return reduced;
}

/**
 * Subscribe a component to the `(pointer: fine)` media query. Returns
 * `false` during SSR and on the first client render so cinema-layer
 * components (custom cursor, magnetic pull) only attach on confirmed
 * desktop pointers after mount. The hook re-flips if the user changes
 * input device class while the page is open (e.g. plugs in a mouse on a
 * convertible laptop).
 */
export function usePointerFine(): boolean {
  const [fine, setFine] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia(POINTER_FINE_QUERY);
    const apply = () => {
      setFine(mq.matches);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
    };
  }, []);

  return fine;
}
