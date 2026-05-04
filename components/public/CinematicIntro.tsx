'use client';

import { useEffect, useState } from 'react';
import { hasSeenIntro, markIntroSeen } from '../../lib/intro/seenStorage';
import { prefersReducedMotion } from '../../lib/motion/preferences';

/*
 * CinematicIntro
 *
 * First-visit overlay that animates the brand wordmark over the home page,
 * then dismisses itself and marks the visit so the same browser skips the
 * intro on every subsequent navigation.
 *
 * Skip conditions, both checked synchronously on mount before paint:
 *   1. The user has set `prefers-reduced-motion: reduce` at the OS level.
 *      No flash, no transition, the component returns null.
 *   2. The user has already seen the intro in this browser
 *      (`localStorage['intro:seen'] === '1'`). Same null return.
 *
 * The visual layer is a fixed-position overlay that fades out on completion.
 * The inner wordmark carries a stable `data-view-transition` hook so a
 * future slice (project-row to case-study morph, Phase 5 slice 6) can
 * target it from CSS via `view-transition-name` once the morph wires up.
 * The `react-view-transitions` library is installed in this slice so later
 * slices can adopt its hook without re-querying the registry.
 *
 * Reduced-motion is verified by manual sweep: with DevTools Rendering set
 * to `prefers-reduced-motion: reduce`, no overlay element renders on first
 * visit. The unit-tested contract (the `prefersReducedMotion()` and
 * `hasSeenIntro()` gates) covers the logic; the visual feel itself is
 * tuned by eye against the design handoff.
 */

const FADE_OUT_MS = 400;
const HOLD_MS = 700;

export function CinematicIntro() {
  const [phase, setPhase] = useState<'gate' | 'enter' | 'exit' | 'done'>('gate');

  useEffect(() => {
    if (prefersReducedMotion() || hasSeenIntro()) {
      setPhase('done');
      return;
    }

    setPhase('enter');

    const enterTimer = window.setTimeout(() => {
      setPhase('exit');
    }, HOLD_MS);

    const exitTimer = window.setTimeout(() => {
      setPhase('done');
      markIntroSeen();
    }, HOLD_MS + FADE_OUT_MS);

    return () => {
      window.clearTimeout(enterTimer);
      window.clearTimeout(exitTimer);
    };
  }, []);

  if (phase === 'gate' || phase === 'done') {
    return null;
  }

  const isExiting = phase === 'exit';

  return (
    <div
      aria-hidden="true"
      data-intro-phase={phase}
      style={{
        position: 'fixed',
        inset: 0,
        // Mirrors --z-modal in tokens.css (100). Inlined as a number because
        // React's CSSProperties does not accept var() expressions for zIndex
        // in our typings configuration; the token is stable and changes here
        // would propagate via a single tokens.css edit.
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-surface-canvas)',
        opacity: isExiting ? 0 : 1,
        transition: `opacity ${FADE_OUT_MS}ms var(--ease-out)`,
        pointerEvents: isExiting ? 'none' : 'auto',
      }}
    >
      <span
        data-view-transition="cinematic-intro-wordmark"
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'var(--text-display-hero)',
          letterSpacing: 'var(--tracking-display)',
          color: 'var(--color-text-primary)',
          transform: isExiting ? 'translate3d(0, -8px, 0)' : 'translate3d(0, 0, 0)',
          transition: `transform ${FADE_OUT_MS}ms var(--ease-out)`,
        }}
      >
        David Onasanya
      </span>
    </div>
  );
}
