'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { hasSeenIntro, markIntroSeen } from '../../lib/intro/seenStorage';
import { prefersReducedMotion } from '../../lib/motion/preferences';
import type { Person } from '../../lib/schema';

/*
 * CinematicIntro
 *
 * Five-phase rAF-driven boot sequence that mirrors
 * design_handoff_portfolio/design/shared.jsx#Intro (lines 178-338) and the
 * intro CSS block in design_handoff_portfolio/design/styles.css. Phases are
 * sampled off a single rAF clock so the progress bar, top stamp percentage,
 * boot lines, and name reveal are always coherent: a Skip click jumps the
 * clock past every threshold rather than driving a parallel timer per element.
 *
 *   bootlines  : 0,    1400 ms : staggered console lines top-left fade in
 *   name       : 1400, 3000 ms : oversized name slides up from the bracket
 *   hold       : 3000, 4800 ms : footer metadata row fades in, name holds
 *   out        : 4800, 5400 ms : intro-out animation (fade + scale)
 *   done       : >= 5400 ms    : component returns null
 *
 * Skip paths (button click, Escape key, prefers-reduced-motion) all converge
 * on the same finish() routine so the SeenStorage gate fires exactly once
 * per visit and the visual exit always uses the same fade.
 *
 * SSR safety: the component renders a `gate` placeholder (returns null) on
 * first render so server markup is stable. The effect runs on mount and
 * either jumps straight to `done` (reduced motion or already-seen) or kicks
 * off the rAF loop. The intro-out class drives the dissolve via the
 * keyframes declared in app/globals.css.
 */

const PHASE_BOOTLINES_MS = 1400;
const PHASE_NAME_MS = 3000;
const PHASE_HOLD_MS = 4800;
const TOTAL_DUR_MS = 5400;
const OUT_FADE_MS = 600;

type Phase = 'gate' | 'bootlines' | 'name' | 'hold' | 'out' | 'done';

function phaseFromElapsed(elapsedMs: number): Exclude<Phase, 'gate' | 'done'> {
  if (elapsedMs < PHASE_BOOTLINES_MS) return 'bootlines';
  if (elapsedMs < PHASE_NAME_MS) return 'name';
  if (elapsedMs < PHASE_HOLD_MS) return 'hold';
  return 'out';
}

interface CinematicIntroProps {
  person: Pick<Person, 'role' | 'location' | 'estYear'>;
}

export function CinematicIntro({ person }: CinematicIntroProps) {
  const [phase, setPhase] = useState<Phase>('gate');
  const [progress, setProgress] = useState(0);

  // Refs survive across renders without forcing re-mounts. The rAF id ref
  // lets cleanup cancel the pending frame; the start ref pins t=0; the
  // finish ref exposes the stop routine to the Skip button click handler
  // and the Escape keydown listener so all three skip paths share one
  // implementation.
  const rafIdRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const finishedRef = useRef(false);
  const finishRef = useRef<() => void>(() => undefined);

  // Run the boot sequence exactly once. The gates (reduced motion, seen
  // before) either short-circuit to done or start the rAF loop.
  useEffect(() => {
    if (prefersReducedMotion() || hasSeenIntro()) {
      setPhase('done');
      markIntroSeen();
      return;
    }

    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      // The intro-out class fades the overlay over OUT_FADE_MS; the unmount
      // waits for the fade to land so the visual exit is not clipped.
      setPhase('out');
      window.setTimeout(() => {
        setPhase('done');
        markIntroSeen();
      }, OUT_FADE_MS);
    };
    finishRef.current = finish;

    const tick = (now: number) => {
      if (startRef.current === null) {
        startRef.current = now;
      }
      const elapsed = now - startRef.current;
      const next = Math.min(1, elapsed / TOTAL_DUR_MS);
      setProgress(next);

      if (elapsed >= PHASE_HOLD_MS) {
        finish();
        return;
      }

      setPhase(phaseFromElapsed(elapsed));
      rafIdRef.current = requestAnimationFrame(tick);
    };

    setPhase('bootlines');
    rafIdRef.current = requestAnimationFrame(tick);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        finish();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  const handleSkip = useCallback(() => {
    finishRef.current();
  }, []);

  if (phase === 'gate' || phase === 'done') {
    return null;
  }

  const isOut = phase === 'out';
  const showName = phase === 'name' || phase === 'hold' || phase === 'out';
  const showFooter = phase === 'hold' || phase === 'out';
  const percent = Math.floor(progress * 100)
    .toString()
    .padStart(2, '0');

  return (
    <div className={`intro${isOut ? ' intro-out' : ''}`} data-intro-phase={phase}>
      <button type="button" className="intro-skip" aria-label="Skip intro" onClick={handleSkip}>
        Skip
      </button>

      <div className="intro-stamp intro-stamp-l">REC, 16:9, 24fps</div>
      <div className="intro-stamp intro-stamp-r">{percent}%</div>

      <div className="intro-stage">
        <div className="intro-bootlines" aria-hidden="true">
          <BootLine show={progress > 0.02}>&gt; initialising portfolio.sys</BootLine>
          <BootLine show={progress > 0.08}>&gt; loading typeface, Fraunces v9</BootLine>
          <BootLine show={progress > 0.14}>&gt; resolving identity ....</BootLine>
          <BootLine show={progress > 0.22}>
            &gt; <span className="intro-bootline-ok">OK</span>&nbsp;&nbsp;David Onasanya
          </BootLine>
        </div>

        <div className={`intro-frame${showName ? ' is-on' : ''}`} aria-hidden="true">
          <Corner pos="tl" />
          <Corner pos="tr" />
          <Corner pos="bl" />
          <Corner pos="br" />
        </div>

        <div className="intro-name" data-view-transition="cinematic-intro-wordmark">
          <span className="intro-name-mask">
            <span className={`intro-name-row${showName ? ' is-on' : ''}`}>David</span>
          </span>
          <span className="intro-name-mask">
            <span className={`intro-name-row intro-name-row-accent${showName ? ' is-on' : ''}`}>
              Onasanya
            </span>
          </span>
        </div>

        <div className={`intro-meta${showFooter ? ' is-on' : ''}`}>
          <span>{person.role}</span>
          <span>{person.location}</span>
          <span>Est. {person.estYear}</span>
        </div>
      </div>

      <div className="intro-progress" aria-hidden="true">
        <div className="intro-progress-bar" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}

interface BootLineProps {
  show: boolean;
  children: React.ReactNode;
}

// BootLine: a single line in the top-left console reveal block. Visibility
// is driven by the rAF progress rather than a per-line setTimeout so the
// stagger is frame-accurate and Skip presses cut every line at once.
function BootLine({ show, children }: BootLineProps) {
  return <div className={`intro-line${show ? ' is-on' : ''}`}>{children}</div>;
}

type CornerPos = 'tl' | 'tr' | 'bl' | 'br';

interface CornerProps {
  pos: CornerPos;
}

// Corner: a 24px crosshair bracket pinned to one corner of the inner frame.
// Border edges are picked per position so the four corners together form
// an open square that draws focus to the centred name without enclosing it.
function Corner({ pos }: CornerProps) {
  return <span className={`intro-corner intro-corner-${pos}`} aria-hidden="true" />;
}
