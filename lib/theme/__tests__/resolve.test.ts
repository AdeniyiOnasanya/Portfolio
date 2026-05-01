import { describe, expect, it } from 'vitest';
import { isThemeMode, nextMode, resolveTheme, THEME_MODES } from '../resolve';

describe('resolveTheme', () => {
  it('returns mode system and effective null when no inputs are provided', () => {
    expect(resolveTheme()).toEqual({ mode: 'system', effective: null });
  });

  it('honours an explicit dark cookie regardless of the client hint', () => {
    expect(resolveTheme({ cookieValue: 'dark', clientHint: 'light' })).toEqual({
      mode: 'dark',
      effective: 'dark',
    });
  });

  it('honours an explicit light cookie regardless of the client hint', () => {
    expect(resolveTheme({ cookieValue: 'light', clientHint: 'dark' })).toEqual({
      mode: 'light',
      effective: 'light',
    });
  });

  it('falls back to the dark client hint when the cookie is system', () => {
    expect(resolveTheme({ cookieValue: 'system', clientHint: 'dark' })).toEqual({
      mode: 'system',
      effective: 'dark',
    });
  });

  it('falls back to the light client hint when the cookie is system', () => {
    expect(resolveTheme({ cookieValue: 'system', clientHint: 'light' })).toEqual({
      mode: 'system',
      effective: 'light',
    });
  });

  it('returns effective null when no cookie and no client hint, so CSS @media decides', () => {
    expect(resolveTheme({})).toEqual({ mode: 'system', effective: null });
  });

  it('treats a garbage cookie value as system', () => {
    expect(resolveTheme({ cookieValue: 'turquoise', clientHint: 'dark' })).toEqual({
      mode: 'system',
      effective: 'dark',
    });
  });

  it('ignores an unknown client hint', () => {
    expect(resolveTheme({ cookieValue: 'system', clientHint: 'sepia' })).toEqual({
      mode: 'system',
      effective: null,
    });
  });
});

describe('isThemeMode', () => {
  it('accepts the three valid modes', () => {
    expect(isThemeMode('system')).toBe(true);
    expect(isThemeMode('dark')).toBe(true);
    expect(isThemeMode('light')).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isThemeMode('')).toBe(false);
    expect(isThemeMode(undefined)).toBe(false);
    expect(isThemeMode(null)).toBe(false);
    expect(isThemeMode(42)).toBe(false);
  });
});

describe('nextMode', () => {
  it('cycles system -> dark -> light -> system', () => {
    expect(nextMode('system')).toBe('dark');
    expect(nextMode('dark')).toBe('light');
    expect(nextMode('light')).toBe('system');
  });

  it('matches the canonical order', () => {
    expect(THEME_MODES).toEqual(['system', 'dark', 'light']);
  });
});
