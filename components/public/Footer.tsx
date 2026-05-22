import type { Footer as FooterType, Person } from '../../lib/schema';
import { ContactForm } from './ContactForm';

// The <footer> element is not given aria-labelledby because Biome's
// useAriaPropsSupportedByRole rejects it on the implicit contentinfo
// role and contentinfo is unique per page, so screen readers locate it
// by role alone.

const ARROW_NE = String.fromCodePoint(0x2197);

export function Footer({
  footer,
  person,
  hidden,
}: {
  footer: FooterType;
  person: Pick<Person, 'email' | 'github' | 'linkedin' | 'phone' | 'cvUrl'>;
  /**
   * Slice #47: per-section visibility flag. The public-site read path
   * does not pass this prop today (the Footer is always shown on the
   * canonical site), but the future preview pane will so the operator
   * can hide the contact block while iterating on copy without
   * scrolling past it.
   */
  hidden?: boolean;
}) {
  if (hidden) return null;
  const cvFilename = person.cvUrl.split('/').pop() || undefined;
  return (
    <footer id="contact" className="footer">
      <div className="reveal">
        <div className="eyebrow footer-eyebrow">- {footer.availability}</div>
        <div className="big">
          <span>
            Let&rsquo;s <em>talk</em>.
          </span>
          <a href={`mailto:${person.email}`}>
            {ARROW_NE} {person.email}
          </a>
        </div>
        <p className="footer-copy">{footer.copy}</p>
      </div>
      <div className="footer-actions reveal">
        <a className="btn-primary" href={person.cvUrl} download={cvFilename} data-magnetic>
          <span>Download CV (PDF)</span>
          <svg
            aria-hidden="true"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          >
            <path d="M7 2v8M3.5 6.5L7 10l3.5-3.5M2.5 12h9" />
          </svg>
        </a>
        <a
          className="btn-ghost"
          href={person.github}
          target="_blank"
          rel="noopener noreferrer me"
          data-magnetic
        >
          <span>GitHub</span>
          <span aria-hidden="true">{ARROW_NE}</span>
        </a>
        <a
          className="btn-ghost"
          href={person.linkedin}
          target="_blank"
          rel="noopener noreferrer me"
          data-magnetic
        >
          <span>LinkedIn</span>
          <span aria-hidden="true">{ARROW_NE}</span>
        </a>
      </div>
      {/* Phase 10 slice #58: contact form lives behind a "Show contact
          form" pill so the form is not on first paint. The pill expands
          in place into a Turnstile-gated form; submission lands in
          slice #59, server-side verification in slice #60. The
          wrapper sits below `.footer-actions` so the expanded form
          gets its own row rather than disrupting the action pills'
          wrap layout. */}
      <div className="contact-form-shell reveal">
        <ContactForm />
      </div>
      <div className="foot-row">
        <span>{footer.copyright}</span>
        <span>{person.phone}</span>
        <a href={`mailto:${person.email}`}>{person.email}</a>
        <span>v6.0</span>
      </div>
    </footer>
  );
}
