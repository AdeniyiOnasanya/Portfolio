'use client';

import type { ThemeMode } from '../../lib/theme/resolve';
import { useTheme } from './ThemeProvider';

const LABELS: Record<ThemeMode, string> = {
  system: 'System',
  dark: 'Dark',
  light: 'Light',
};

export function ThemeToggle() {
  const { mode, cycle } = useTheme();
  const label = LABELS[mode];

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Theme: ${label}. Click to change.`}
      data-theme-mode={mode}
      className="border border-border rounded-md px-md py-xs text-sm font-mono text-fg-secondary hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors"
      style={{ transitionDuration: 'var(--duration-fast)' }}
    >
      {label}
    </button>
  );
}
