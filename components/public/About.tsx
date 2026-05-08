import type { Person } from '../../lib/schema';

export function About({ person, hidden }: { person: Person; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <section id="about" aria-label="About">
      <div className="section-head reveal">
        <div className="num">01 / About</div>
        <h2>
          I build the <em>thing</em>,<br />
          and the thing <em>around</em> it.
        </h2>
      </div>
      <div className="about-grid reveal">
        <div className="label">- Statement</div>
        <p>{person.statement}</p>
        <div className="narrow">
          {person.longBio.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
