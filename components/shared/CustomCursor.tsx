'use client';

import { useEffect, useRef } from 'react';
import { usePointerFine, usePrefersReducedMotion } from '../../lib/motion/preferences';

/*
 * CustomCursor: dot + ring follower, mirrors the design handoff
 * (design_handoff_portfolio/design/shared.jsx#CustomCursor and styles.css
 * .cursor-dot/.cursor-ring/.cursor-hover).
 *
 * Two elements:
 *   - `.cursor-dot` tracks the pointer 1:1 via `mousemove`.
 *   - `.cursor-ring` lags behind via a continuous `requestAnimationFrame`
 *     loop with a constant 0.18 interpolation factor per frame. The lag is
 *     the visual signature of the cursor.
 *
 * Hover interaction: when the pointer is over `a`, `button`, `.project-row`,
 * or any element marked `[data-cursor-hover]`, the body gets a `cursor-hover`
 * class. CSS in app/globals.css inflates the ring and collapses the dot.
 *
 * Skip conditions, both gated through the keystone Phase 5 helpers:
 *   1. `prefers-reduced-motion: reduce` is set at the OS level.
 *   2. The active pointer is not `(pointer: fine)` (touch, stylus, etc.).
 *
 * In either case the component returns null and removes any state it set
 * on `<html>` or `<body>`. The CSS also hides both elements on viewports
 * below 900px as a visual safety net.
 *
 * Render-loop discipline: the rAF tick runs continuously while the cursor
 * is active (the ring's lag depends on per-frame interpolation, not on
 * pointer events). Both DOM updates write directly to `style.transform` on
 * refs; React only re-renders when the gating hooks flip.
 */

const HOVER_SELECTOR = 'a, button, .project-row, [data-cursor-hover]';
const RING_INTERPOLATION = 0.18;

export function CustomCursor() {
  const reduced = usePrefersReducedMotion();
  const fine = usePointerFine();
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  const active = !reduced && fine;

  useEffect(() => {
    if (!active) {
      return;
    }

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (dot === null || ring === null) {
      return;
    }

    const root = document.documentElement;
    root.setAttribute('data-custom-cursor', '');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    const onMove = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
    };

    const onOver = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      if (target.closest(HOVER_SELECTOR) !== null) {
        document.body.classList.add('cursor-hover');
      } else {
        document.body.classList.remove('cursor-hover');
      }
    };

    let frame = window.requestAnimationFrame(function tick() {
      ringX += (mouseX - ringX) * RING_INTERPOLATION;
      ringY += (mouseY - ringY) * RING_INTERPOLATION;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      frame = window.requestAnimationFrame(tick);
    });

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseover', onOver);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseover', onOver);
      window.cancelAnimationFrame(frame);
      root.removeAttribute('data-custom-cursor');
      document.body.classList.remove('cursor-hover');
    };
  }, [active]);

  if (!active) {
    return null;
  }

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
    </>
  );
}
