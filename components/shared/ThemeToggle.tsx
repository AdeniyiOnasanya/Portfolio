'use client';

import { useTheme } from './ThemeProvider';

/*
 * Segmented theme toggle: a sun/moon pill mirroring
 * `design_handoff_portfolio/design/styles.css` `.theme-pill`. Two buttons,
 * one for dark and one for light, plus a sliding `.glide` indicator that
 * uses `mix-blend-mode: difference` to invert its colour against the live
 * theme background. Clicking either button writes that mode directly
 * (no system cycle); the design has no "system" surface, and persisting
 * the user's explicit choice into the theme cookie is the simpler model.
 *
 * The pill's `data-theme` attribute drives the glide's transform via CSS:
 * `dark` keeps the indicator at left:3px (under the moon), `light` slides
 * it 26px right (under the sun). When `mode === 'system'` we read the
 * resolved `effective` value so the indicator still tracks the visible
 * theme until the user makes an explicit choice.
 */
export function ThemeToggle() {
  const { mode, effective, setMode } = useTheme();
  const visible = mode === 'system' ? effective : mode;
  return (
    // biome-ignore lint/a11y/useSemanticElements: <fieldset> would impose its own block layout and a <legend> requirement; the pill is a tight inline group of two toggle buttons styled as a segmented control. role="group" with an aria-label gives the same accessible affordance without disturbing the visual layout.
    <div className="theme-pill" data-theme={visible} role="group" aria-label="Theme">
      <button
        type="button"
        onClick={() => setMode('dark')}
        className={visible === 'dark' ? 'active' : undefined}
        aria-label="Dark"
        aria-pressed={visible === 'dark'}
      >
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => setMode('light')}
        className={visible === 'light' ? 'active' : undefined}
        aria-label="Light"
        aria-pressed={visible === 'light'}
      >
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      </button>
      <span className="glide" aria-hidden="true" />
    </div>
  );
}
