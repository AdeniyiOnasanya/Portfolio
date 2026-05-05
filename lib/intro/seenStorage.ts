/*
 * localStorage gate for the cinematic intro.
 *
 * The intro plays once per browser. After it completes we mark the flag so
 * subsequent visits skip it. Both helpers are SSR-safe and tolerate the
 * Safari private-mode case where touching `localStorage` throws.
 */

const STORAGE_KEY = 'intro:seen';
const SEEN_VALUE = '1';

/**
 * Returns `true` only when the intro has run at least once in this browser.
 * Returns `false` during SSR (no `window`) and when `localStorage` is
 * unavailable or throws (Safari private mode, storage quota, disabled
 * cookies that also gate Web Storage).
 */
export function hasSeenIntro(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY) === SEEN_VALUE;
  } catch {
    return false;
  }
}

/**
 * Marks the intro as seen so future visits skip it. No-op on the server.
 * Swallows write errors so a quota-exceeded or private-mode failure does
 * not surface to the caller; the worst case is the intro plays again next
 * time, which is acceptable.
 */
export function markIntroSeen(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, SEEN_VALUE);
  } catch {
    // Intentionally swallowed; see doc comment.
  }
}
