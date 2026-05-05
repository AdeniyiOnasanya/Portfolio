import type { Person } from '../../lib/schema';

export function About({ longBio }: { longBio: Person['longBio'] }) {
  return (
    <section id="about" aria-labelledby="about-heading" className="py-2xl">
      <p className="text-fg-muted tracking-eyebrow text-xs uppercase font-mono">01 / About</p>
      <h2 id="about-heading" className="font-serif tracking-display text-3xl md:text-4xl mt-xs">
        About
      </h2>
      <div className="mt-lg space-y-md max-w-prose">
        {longBio.map((paragraph) => (
          <p key={paragraph} className="text-fg-secondary leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
