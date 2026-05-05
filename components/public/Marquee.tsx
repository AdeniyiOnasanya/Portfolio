'use client';

import { usePrefersReducedMotion } from '../../lib/motion/preferences';

/*
 * Horizontal marquee for short text items (skill pills today, room for other
 * lists later). Renders nothing for an empty list so consumers do not need a
 * conditional wrapper. Reduced-motion takes the static fork: a flex-wrap row
 * with no transform and no animation, with `data-state="frozen"` so RTL can
 * assert. Otherwise the track is doubled up and translated from 0 to -50% by
 * the `marquee-scroll` keyframe in `app/globals.css`; the second copy is
 * marked `aria-hidden` so screen readers do not announce items twice, and is
 * what makes the loop look seamless once the first copy scrolls past.
 *
 * Speed is tuned by eye in the keyframe duration; this component owns the
 * structure, not the timing. The wrapper is `aria-hidden` by default because
 * marquees are decorative; consumers that want it announced can pass an
 * `ariaLabel`, which switches the wrapper to a labelled region.
 */

interface MarqueeProps {
  items: string[];
  ariaLabel?: string;
  className?: string;
}

export function Marquee({ items, ariaLabel, className }: MarqueeProps) {
  const reduced = usePrefersReducedMotion();

  if (items.length === 0) {
    return null;
  }

  const wrapperClass = ['marquee', className].filter(Boolean).join(' ');
  const ariaProps = ariaLabel
    ? { 'aria-label': ariaLabel, role: 'region' as const }
    : { 'aria-hidden': true };

  if (reduced) {
    return (
      <div className={wrapperClass} data-state="frozen" {...ariaProps}>
        <div className="marquee-static">
          {items.map((item) => (
            <span key={item} className="marquee-item">
              {item}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={wrapperClass} data-state="running" {...ariaProps}>
      <div className="marquee-track">
        {items.map((item) => (
          <span key={`a-${item}`} className="marquee-item">
            {item}
          </span>
        ))}
        <span className="marquee-copy" aria-hidden="true">
          {items.map((item) => (
            <span key={`b-${item}`} className="marquee-item">
              {item}
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
