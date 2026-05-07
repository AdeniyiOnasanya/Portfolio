'use client';

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

interface RevealProps {
  children: ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
  style?: CSSProperties;
}

const HIDDEN_STYLE: CSSProperties = {
  opacity: 0,
  transform: 'translate3d(0, 12px, 0)',
};

const VISIBLE_STYLE: CSSProperties = {
  opacity: 1,
  transform: 'translate3d(0, 0, 0)',
};

const TRANSITION =
  'opacity var(--duration-base) var(--ease-out), transform var(--duration-base) var(--ease-out)';

export function Reveal({
  children,
  className,
  threshold = 0.1,
  rootMargin = '0px 0px -10% 0px',
  style,
}: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState<boolean>(false);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setRevealed(true);
      return;
    }

    const node = ref.current;
    if (node === null || typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  const merged: CSSProperties = {
    transition: TRANSITION,
    willChange: revealed ? undefined : 'opacity, transform',
    ...(revealed ? VISIBLE_STYLE : HIDDEN_STYLE),
    ...style,
  };

  return (
    <div
      ref={ref}
      data-reveal={revealed ? 'visible' : 'hidden'}
      className={className}
      style={merged}
    >
      {children}
    </div>
  );
}
