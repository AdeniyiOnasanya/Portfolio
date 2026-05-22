import type { Skills as SkillsType } from '../../lib/schema';

export function Skills({ skills, hidden }: { skills: SkillsType; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <section id="skills" aria-label="Skills">
      <div className="section-head reveal">
        <div className="num">02 / Stack</div>
        <h2>
          Tools I reach
          <br />
          for <em>without</em> thinking.
        </h2>
      </div>
      <div className="skills-grid skills-block reveal">
        <div className="label">- Categories</div>
        <div className="skills-list">
          {skills.map((cat) => (
            <div className="skill-cat" key={cat.label}>
              <div className="cat-label">{cat.label}</div>
              <ul>
                {cat.items.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
