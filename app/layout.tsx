import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import type { ReactNode } from 'react';
import { Grain } from '../components/shared/Grain';
import { ThemeProvider } from '../components/shared/ThemeProvider';
import { fraunces, geist, jetbrainsMono } from '../lib/fonts';
import { resolveTheme, THEME_COOKIE_NAME } from '../lib/theme/resolve';
import './globals.css';

export const metadata: Metadata = {
  title: 'David Onasanya',
  description: 'Portfolio. Work in progress.',
  openGraph: {
    // `/api/og` returns a 1200x630 PNG composed by `next/og` from
    // `HomeOgTemplate` (Phase 9 slice #53). The path is relative so the
    // social-card cache picks up the deployment origin automatically
    // across develop, staging, and production previews.
    images: [
      {
        url: '/api/og',
        width: 1200,
        height: 630,
        alt: 'David Onasanya, portfolio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/api/og'],
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieValue = cookieStore.get(THEME_COOKIE_NAME)?.value;
  const clientHint = headerStore.get('sec-ch-prefers-color-scheme');
  const { mode, effective } = resolveTheme({ cookieValue, clientHint });

  const dataTheme = effective ?? undefined;

  return (
    <html
      lang="en"
      data-theme={dataTheme}
      className={`${geist.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <ThemeProvider initialMode={mode} initialEffective={effective ?? 'dark'}>
          {children}
          <Grain />
        </ThemeProvider>
      </body>
    </html>
  );
}
