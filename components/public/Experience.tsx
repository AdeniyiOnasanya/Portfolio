import type { Certs, Education, Experience as ExperienceType } from '../../lib/schema';

export function Experience({
  experience,
  education,
  certs,
}: {
  experience: ExperienceType;
  education: Education;
  certs: Certs;
}) {
  const primaryEducation = education[0];
  const secondaryEducation = education[1];
  if (!primaryEducation) return null;
  return (
    <section id="cv" aria-label="Experience">
      <div className="section-head reveal">
        <div className="num">03 / CV</div>
        <h2>
          Six years.
          <br />
          Three <em>chapters</em>.
        </h2>
      </div>
      <div className="exp-list">
        {experience.map((entry) => (
          <article className="exp-item reveal" key={`${entry.company}-${entry.when}`}>
            <div className="when">
              {entry.when}
              <br />
              <span className="exp-where">{entry.where}</span>
            </div>
            <div className="role">
              {entry.role}
              <span className="co">{entry.company}</span>
            </div>
            <div className="desc">
              {entry.desc}
              <div className="tags">
                {entry.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="exp-list exp-list-tail">
        <article className="exp-item reveal">
          <div className="when">Education</div>
          <div className="role">
            {primaryEducation.degree}
            <span className="co">{primaryEducation.school}</span>
          </div>
          <div className="desc">
            {primaryEducation.result}
            {secondaryEducation ? (
              <div className="exp-edu-secondary">
                <div className="exp-edu-secondary-degree">
                  {secondaryEducation.degree}
                  <span className="exp-edu-secondary-school">{secondaryEducation.school}</span>
                </div>
                <div className="exp-edu-secondary-result">{secondaryEducation.result}</div>
              </div>
            ) : null}
          </div>
        </article>
        <article className="exp-item reveal">
          <div className="when">Certifications</div>
          <div className="role">
            Cloud<span className="co">& Networking</span>
          </div>
          <div className="desc">
            <ul className="exp-cert-list">
              {certs.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </article>
      </div>
    </section>
  );
}
