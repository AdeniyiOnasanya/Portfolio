import Link from 'next/link';
import type { Projects as ProjectsType } from '../../lib/schema';

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
            <Link
              href={`/projects/${slug}`}
              className="flex items-baseline gap-md text-fg-primary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-sm"
            >
              <span className="text-fg-muted font-mono text-sm">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>{slug}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
