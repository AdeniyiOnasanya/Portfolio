'use client';

import { useEffect, useRef } from 'react';
import { usePointerFine, usePrefersReducedMotion } from '../../lib/motion/preferences';

/*
 * CustomCursor
 *
 * A small fixed-position element that follows the pointer on confirmed
 * desktop pointers. The cinema layer's cursor flourish; the rest of the
 * page reverts to the system cursor when this component is absent.
 *
 * Skip conditions, both gated through the keystone Phase 5 helpers:
 *   1. `prefers-reduced-motion: reduce` is set at the OS level. The
 *      component returns null; no cursor element, no follow logic.
 *   2. The active pointer is not `(pointer: fine)`. Touchscreens, styluses,
 *      and other coarse pointers see the system cursor and nothing else.
 *
 * Render-loop discipline: the position is written directly to the ref's
 * `.style.transform` inside a single `requestAnimationFrame` per pointer
 * move. We never call `setState` per frame; React only re-renders when
 * the gating hooks flip (reduced-motion toggled, pointer class changed).
 *
 * System-cursor hiding is opt-in via a `data-custom-cursor` attribute on
 * `<html>`; pair this attribute with a global CSS rule
 * (`[data-custom-cursor] *, [data-custom-cursor] { cursor: none; }`) so
 * the system cursor disappears only while the custom cursor is mounted.
 * The attribute is removed on unmount and on either skip-condition
 * flipping live, so the system cursor returns cleanly.
 */

const CURSOR_DIAMETER_PX = 16;

export function CustomCursor() {
  const reduced = usePrefersReducedMotion();
  const fine = usePointerFine();
  const cursorRef = useRef<HTMLDivElement | null>(null);

  const active = !reduced && fine;

  useEffect(() => {
    if (!active) {
      return;
    }

    // Set the attribute only after we have confirmed the cursor element is
    // actually in the DOM. Setting it earlier would briefly hide the system
    // cursor without providing a replacement on the rare path where the ref
    // has not been attached yet (e.g. concurrent-mode scheduling, or tests
    // that flush effects before refs).
    const node = cursorRef.current;
    if (node === null) {
      return;
    }

    const root = document.documentElement;
    root.setAttribute('data-custom-cursor', '');

    let pointerX = 0;
    let pointerY = 0;
    let frame = 0;
    let pending = false;

    const apply = () => {
      pending = false;
      node.style.transform = `translate3d(${pointerX - CURSOR_DIAMETER_PX / 2}px, ${
        pointerY - CURSOR_DIAMETER_PX / 2
      }px, 0)`;
    };

    const onMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (pending) {
        return;
      }
      pending = true;
      frame = window.requestAnimationFrame(apply);
    };

    window.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      root.removeAttribute('data-custom-cursor');
    };
  }, [active]);

  if (!active) {
    return null;
  }

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      data-custom-cursor-dot
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: CURSOR_DIAMETER_PX,
        height: CURSOR_DIAMETER_PX,
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-text-primary)',
        // Mirrors --z-modal in tokens.css (100). The cursor must float above
        // every other surface, including the cinematic intro overlay during
        // its fade-out tail.
        zIndex: 200,
        pointerEvents: 'none',
        // Initial off-screen position; the first pointermove writes the
        // real coordinates via translate3d before paint.
        transform: 'translate3d(-9999px, -9999px, 0)',
        willChange: 'transform',
        mixBlendMode: 'difference',
      }}
    />
  );
}
