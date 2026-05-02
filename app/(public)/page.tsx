import { About } from '../../components/public/About';
import { AiPractice } from '../../components/public/AiPractice';
import { Experience } from '../../components/public/Experience';
import { Footer } from '../../components/public/Footer';
import { Hero } from '../../components/public/Hero';
import { Projects } from '../../components/public/Projects';
import { Skills } from '../../components/public/Skills';
import { loadSite } from '../../lib/content';

export default async function HomePage() {
  const site = await loadSite();
  const { person, skills, experience, aiPractice, projects, footer, settings } = site;
  const { visibility } = settings;

  return (
    <>
      <Hero person={person} />
      {visibility.about ? <About longBio={person.longBio} /> : null}
      {visibility.skills ? <Skills skills={skills} /> : null}
      {visibility.experience ? <Experience experience={experience} /> : null}
      {visibility.ai ? <AiPractice ai={aiPractice} /> : null}
      {visibility.work ? <Projects projects={projects} /> : null}
      <Footer footer={footer} person={person} />
    </>
  );
}
