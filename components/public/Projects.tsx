import type { Projects as ProjectsType } from '../../lib/schema';
import { ProjectRow } from './ProjectRow';

export function Projects({ projects }: { projects: ProjectsType }) {
  return (
    <section id="work" aria-labelledby="projects-heading" className="py-2xl">
      <p className="text-fg-muted tracking-eyebrow text-xs uppercase font-mono">
        05 / Selected work
      </p>
      <h2 id="projects-heading" className="font-serif tracking-display text-3xl md:text-4xl mt-xs">
        Selected work
      </h2>
      <ol className="mt-lg space-y-sm">
        {projects.map((slug, index) => (
          <li key={slug}>
            <ProjectRow slug={slug} index={index} />
          </li>
        ))}
      </ol>
    </section>
  );
}
