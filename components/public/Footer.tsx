import type { Footer as FooterType, Person } from '../../lib/schema';

// The <footer> element is not given aria-labelledby because Biome's
// useAriaPropsSupportedByRole rejects it on the implicit contentinfo
// role and contentinfo is unique per page, so screen readers locate it
// by role alone. Other sections still pair aria-labelledby with their
// h2 because they are <section role="region"> landmarks that need an
// accessible name to be exposed to assistive tech.

const linkClass =
  'text-fg-primary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-sm';

const buttonClass =
  'inline-flex items-center gap-xs px-md py-sm border border-fg-muted/30 rounded-sm text-fg-primary hover:text-accent hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

export function Footer({
  footer,
  person,
}: {
  footer: FooterType;
  person: Pick<Person, 'email' | 'github' | 'linkedin' | 'phone' | 'cvUrl'>;
}) {
  const cvFilename = person.cvUrl.split('/').pop() || undefined;
  return (
    <footer id="contact" className="py-2xl border-t border-fg-muted/20">
      <p className="text-fg-muted tracking-eyebrow text-xs uppercase font-mono">
        - {footer.availability}
      </p>
      <div className="mt-lg flex flex-wrap items-baseline justify-between gap-md">
        <span className="font-serif tracking-display text-3xl md:text-5xl">
          Let&rsquo;s <em className="text-accent not-italic">talk</em>.
        </span>
        <a href={`mailto:${person.email}`} className={`font-mono text-sm ${linkClass}`}>
          {String.fromCharCode(0x2197)} {person.email}
        </a>
      </div>
      <p className="mt-md text-fg-secondary leading-relaxed max-w-prose">{footer.copy}</p>
      <ul className="mt-lg flex flex-wrap gap-md text-sm">
        <li>
          <a href={person.cvUrl} download={cvFilename} className={buttonClass}>
            <span>Download CV (PDF)</span>
          </a>
        </li>
        <li>
          <a
            href={person.github}
            className={buttonClass}
            target="_blank"
            rel="noopener noreferrer me"
          >
            <span>GitHub</span>
            <span aria-hidden="true">{String.fromCharCode(0x2197)}</span>
          </a>
        </li>
        <li>
          <a
            href={person.linkedin}
            className={buttonClass}
            target="_blank"
            rel="noopener noreferrer me"
          >
            <span>LinkedIn</span>
            <span aria-hidden="true">{String.fromCharCode(0x2197)}</span>
          </a>
        </li>
      </ul>
      <div className="mt-xl pt-lg border-t border-fg-muted/20 flex flex-wrap gap-md text-xs font-mono text-fg-muted">
        <span>{footer.copyright}</span>
        <span>{person.phone}</span>
        <a href={`mailto:${person.email}`} className={linkClass}>
          {person.email}
        </a>
        <span>v6.0</span>
      </div>
    </footer>
  );
}
