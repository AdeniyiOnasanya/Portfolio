import type { AiPractice as AiPracticeType } from '../../lib/schema';

export function AiPractice({ ai }: { ai: AiPracticeType }) {
  return (
    <section aria-labelledby="ai-practice-heading" className="py-2xl">
      <p className="text-fg-muted tracking-eyebrow text-xs uppercase">{ai.eyebrow}</p>
      <h2
        id="ai-practice-heading"
        className="font-serif tracking-display text-3xl md:text-4xl mt-xs"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: headline carries inline <em> by design (project-scope.md "preserve <em> semantics in headline"). Source is content/site.json under repo control; the schema refines U+2014 and emoji at parse time. No untrusted input reaches here.
        dangerouslySetInnerHTML={{ __html: ai.headline }}
      />
      <p className="mt-lg text-fg-secondary leading-relaxed max-w-prose">{ai.intro}</p>
      <ol className="mt-xl space-y-lg">
        {ai.pillars.map((pillar) => (
          <li key={pillar.title} className="flex gap-md">
            <span className="text-fg-muted font-mono text-sm pt-1">{pillar.n}</span>
            <div>
              <h3 className="font-serif text-xl">{pillar.title}</h3>
              <p className="text-fg-secondary mt-xs leading-relaxed max-w-prose">{pillar.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <dl className="mt-xl grid gap-md md:grid-cols-2">
        {ai.workflow.map((item) => (
          <div key={item.k}>
            <dt className="text-fg-muted tracking-eyebrow text-xs uppercase">{item.k}</dt>
            <dd className="text-fg-primary mt-xs">{item.v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
