import type { ReactNode } from 'react';
import { CinematicIntro } from '../../components/public/CinematicIntro';
import { RevealMount } from '../../components/public/RevealMount';
import { CommandPalette } from '../../components/shared/CommandPalette';
import { CustomCursor } from '../../components/shared/CustomCursor';
import { Grain } from '../../components/shared/Grain';
import { ThemeToggle } from '../../components/shared/ThemeToggle';
import { loadSite } from '../../lib/content';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const site = await loadSite();
  return (
    <div className="min-h-screen px-md mx-auto" style={{ maxWidth: 'var(--max-width-content)' }}>
      <Grain />
      <CinematicIntro />
      <CustomCursor />
      <RevealMount />
      <header className="flex items-center justify-between pt-lg">
        <p className="text-fg-muted tracking-eyebrow text-xs uppercase">DO / 2026</p>
        <ThemeToggle />
      </header>
      <main>{children}</main>
      <CommandPalette site={site} />
    </div>
  );
}
