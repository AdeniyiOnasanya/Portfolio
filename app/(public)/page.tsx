import { About } from '../../components/public/About';
import { AiPractice } from '../../components/public/AiPractice';
import { Experience } from '../../components/public/Experience';
import { Footer } from '../../components/public/Footer';
import { Hero } from '../../components/public/Hero';
import { Projects } from '../../components/public/Projects';
import { Skills } from '../../components/public/Skills';
import { loadSite } from '../../lib/content';
import { loadProjectFiles } from '../../lib/projects';
import { personJsonLd, serializeJsonLd } from '../../lib/seo/jsonld';
import { siteOrigin } from '../../lib/seo/origin';

export default async function HomePage() {
  const [site, projectFiles] = await Promise.all([loadSite(), loadProjectFiles()]);
  const projectList = projectFiles.map((f) => f.frontmatter);
  const { person, hero, skills, experience, education, certs, aiPractice, footer, settings } = site;
  const { visibility } = settings;
  const personLd = personJsonLd(person, siteOrigin());

  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be inline-rendered as text. Source is the validated person record from content/site.json; serializeJsonLd escapes < > & so a stray substring cannot close the script tag.
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(personLd) }}
      />
      <Hero person={person} hero={hero} skills={skills} />
      {visibility.about ? <About person={person} /> : null}
      {visibility.skills ? <Skills skills={skills} /> : null}
      {visibility.experience ? (
        <Experience experience={experience} education={education} certs={certs} />
      ) : null}
      {visibility.ai ? <AiPractice ai={aiPractice} /> : null}
      {visibility.work ? <Projects projects={projectList} /> : null}
      <Footer footer={footer} person={person} />
    </>
  );
}
