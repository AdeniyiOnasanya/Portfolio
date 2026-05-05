import type { ReactNode } from 'react';
import { CinematicIntro } from '../../components/public/CinematicIntro';
import { CommandPalette } from '../../components/shared/CommandPalette';
import { CustomCursor } from '../../components/shared/CustomCursor';
import { ThemeToggle } from '../../components/shared/ThemeToggle';
import { loadSite } from '../../lib/content';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const site = await loadSite();
  return (
    <div className="min-h-screen px-md mx-auto" style={{ maxWidth: 'var(--max-width-content)' }}>
      <CinematicIntro />
      <CustomCursor />
      <header className="flex items-center justify-between pt-lg">
        <p className="text-fg-muted tracking-eyebrow text-xs uppercase">Portfolio</p>
        <ThemeToggle />
      </header>
      <main>{children}</main>
      <CommandPalette site={site} />
    </div>
  );
}
