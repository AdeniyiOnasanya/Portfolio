import type { Footer as FooterType, Person } from '../../lib/schema';

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
          <a
            href={`mailto:${person.email}`}
            className="text-fg-primary hover:text-accent focus-visible:text-accent"
          >
            Email
          </a>
        </li>
        <li>
          <a
            href={person.github}
            className="text-fg-primary hover:text-accent focus-visible:text-accent"
            rel="me"
          >
            GitHub
          </a>
        </li>
        <li>
          <a
            href={person.linkedin}
            className="text-fg-primary hover:text-accent focus-visible:text-accent"
            rel="me"
          >
            LinkedIn
          </a>
        </li>
      </ul>
      <p className="mt-xl text-fg-muted text-xs font-mono">{footer.copyright}</p>
    </footer>
  );
}
