import type { Project } from '../../lib/schema';
import { ProjectsIndex } from './ProjectsIndex';

export function Projects({ projects, hidden }: { projects: Project[]; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <section id="work" aria-label="Selected work">
      <div className="section-head reveal">
        <div className="num">05 / Selected work</div>
        <h2>
          Seven things
          <br />
          I&apos;m <em>proud</em> of.
        </h2>
      </div>
      <ProjectsIndex projects={projects} />
    </section>
  );
}
