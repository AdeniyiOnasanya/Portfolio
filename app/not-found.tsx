import Link from 'next/link';
import { Footer } from '../components/public/Footer';
import { ThemeToggle } from '../components/shared/ThemeToggle';
import { loadSite } from '../lib/content';

// Next.js 16 root not-found rule: app/not-found.tsx renders inside the root
// layout (app/layout.tsx) and bypasses the (public) route group layout. To
// keep the brand chrome consistent with the rest of the public surface, this
// page mirrors the header pattern in app/(public)/layout.tsx and reuses the
// public Footer component directly. Footer needs the schema-driven footer
// slice and a subset of person fields, so loadSite() is awaited here.
export default async function RootNotFound() {
  const site = await loadSite();
  const { person, footer } = site;

  return (
    <div className="min-h-screen px-md mx-auto" style={{ maxWidth: 'var(--max-width-content)' }}>
      <header className="flex items-center justify-between pt-lg">
        <p className="text-fg-muted tracking-eyebrow text-xs uppercase">DO / 2026</p>
        <ThemeToggle />
      </header>
      <main>
        <section aria-labelledby="not-found-heading" className="pt-3xl pb-2xl">
          <p className="text-fg-muted tracking-eyebrow text-xs uppercase">404</p>
          <h1
            id="not-found-heading"
            className="font-serif tracking-display leading-tight mt-md text-5xl md:text-6xl"
          >
            Page not found
          </h1>
          <p className="text-fg-secondary text-lg leading-relaxed mt-lg max-w-prose">
            That address is not part of this site. Head back to the home page to find the work, the
            writing, and the contact lines.
          </p>
          <p className="mt-xl">
            <Link
              href="/"
              className="text-fg-primary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-sm"
            >
              Back to home
            </Link>
          </p>
        </section>
      </main>
      <Footer footer={footer} person={person} />
    </div>
  );
}
