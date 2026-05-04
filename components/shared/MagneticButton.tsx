'use client';

import { type ReactNode, useEffect, useRef } from 'react';
import { usePointerFine, usePrefersReducedMotion } from '../../lib/motion/preferences';

/*
 * MagneticButton: a wrapper that adds a hover-triggered magnetic pull to a
 * child interactive element (typically a primary <a> or <button>).
 *
 * Disabled paths (no listeners attached, child rendered unchanged with
 * `data-magnet="off"` for integration tests):
 *   - User has `prefers-reduced-motion: reduce`.
 *   - Primary input is coarse (touch). Magnetic pull on tap has no value
 *     and risks fighting the browser's native touch handling.
 *
 * Active path (`data-magnet="on"`):
 *   - Wraps the child in an inline-block span that owns a `mousemove` and
 *     `mouseleave` listener.
 *   - On mousemove, computes the displacement as a small fraction of the
 *     cursor offset relative to the wrapper centre and applies it to the
 *     child via `transform: translate3d()` directly on the DOM node.
 *     No React state, one rAF in flight at a time.
 *   - On mouseleave, animates back to (0,0) with a CSS ease-out.
 *
 * Spring strength and damping are tuned by eye against the design handoff
 * (see implementation-plan.md, Phase 5: "TDD does not apply to magnetic
 * spring constant"). The defaults below feel right at button-sized
 * targets; if a caller needs a different feel, expose a prop later rather
 * than premature configurability.
 */

const STRENGTH = 0.3;
const RETURN_TRANSITION = 'transform var(--duration-base, 240ms) var(--ease-out, ease-out)';
const ACTIVE_TRANSITION = 'transform 80ms linear';

export interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  /**
   * Strength of the magnetic pull as a fraction of the cursor offset from
   * the wrapper centre. Default 0.3 feels right for primary buttons.
   */
  strength?: number;
}

export function MagneticButton({ children, className, strength = STRENGTH }: MagneticButtonProps) {
  const reduced = usePrefersReducedMotion();
  const fine = usePointerFine();
  const wrapperRef = useRef<HTMLSpanElement | null>(null);
  const childRef = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const enabled = fine && !reduced;

  useEffect(() => {
    if (!enabled) return;

    const wrapper = wrapperRef.current;
    if (wrapper === null) return;

    // Find the first element child to translate. The wrapper itself stays
    // put so the layout box does not shift under hover; only the visual
    // content moves.
    const child = wrapper.firstElementChild as HTMLElement | null;
    if (child === null) return;
    childRef.current = child;

    child.style.willChange = 'transform';
    child.style.transition = RETURN_TRANSITION;

    const apply = () => {
      rafRef.current = null;
      const node = childRef.current;
      if (node === null) return;
      const { x, y } = targetRef.current;
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const onMove = (event: MouseEvent) => {
      const rect = wrapper.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      targetRef.current = {
        x: (event.clientX - cx) * strength,
        y: (event.clientY - cy) * strength,
      };
      // Active phase uses a short linear transition so the pull tracks the
      // cursor without waiting on the longer ease-out used for return.
      child.style.transition = ACTIVE_TRANSITION;
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(apply);
      }
    };

    const onLeave = () => {
      targetRef.current = { x: 0, y: 0 };
      child.style.transition = RETURN_TRANSITION;
      if (rafRef.current === null) {
        rafRef.current = window.requestAnimationFrame(apply);
      }
    };

    wrapper.addEventListener('mousemove', onMove);
    wrapper.addEventListener('mouseleave', onLeave);

    return () => {
      wrapper.removeEventListener('mousemove', onMove);
      wrapper.removeEventListener('mouseleave', onLeave);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      // Reset inline styles so a remount (e.g. when reduced-motion flips
      // on) does not leave a stale transform on the child.
      child.style.transform = '';
      child.style.transition = '';
      child.style.willChange = '';
    };
  }, [enabled, strength]);

  if (!enabled) {
    // Zero-overhead fallback: render the child unchanged inside a
    // transparent inline wrapper that carries the disabled marker for
    // integration tests and design QA. No effect runs, no listeners.
    return (
      <span data-magnet="off" className={className} ref={wrapperRef}>
        {children}
      </span>
    );
  }

  return (
    <span data-magnet="on" className={className} ref={wrapperRef}>
      {children}
    </span>
  );
}
