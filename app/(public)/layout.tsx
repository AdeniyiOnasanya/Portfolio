import type { ReactNode } from 'react';
import { CinematicIntro } from '../../components/public/CinematicIntro';
import { Nav } from '../../components/public/Nav';
import { RevealMount } from '../../components/public/RevealMount';
import { CommandPalette } from '../../components/shared/CommandPalette';
import { CustomCursor } from '../../components/shared/CustomCursor';
import { Grain } from '../../components/shared/Grain';
import { loadSite } from '../../lib/content';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const site = await loadSite();
  return (
    <div className="min-h-screen">
      <Grain />
      <CinematicIntro person={site.person} />
      <CustomCursor />
      <RevealMount />
      <Nav person={site.person} />
      <main className="container">{children}</main>
      <CommandPalette site={site} />
    </div>
  );
}
