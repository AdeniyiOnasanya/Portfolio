'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  type EffectiveTheme,
  nextMode,
  THEME_COOKIE_NAME,
  type ThemeMode,
} from '../../lib/theme/resolve';

interface ThemeContextValue {
  mode: ThemeMode;
  effective: EffectiveTheme;
  cycle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) {
    throw new Error('useTheme must be used inside <ThemeProvider>.');
  }
  return ctx;
}

interface ThemeProviderProps {
  initialMode: ThemeMode;
  initialEffective: EffectiveTheme;
  children: ReactNode;
}

export function ThemeProvider({ initialMode, initialEffective, children }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const [effective, setEffective] = useState<EffectiveTheme>(initialEffective);

  useEffect(() => {
    if (mode !== 'system') {
      setEffective(mode);
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      setEffective(mq.matches ? 'dark' : 'light');
    };
    apply();
    mq.addEventListener('change', apply);
    return () => {
      mq.removeEventListener('change', apply);
    };
  }, [mode]);

  useEffect(() => {
    const html = document.documentElement;
    if (mode === 'system') {
      html.removeAttribute('data-theme');
    } else {
      html.setAttribute('data-theme', mode);
    }
  }, [mode]);

  const cycle = useCallback(() => {
    setMode((current) => {
      const next = nextMode(current);
      const oneYear = 60 * 60 * 24 * 365;
      // biome-ignore lint/suspicious/noDocumentCookie: cookieStore is not yet supported in Firefox or in happy-dom (test env). The same string is read on the server via next/headers cookies(), so the simpler API is preferred here. Revisit when cookieStore lands across the matrix.
      document.cookie = `${THEME_COOKIE_NAME}=${next}; path=/; max-age=${oneYear}; SameSite=Lax`;
      return next;
    });
  }, []);

  const value = useMemo(() => ({ mode, effective, cycle }), [mode, effective, cycle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
