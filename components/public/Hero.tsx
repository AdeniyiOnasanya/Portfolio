import type { Person } from '../../lib/schema';

export function Hero({ person }: { person: Person }) {
  return (
    <section aria-labelledby="hero-heading" className="pt-3xl pb-2xl">
      <p className="text-fg-muted tracking-eyebrow text-xs uppercase">{person.role}</p>
      <h1
        id="hero-heading"
        className="font-serif tracking-display leading-tight mt-md text-5xl md:text-6xl"
      >
        {renderAccentedName(person.name, person.nameAccent)}
      </h1>
      <p className="text-fg-secondary text-lg leading-relaxed mt-lg max-w-prose">
        {person.statement}
      </p>
      <p className="text-fg-muted text-sm font-mono mt-md">{person.location}</p>
    </section>
  );
}

function renderAccentedName(name: string, accent: string | undefined) {
  if (!accent) {
    return name;
  }
  const index = name.indexOf(accent);
  if (index < 0) {
    return name;
  }
  const before = name.slice(0, index);
  const after = name.slice(index + accent.length);
  return (
    <>
      {before}
      <em className="text-accent not-italic">{accent}</em>
      {after}
    </>
  );
}
