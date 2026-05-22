import type { AiPractice as AiPracticeType } from '../../lib/schema';

export function AiPractice({ ai, hidden }: { ai: AiPracticeType; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <section id="ai" aria-labelledby="ai-practice-heading">
      <div className="section-head reveal">
        <div className="num">04 / {ai.eyebrow}</div>
        <h2
          id="ai-practice-heading"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: headline carries inline <em> by design (project-scope.md "preserve <em> semantics in headline"). Source is content/site.json under repo control; the schema refines U+2014 and emoji at parse time. No untrusted input reaches here.
          dangerouslySetInnerHTML={{ __html: ai.headline }}
        />
      </div>
      <div className="ai-block reveal">
        <p className="ai-intro">{ai.intro}</p>

        <div className="ai-pillars">
          {ai.pillars.map((pillar) => (
            <div className="ai-pillar" key={pillar.title}>
              <span className="ai-pillar-n">{pillar.n}</span>
              <h4>{pillar.title}</h4>
              <p>{pillar.body}</p>
            </div>
          ))}
        </div>

        <div className="ai-workflow">
          <div className="ai-workflow-label">- Workflow</div>
          <div className="ai-workflow-grid">
            {ai.workflow.map((item, index) => (
              <div className="ai-flow-step" key={item.k}>
                <div className="ai-flow-num">{String(index + 1).padStart(2, '0')}</div>
                <div className="ai-flow-k">{item.k}</div>
                <div className="ai-flow-v">{item.v}</div>
                {index < ai.workflow.length - 1 ? (
                  <div className="ai-flow-arrow" aria-hidden="true">
                    {'→'}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
