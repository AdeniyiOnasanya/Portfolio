import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { fraunces, geist, jetbrainsMono } from '../lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'David Onasanya',
  description: 'Portfolio. Work in progress.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${geist.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
