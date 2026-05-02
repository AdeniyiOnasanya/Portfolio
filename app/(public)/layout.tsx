import type { ReactNode } from 'react';
import { ThemeToggle } from '../../components/shared/ThemeToggle';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen px-md mx-auto" style={{ maxWidth: 'var(--max-width-content)' }}>
      <header className="flex items-center justify-between pt-lg">
        <p className="text-fg-muted tracking-eyebrow text-xs uppercase">Portfolio</p>
        <ThemeToggle />
      </header>
      <main>{children}</main>
    </div>
  );
}
