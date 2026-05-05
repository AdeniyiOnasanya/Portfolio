import type { Skills as SkillsType } from '../../lib/schema';

export function Skills({ skills }: { skills: SkillsType }) {
  return (
    <section id="skills" aria-labelledby="skills-heading" className="py-2xl">
      <p className="text-fg-muted tracking-eyebrow text-xs uppercase font-mono">02 / Stack</p>
      <h2 id="skills-heading" className="font-serif tracking-display text-3xl md:text-4xl mt-xs">
        Skills
      </h2>
      <dl className="mt-lg grid gap-lg md:grid-cols-2">
        {skills.map((group) => (
          <div key={group.label}>
            <dt className="text-fg-muted tracking-eyebrow text-xs uppercase">{group.label}</dt>
            <dd className="text-fg-primary mt-xs">{group.items.join(', ')}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
