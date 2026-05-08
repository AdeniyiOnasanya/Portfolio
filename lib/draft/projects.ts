/**
 * Projects draft helpers, Phase 7 slice #44.
 *
 * The file holds the pure side of the projects draft surface:
 *  - `renumberProjects` is a pure function that takes a list of project
 *    drafts and returns the same list with `n` reassigned by index. It is
 *    deliberately not bound to drag, the drag interaction only mutates
 *    order; renumber happens once on save so the wire format stays
 *    minimal. Mirrors `design_handoff_portfolio/design/admin/admin-projects.jsx`
 *    line 22 (`String(i + 1).padStart(2, "0")`).
 *  - `applyOrder` is the pure reorder primitive: given a current list and
 *    the new slug order, it returns the list re-sorted to match. Slugs in
 *    the order array that are not in the list are ignored; slugs in the
 *    list that are not in the order array are appended in their original
 *    relative order so a stale client cannot accidentally drop projects.
 *
 * The server-only side (loader, MDX seed) lives in `projects.server.ts`
 * so the pure helpers can be imported from a Node-side test without
 * dragging `server-only` into the module graph. The wire-side write
 * surface (`reorderProjectsAction`) lives in `actions.ts`.
 */

// Minimal shape of a project draft for the purposes of reorder + renumber.
// The full publish-time schema (`lib/schema.ts` ProjectSchema) is far
// stricter; the draft layer is intentionally permissive so a partial
// in-progress edit can persist without round-tripping through the publish
// validator on every keystroke.
export type ProjectDraft = {
  slug: string;
  n: string;
  title?: string;
  subtitle?: string;
  year?: string;
  role?: string;
  kind?: string;
  [key: string]: unknown;
};

export type ProjectsDraft = {
  projects: ProjectDraft[];
  hidden?: boolean;
};

/**
 * Pure: assigns `n = String(i + 1).padStart(2, '0')` per index. The function
 * never mutates the input array and never short-circuits on a missing field
 * because the drag list does not gate on data shape. Renumber is the
 * trailing edge of save, called once per write.
 */
export function renumberProjects(projects: readonly ProjectDraft[]): ProjectDraft[] {
  return projects.map((project, index) => ({
    ...project,
    n: String(index + 1).padStart(2, '0'),
  }));
}

/**
 * Pure: returns `projects` re-sorted to match `orderedSlugs`. Unknown slugs
 * in the order array are ignored. Project slugs missing from the order
 * array are preserved at the tail in their original relative order, so a
 * stale client whose order list is a subset of the current draft cannot
 * accidentally delete the missing rows. Renumber is NOT applied here;
 * `reorderProjectsAction` calls `renumberProjects` after `applyOrder` so
 * the two concerns stay independently testable.
 */
export function applyOrder(
  projects: readonly ProjectDraft[],
  orderedSlugs: readonly string[],
): ProjectDraft[] {
  const bySlug = new Map<string, ProjectDraft>();
  for (const project of projects) {
    bySlug.set(project.slug, project);
  }

  const next: ProjectDraft[] = [];
  const seen = new Set<string>();
  for (const slug of orderedSlugs) {
    if (seen.has(slug)) continue;
    const project = bySlug.get(slug);
    if (project) {
      next.push(project);
      seen.add(slug);
    }
  }
  for (const project of projects) {
    if (!seen.has(project.slug)) {
      next.push(project);
      seen.add(project.slug);
    }
  }
  return next;
}

export function isProjectDraft(value: unknown): value is ProjectDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const slug = (value as { slug?: unknown }).slug;
  const n = (value as { n?: unknown }).n;
  return typeof slug === 'string' && typeof n === 'string';
}

export function isProjectsDraft(value: unknown): value is ProjectsDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const projects = (value as { projects?: unknown }).projects;
  return Array.isArray(projects) && projects.every(isProjectDraft);
}
