'use client';

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../lib/motion/preferences';

type BAData = {
  intro: string;
  beforeLabel: string;
  afterLabel: string;
};

const ARROW_DOWN = String.fromCodePoint(0x2193);
const CHEVRON_LEFT = String.fromCodePoint(0x2039);
const CHEVRON_RIGHT = String.fromCodePoint(0x203a);

/*
 * BeforeAfter
 *
 * Drag-to-compare slider mirrored from
 * `design_handoff_portfolio/design/project.jsx#BeforeAfter`. Renders two
 * stacked "panes" (a stale console-rows mock and a clean dashboard mock),
 * with the after-pane clipped via a CSS clip-path that follows the slider
 * position. A floating handle drives the position via mouse / touch.
 *
 * Reduced-motion bypass: when the live preference is reduce, the slider
 * locks at 50% (no motion) and the dragging listeners stay uninstalled.
 * The slider is decorative and the data is conveyed by the surrounding
 * intro paragraph + the before/after labels above the panes, so the
 * experience stays whole for opt-out users.
 */
export function BeforeAfter({ ba, hue }: { ba: BAData; hue: number }) {
  const [pos, setPos] = useState(50);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    function move(clientX: number): void {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const p = ((clientX - r.left) / r.width) * 100;
      setPos(Math.max(0, Math.min(100, p)));
    }
    function onMove(e: MouseEvent | TouchEvent): void {
      if (!dragging.current) return;
      const x = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
      if (typeof x === 'number') move(x);
    }
    function onUp(): void {
      dragging.current = false;
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, []);

  function onDown(event: React.MouseEvent | React.TouchEvent): void {
    if (prefersReducedMotion()) return;
    dragging.current = true;
    const x = 'touches' in event ? event.touches[0]?.clientX : (event as React.MouseEvent).clientX;
    if (typeof x !== 'number') return;
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = ((x - r.left) / r.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  }

  return (
    <div
      className="dd-ba"
      ref={wrapRef}
      onMouseDown={onDown}
      onTouchStart={onDown}
      role="slider"
      tabIndex={0}
      aria-label="Before / after comparison"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pos)}
    >
      <div className="dd-ba-pane dd-ba-before">
        <div className="dd-ba-tag">BEFORE</div>
        <BAPlaceholder mode="before" text={ba.beforeLabel} hue={hue} />
      </div>
      <div className="dd-ba-pane dd-ba-after" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
        <div className="dd-ba-tag dd-ba-tag-after" style={{ left: `calc(${pos}% + 16px)` }}>
          AFTER
        </div>
        <BAPlaceholder mode="after" text={ba.afterLabel} hue={hue} />
      </div>
      <div className="dd-ba-handle" style={{ left: `${pos}%` }}>
        <div className="dd-ba-line" />
        <div className="dd-ba-knob">
          <span>{CHEVRON_LEFT}</span>
          <span>{CHEVRON_RIGHT}</span>
        </div>
      </div>
      <div className="dd-ba-hint">drag to compare</div>
    </div>
  );
}

function BAPlaceholder({
  text,
  hue,
  mode,
}: {
  text: string;
  hue: number;
  mode: 'before' | 'after';
}) {
  if (mode === 'before') {
    return (
      <div className="dd-ba-canvas dd-ba-canvas-before">
        <div className="dd-ba-chrome">
          <span className="dot" style={{ background: '#ff5f56' }} />
          <span className="dot" style={{ background: '#ffbd2e' }} />
          <span className="dot" style={{ background: '#27c93f' }} />
          <span className="dd-ba-url">aws.console / azure.portal / billing.csv</span>
        </div>
        <div className="dd-ba-rows">
          {Array.from({ length: 14 }).map((_, i) => {
            const cellId = `i-${(0xa + i).toString(16)}f4${i}c2`;
            return (
              <div className="dd-ba-row" key={cellId}>
                <span className="dd-ba-cell">{cellId}</span>
                <span className="dd-ba-cell">us-east-1</span>
                <span className="dd-ba-cell" style={{ opacity: 0.6 }}>
                  ${(420 + i * 13).toFixed(2)}
                </span>
                <span
                  className="dd-ba-cell"
                  style={{ color: i % 4 === 0 ? '#d97a5a' : 'rgba(255,255,255,0.4)' }}
                >
                  {i % 4 === 0 ? 'OVER BUDGET' : 'ok'}
                </span>
              </div>
            );
          })}
        </div>
        <div className="dd-ba-watermark">{text}</div>
      </div>
    );
  }
  return (
    <div
      className="dd-ba-canvas dd-ba-canvas-after"
      style={{
        background: `linear-gradient(135deg, oklch(0.18 0.04 ${hue}) 0%, oklch(0.1 0.02 ${hue}) 100%)`,
      }}
    >
      <div className="dd-ba-after-grid">
        <div className="dd-ba-card big">
          <div className="dd-ba-card-l">Total cloud spend</div>
          <div className="dd-ba-card-v">
            $184.2k
            <span
              style={{
                color: 'oklch(0.78 0.18 145)',
                marginLeft: 12,
                fontSize: '0.5em',
              }}
            >
              {ARROW_DOWN} 18%
            </span>
          </div>
          <div className="dd-ba-spark">
            <svg
              viewBox="0 0 200 40"
              preserveAspectRatio="none"
              width="100%"
              height="40"
              aria-hidden="true"
            >
              <polyline
                fill="none"
                stroke={`oklch(0.78 0.18 ${hue})`}
                strokeWidth="1.5"
                points="0,30 20,28 40,32 60,22 80,24 100,18 120,20 140,12 160,14 180,8 200,10"
              />
            </svg>
          </div>
        </div>
        <div className="dd-ba-card">
          <div className="dd-ba-card-l">AWS</div>
          <div className="dd-ba-card-v small">$112.8k</div>
        </div>
        <div className="dd-ba-card">
          <div className="dd-ba-card-l">Azure</div>
          <div className="dd-ba-card-v small">$71.4k</div>
        </div>
        <div className="dd-ba-card wide">
          <div className="dd-ba-card-l">Auto-scaling rules · 14 active</div>
          <div className="dd-ba-bars">
            {[0.6, 0.4, 0.8, 0.5, 0.7, 0.3, 0.55].map((v) => (
              <div
                className="dd-ba-bar"
                key={`bar-${v}`}
                style={{
                  height: `${v * 100}%`,
                  background: `oklch(0.78 0.13 ${hue} / ${0.4 + v * 0.6})`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="dd-ba-watermark">{text}</div>
    </div>
  );
}
