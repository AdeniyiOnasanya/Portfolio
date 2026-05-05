import type { Hero as HeroType, Person, Skills as SkillsType } from '../../lib/schema';
import { MagneticButton } from '../shared/MagneticButton';
import { Marquee } from './Marquee';

const btnPrimaryClass =
  'inline-flex items-center gap-2 px-lg py-sm rounded-full border border-fg-primary bg-fg-primary text-bg font-mono uppercase tracking-eyebrow text-xs hover:bg-accent hover:text-bg hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-colors';

const btnGhostClass =
  'inline-flex items-center gap-2 px-lg py-sm rounded-full border border-border text-fg-primary font-mono uppercase tracking-eyebrow text-xs hover:bg-fg-primary hover:text-bg hover:border-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg transition-colors';

export function Hero({
  person,
  hero,
  skills,
}: {
  person: Person;
  hero: HeroType;
  skills: SkillsType;
}) {
  const cvFilename = person.cvUrl.split('/').pop() || undefined;
  const stackLabels = skills.flatMap((g) => g.items);
  const { firstWord, restWord } = splitName(person.name, person.nameAccent);
  return (
    <section id="home" aria-labelledby="hero-heading" className="hero pt-3xl pb-2xl">
      <div className="hero-meta-row">
        {hero.meta.map((label) => (
          <span key={label} className="hero-meta-pill">
            {label}
          </span>
        ))}
      </div>

      <h1
        id="hero-heading"
        className="font-serif tracking-display leading-tight mt-md text-5xl md:text-6xl lg:text-7xl"
      >
        <span className="line-mask">
          <span>{firstWord}</span>
        </span>
        <span className="line-mask">
          <span>
            <em className="text-accent not-italic">{restWord}</em>
          </span>
        </span>
      </h1>

      <div className="hero-sub-row mt-2xl grid gap-xl md:grid-cols-2">
        <p className="reveal text-fg-secondary text-lg leading-relaxed max-w-prose">
          {person.statement}
        </p>
        <dl className="hero-stats grid grid-cols-3 gap-lg text-right">
          {hero.stats.map((stat) => (
            <div key={stat.label} className="hero-stat reveal">
              <dt className="text-fg-muted tracking-eyebrow text-xs uppercase font-mono">
                {stat.label}
              </dt>
              <dd className="hero-stat-value font-serif italic text-accent text-4xl md:text-5xl mt-xs">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="hero-actions reveal mt-xl flex flex-wrap gap-sm">
        <MagneticButton>
          <a href={person.cvUrl} download={cvFilename} className={btnPrimaryClass} data-magnetic>
            <span>Download CV</span>
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
        </MagneticButton>
        <MagneticButton>
          <a
            href={person.github}
            target="_blank"
            rel="noreferrer noopener"
            className={btnGhostClass}
            data-magnetic
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.34c-2.22.48-2.69-1.07-2.69-1.07-.36-.93-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.13 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.11.16 1.93.08 2.13.51.56.82 1.27.82 2.15 0 3.07-1.87 3.74-3.65 3.94.29.25.54.74.54 1.5v2.22c0 .21.15.46.55.38A8 8 0 0 0 8 0z" />
            </svg>
            <span>GitHub</span>
          </a>
        </MagneticButton>
        <MagneticButton>
          <a
            href={person.linkedin}
            target="_blank"
            rel="noreferrer noopener"
            className={btnGhostClass}
            data-magnetic
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.6 0H2.4A2.4 2.4 0 0 0 0 2.4v11.2A2.4 2.4 0 0 0 2.4 16h11.2a2.4 2.4 0 0 0 2.4-2.4V2.4A2.4 2.4 0 0 0 13.6 0zM4.8 13.6H2.4V6h2.4v7.6zM3.6 5a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8zm10 8.6h-2.4V9.7c0-.9 0-2.1-1.3-2.1s-1.5 1-1.5 2v4H6V6h2.3v1c.3-.6 1.1-1.2 2.3-1.2 2.4 0 2.9 1.6 2.9 3.6v4.2z" />
            </svg>
            <span>LinkedIn</span>
          </a>
        </MagneticButton>
        <MagneticButton>
          <a href={`mailto:${person.email}`} className={btnGhostClass} data-magnetic>
            <svg
              aria-hidden="true"
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            >
              <rect x="1.5" y="3" width="11" height="8" rx="1" />
              <path d="M1.5 4l5.5 4 5.5-4" />
            </svg>
            <span>Email</span>
          </a>
        </MagneticButton>
      </div>

      <div className="mt-2xl">
        <Marquee items={stackLabels} ariaLabel="Stack" />
      </div>
    </section>
  );
}

function splitName(name: string, accent: string | undefined) {
  if (accent !== undefined) {
    const idx = name.indexOf(accent);
    if (idx >= 0) {
      const before = name.slice(0, idx).trim();
      return { firstWord: before, restWord: accent };
    }
  }
  const space = name.indexOf(' ');
  if (space < 0) {
    return { firstWord: name, restWord: '' };
  }
  return { firstWord: name.slice(0, space), restWord: name.slice(space + 1) };
}
