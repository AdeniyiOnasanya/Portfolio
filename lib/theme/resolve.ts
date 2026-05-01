export type ThemeMode = 'system' | 'dark' | 'light';
export type EffectiveTheme = 'dark' | 'light';

export const THEME_COOKIE_NAME = 'theme';
export const THEME_MODES = ['system', 'dark', 'light'] as const satisfies readonly ThemeMode[];

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'dark' || value === 'light';
}

export interface ResolveInput {
  cookieValue?: string | null | undefined;
  clientHint?: string | null | undefined;
}

export interface ResolvedTheme {
  mode: ThemeMode;
  effective: EffectiveTheme | null;
}

export function resolveTheme(input: ResolveInput = {}): ResolvedTheme {
  const cookie = input.cookieValue ?? null;
  const mode: ThemeMode = isThemeMode(cookie) ? cookie : 'system';

  if (mode === 'dark' || mode === 'light') {
    return { mode, effective: mode };
  }

  const hint = input.clientHint ?? null;
  if (hint === 'dark' || hint === 'light') {
    return { mode, effective: hint };
  }

  return { mode, effective: null };
}

export function nextMode(current: ThemeMode): ThemeMode {
  const i = THEME_MODES.indexOf(current);
  const next = THEME_MODES[(i + 1) % THEME_MODES.length];
  // The modulo guarantees a defined element; assert it for the noUncheckedIndexedAccess flag.
  if (next === undefined) {
    throw new Error('Unreachable: THEME_MODES is non-empty.');
  }
  return next;
}
