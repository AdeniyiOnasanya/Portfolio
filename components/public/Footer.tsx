import type { Footer as FooterType, Person } from '../../lib/schema';

// The <footer> element is not given aria-labelledby because Biome's
// useAriaPropsSupportedByRole rejects it on the implicit contentinfo
// role and contentinfo is unique per page, so screen readers locate it
// by role alone. Other sections still pair aria-labelledby with their
// h2 because they are <section role="region"> landmarks that need an
// accessible name to be exposed to assistive tech.

const linkClass =
  'text-fg-primary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-sm';

export function Footer({
  footer,
  person,
}: {
  footer: FooterType;
  person: Pick<Person, 'email' | 'github' | 'linkedin'>;
}) {
  return (
    <footer className="py-2xl border-t border-fg-muted/20">
      <h2 className="font-serif tracking-display text-3xl md:text-4xl">{footer.heading}</h2>
      <p className="mt-lg text-fg-secondary leading-relaxed max-w-prose">{footer.copy}</p>
      <p className="mt-md text-fg-muted tracking-eyebrow text-xs uppercase">
        {footer.availability}
      </p>
      <ul className="mt-lg flex flex-wrap gap-md text-sm">
        <li>
          <a href={`mailto:${person.email}`} className={linkClass}>
            Email
          </a>
        </li>
        <li>
          <a href={person.github} className={linkClass} rel="me">
            GitHub
          </a>
        </li>
        <li>
          <a href={person.linkedin} className={linkClass} rel="me">
            LinkedIn
          </a>
        </li>
      </ul>
      <p className="mt-xl text-fg-muted text-xs font-mono">{footer.copyright}</p>
    </footer>
  );
}
