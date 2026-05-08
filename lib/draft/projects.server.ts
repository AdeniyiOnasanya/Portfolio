import 'server-only';
import { loadProjectFiles } from '@/lib/projects';
import { isProjectsDraft, type ProjectDraft } from './projects';
import { getDraft } from './store';

/**
 * Server-only side of the projects draft surface, Phase 7 slice #44.
 *
 * Splits cleanly from the pure `projects.ts` so the renumber + reorder
 * helpers can be imported from a Node-side Vitest run without dragging
 * `server-only` (which throws when imported in client or test code) into
 * the module graph. The two write paths into the draft store both call
 * through here:
 *  - `loadProjectsDraft`: read-only, used by the page route.
 *  - `readOrSeedProjects`: returns the persisted draft, or the seed list
 *    derived from `content/projects/<slug>.mdx` when no draft exists. The
 *    server action calls this on the cold path so the first reorder is
 *    also the first write.
 */

/**
 * Loads the current projects draft from the store. If none exists, seeds
 * from MDX so the editor lands on the operator's canonical project list
 * rather than an empty surface. The seed happens server-side and is not
 * persisted; the first reorder is also the first write.
 */
export async function readOrSeedProjects(): Promise<ProjectDraft[]> {
  const row = await getDraft('projects');
  if (row && isProjectsDraft(row.content)) {
    return row.content.projects;
  }
  const files = await loadProjectFiles();
  return files.map((file, index) => ({
    slug: file.frontmatter.slug,
    n: String(index + 1).padStart(2, '0'),
    title: file.frontmatter.title,
    subtitle: file.frontmatter.subtitle,
    year: file.frontmatter.year,
    role: file.frontmatter.role,
    kind: file.frontmatter.kind,
  }));
}

/**
 * Server-only loader the page route uses to render the editor. Returns the
 * current draft if one exists; otherwise seeds from MDX so the operator
 * sees the canonical project list from the moment they open the editor.
 */
export async function loadProjectsDraft(): Promise<{
  projects: ProjectDraft[];
  updatedAt: string | null;
}> {
  const row = await getDraft('projects');
  if (row && isProjectsDraft(row.content)) {
    return {
      projects: row.content.projects,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
  const seeded = await readOrSeedProjects();
  return { projects: seeded, updatedAt: null };
}
