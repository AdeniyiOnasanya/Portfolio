import type { Project } from '../../lib/schema';

type DeepDiveData = NonNullable<Project['deepDive']>;

export function DeepDive({ data }: { data: DeepDiveData }) {
  return (
    <section aria-labelledby="deep-dive-heading" className="py-2xl border-t border-fg-muted/20">
      <h2 id="deep-dive-heading" className="font-serif tracking-display text-3xl md:text-4xl">
        Deep dive
      </h2>

      <p className="mt-lg text-fg-secondary leading-relaxed max-w-prose">{data.metricsIntro}</p>

      <ol aria-label="Project metrics" className="mt-xl grid gap-lg md:grid-cols-2">
        {data.metrics.map((metric) => (
          <li key={metric.label} className="space-y-xs">
            <p className="font-serif text-4xl tabular-nums leading-none">
              {metric.prefix ? (
                <span className="text-fg-muted text-xl">{metric.prefix} </span>
              ) : null}
              {metric.value}
              {metric.suffix ? (
                <span className="text-fg-muted text-xl">{metric.suffix}</span>
              ) : null}
            </p>
            <p className="text-fg-primary">{metric.label}</p>
            {metric.note ? <p className="text-fg-muted text-sm">{metric.note}</p> : null}
          </li>
        ))}
      </ol>

      <section aria-labelledby="before-after-heading" className="mt-2xl">
        <h3 id="before-after-heading" className="text-fg-muted tracking-eyebrow text-xs uppercase">
          Before / after
        </h3>
        <p className="mt-xs text-fg-secondary leading-relaxed max-w-prose">
          {data.beforeAfter.intro}
        </p>
        <dl className="mt-md grid gap-md md:grid-cols-2">
          <div>
            <dt className="text-fg-muted text-sm uppercase tracking-eyebrow">Before</dt>
            <dd className="text-fg-primary mt-xs">{data.beforeAfter.beforeLabel}</dd>
          </div>
          <div>
            <dt className="text-fg-muted text-sm uppercase tracking-eyebrow">After</dt>
            <dd className="text-fg-primary mt-xs">{data.beforeAfter.afterLabel}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="process-heading" className="mt-2xl">
        <h3 id="process-heading" className="text-fg-muted tracking-eyebrow text-xs uppercase">
          Process
        </h3>
        <ol className="mt-md space-y-lg">
          {data.process.map((step) => (
            <li key={step.title}>
              <p className="font-serif text-xl">{step.title}</p>
              <p className="text-fg-secondary mt-xs leading-relaxed max-w-prose">{step.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="lessons-heading" className="mt-2xl">
        <h3 id="lessons-heading" className="text-fg-muted tracking-eyebrow text-xs uppercase">
          Lessons
        </h3>
        <ol className="mt-md space-y-lg">
          {data.lessons.map((lesson) => (
            <li key={lesson.title}>
              <p className="font-serif text-xl">{lesson.title}</p>
              <p className="text-fg-secondary mt-xs leading-relaxed max-w-prose">{lesson.body}</p>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}
