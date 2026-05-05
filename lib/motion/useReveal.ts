'use client';

import { useEffect } from 'react';
import { prefersReducedMotion } from './preferences';

/*
 * Global reveal-on-scroll hook.
 *
 * Mirrors the design handoff (`design_handoff_portfolio/design/shared.jsx`
 * lines 99-152): a single IntersectionObserver watches every `.reveal` and
 * `.line-mask` element on the page and applies the `.in` class on entry. A
 * MutationObserver picks up nodes inserted after mount (e.g. when the
 * cinematic intro hands off to the main content). A debounced `resize`
 * listener re-runs the scan in case layout shifts pull elements into view.
 *
 * Reduced-motion contract: when `prefers-reduced-motion: reduce` is set,
 * the hook short-circuits and applies `.in` to every observed node up
 * front. Content stays visible without animation. The CSS in
 * `app/globals.css` zeros the transition under reduced-motion through the
 * duration tokens, so this hook does not need to know about the timing.
 *
 * SSR contract: the hook is only meaningful on the client. The
 * `<RevealMount>` component (`components/public/RevealMount.tsx`) is
 * marked `'use client'` and renders `null`; mounting it inside the public
 * layout server component does not break SSR for any other surface.
 *
 * Coexists with `<Reveal>` (`components/shared/Reveal.tsx`). Both APIs are
 * supported; the wrapper component is kept for surfaces that prefer the
 * per-element pattern.
 */

const SELECTOR = '.reveal, .line-mask';
const RESIZE_DEBOUNCE_MS = 150;

const REVEAL_OBSERVER_OPTIONS: IntersectionObserverInit = {
  threshold: 0.08,
  rootMargin: '0px 0px -5% 0px',
};

function applyInClass(target: Element): void {
  if (!target.classList.contains('in')) {
    target.classList.add('in');
  }
}

export function useReveal(): void {
  useEffect(() => {
    const reduced = prefersReducedMotion();

    // Reduced-motion fast path: mark every existing and any future reveal
    // node visible. We still install a MutationObserver so nodes inserted
    // later (cinematic intro -> main content swap) get the class too.
    if (reduced) {
      const applyAll = (root: ParentNode): void => {
        const nodes = root.querySelectorAll(SELECTOR);
        nodes.forEach(applyInClass);
      };
      applyAll(document);
      const mo = new MutationObserver((mutations) => {
        for (const m of mutations) {
          m.addedNodes.forEach((node) => {
            if (node.nodeType !== 1) return;
            const el = node as Element;
            if (el.matches(SELECTOR)) applyInClass(el);
            applyAll(el);
          });
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
      return () => {
        mo.disconnect();
      };
    }

    // No-IO fallback: if IntersectionObserver is missing (very old runtime
    // or a test harness without the polyfill), reveal everything so content
    // stays accessible. Mirrors the `<Reveal>` wrapper's fallback.
    if (typeof IntersectionObserver === 'undefined') {
      document.querySelectorAll(SELECTOR).forEach(applyInClass);
      return;
    }

    const seen = new WeakSet<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          applyInClass(entry.target);
          io.unobserve(entry.target);
        }
      }
    }, REVEAL_OBSERVER_OPTIONS);

    const observe = (root: ParentNode): void => {
      const els = root.querySelectorAll(SELECTOR);
      els.forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        // Skip nodes that were already revealed (e.g. by a previous mount
        // or a parent's reduced-motion fast path). The MutationObserver
        // must not stomp existing `.in` state.
        if (el.classList.contains('in')) return;
        io.observe(el);
        // Force a check on mount for elements already in the viewport. The
        // double rAF lets the entry transition apply before the class
        // toggle so users still see the move on first paint.
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => applyInClass(el));
          });
          io.unobserve(el);
        }
      });
    };

    observe(document);

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          const el = node as Element;
          // The element itself may match the selector; observe it directly.
          if (el.matches(SELECTOR)) {
            if (seen.has(el)) return;
            seen.add(el);
            if (!el.classList.contains('in')) {
              io.observe(el);
            }
          }
          // And any reveal descendants of the inserted subtree.
          observe(el);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = (): void => {
      if (resizeTimer !== null) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        observe(document);
      }, RESIZE_DEBOUNCE_MS);
    };
    window.addEventListener('resize', onResize);

    return () => {
      io.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', onResize);
      if (resizeTimer !== null) clearTimeout(resizeTimer);
    };
  }, []);
}
