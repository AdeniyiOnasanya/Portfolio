import type { Experience as ExperienceType } from '../../lib/schema';

export function Experience({ experience }: { experience: ExperienceType }) {
  return (
    <section id="cv" aria-labelledby="experience-heading" className="py-2xl">
      <p className="text-fg-muted tracking-eyebrow text-xs uppercase font-mono">03 / CV</p>
      <h2
        id="experience-heading"
        className="font-serif tracking-display text-3xl md:text-4xl mt-xs"
      >
        Experience
      </h2>
      <ol className="mt-lg space-y-xl">
        {experience.map((entry) => (
          <li key={`${entry.company}-${entry.when}`} className="space-y-xs">
            <div className="flex flex-wrap items-baseline gap-x-md">
              <h3 className="font-serif text-xl">
                {entry.role}
                <span className="text-fg-muted">, {entry.company}</span>
              </h3>
              <span className="text-fg-muted text-sm font-mono">{entry.when}</span>
            </div>
            <p className="text-fg-muted text-sm">{entry.where}</p>
            <p className="text-fg-secondary leading-relaxed max-w-prose">{entry.desc}</p>
            <ul className="flex flex-wrap gap-xs text-xs font-mono text-fg-muted">
              {entry.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
