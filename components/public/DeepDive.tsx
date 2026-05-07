import type { Project } from '../../lib/schema';
import { BeforeAfter } from './BeforeAfter';

type DeepDiveData = NonNullable<Project['deepDive']>;

const HUE_BY_N: Record<string, number> = {
  '01': 145,
  '02': 28,
  '03': 210,
  '04': 280,
  '05': 180,
  '06': 340,
  '07': 60,
};

export function DeepDive({ data, n }: { data: DeepDiveData; n?: string }) {
  const hue = n ? (HUE_BY_N[n] ?? 145) : 145;

  return (
    <section aria-label="Deep dive">
      <section className="proj-section reveal dd-section">
        <div className="label">- Impact</div>
        <div>
          <h3>
            By the <em>numbers</em>.
          </h3>
          <p>{data.metricsIntro}</p>
          <div className="dd-metrics">
            {data.metrics.map((metric) => (
              <div className="dd-metric" key={metric.label}>
                <div className="dd-metric-v">
                  {metric.prefix ? <span className="dd-metric-pre">{metric.prefix}</span> : null}
                  <span>{metric.value}</span>
                  {metric.suffix ? <span className="dd-metric-suf">{metric.suffix}</span> : null}
                </div>
                <div className="dd-metric-l">{metric.label}</div>
                {metric.note ? <div className="dd-metric-n">{metric.note}</div> : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="proj-section reveal dd-section">
        <div className="label">- Before & After</div>
        <div>
          <h3>
            What <em>changed</em>.
          </h3>
          <p>{data.beforeAfter.intro}</p>
          <BeforeAfter ba={data.beforeAfter} hue={hue} />
        </div>
      </section>

      <section className="proj-section reveal dd-section">
        <div className="label">- Process</div>
        <div>
          <h3>
            How it <em>came together</em>.
          </h3>
          <ol className="dd-process">
            {data.process.map((step, index) => (
              <li key={step.title}>
                <div className="dd-step-n">{String(index + 1).padStart(2, '0')}</div>
                <div className="dd-step-body">
                  <div className="dd-step-t">{step.title}</div>
                  <div className="dd-step-d">{step.desc}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="proj-section reveal dd-section">
        <div className="label">- Reflections</div>
        <div>
          <h3>
            What I <em>took away</em>.
          </h3>
          <ul className="dd-lessons">
            {data.lessons.map((lesson) => (
              <li key={lesson.title}>
                <div className="dd-lesson-t">{lesson.title}</div>
                <div className="dd-lesson-d">{lesson.body}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </section>
  );
}
