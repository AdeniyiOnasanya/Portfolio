'use client';

/**
 * ProjectsEditor, Phase 7 slice #44.
 *
 * Mirrors `design_handoff_portfolio/design/admin/admin-projects.jsx` lines
 * 10 to 113 (`ProjectsEditor`): the section header, help-panel copy, item
 * list with drag handle, and add-row button. The handoff uses HTML5 drag
 * events via the inline `useDragReorder` hook
 * (admin-shared.jsx lines 189 to 211); this slice swaps that for dnd-kit
 * so the list is keyboard-operable. The visual contract is preserved:
 * same `.editor-section`, `.help-panel`, `.item-list`, `.item-card`,
 * `.drag`, `.item-meta`, and `.item-title` class names from
 * `design_handoff_portfolio/design/admin.css` lines 234 to 260 and 370 to
 * 379.
 *
 * Server-side renumber: drag only mutates order. The new order is sent to
 * `reorderProjectsAction` which applies the order, renumbers `n` per
 * index, and writes the draft. The client then displays the renumbered
 * list returned by the action so the row's `n` cell stays in sync without
 * a refetch.
 *
 * Add and delete (the lower buttons in the design) are intentionally out
 * of scope for slice #44; the slice ships the drag-reorder + persistence
 * + renumber. Per-row deep editing lands in slice #45 onward.
 */

import { useCallback, useState, useTransition } from 'react';
import { reorderProjectsAction, saveDraftAction } from '@/lib/draft/actions';
import type { ProjectDraft } from '@/lib/draft/projects';
import { DragList } from './DragList';
import { VisibilityToggle } from './VisibilityToggle';

export type ProjectsEditorProps = {
  initialProjects: ProjectDraft[];
  initialUpdatedAt: string | null;
  /**
   * Initial value of the per-section `hidden` flag from the persisted
   * draft. Default `false`. Slice #47 wires this through; toggling
   * persists alongside the project list via `saveDraftAction` so the
   * stored blob keeps the order, the renumbered `n`, and the visibility
   * flag in one shape.
   */
  initialHidden?: boolean;
};

function formatStatus(updatedAt: string | null, isPending: boolean): string {
  if (isPending) return 'Saving order';
  if (!updatedAt) return 'No draft saved yet';
  const stamp = new Date(updatedAt);
  if (Number.isNaN(stamp.getTime())) return 'Draft saved';
  const time = stamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `Order saved at ${time}`;
}

export function ProjectsEditor({
  initialProjects,
  initialUpdatedAt,
  initialHidden = false,
}: ProjectsEditorProps) {
  const [projects, setProjects] = useState<ProjectDraft[]>(initialProjects);
  const [hidden, setHidden] = useState<boolean>(initialHidden);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialUpdatedAt);
  const [isPending, startTransition] = useTransition();

  const items = projects.map((project) => ({ ...project, id: project.slug }));

  const handleVisibilityChange = useCallback(
    (nextOn: boolean) => {
      const nextHidden = !nextOn;
      setHidden(nextHidden);
      // Snapshot the current order alongside the flag so a toggle does
      // not blow away the renumbered list. The publish-time validator
      // re-reads this shape; the wire format mirrors `ProjectsDraft`
      // with `hidden` appended.
      const snapshot = { projects, hidden: nextHidden };
      startTransition(async () => {
        const result = await saveDraftAction('projects', snapshot);
        if (result.ok) {
          setUpdatedAt(result.updatedAt);
        }
      });
    },
    [projects],
  );

  const handleReorder = useCallback((orderedIds: string[]) => {
    // Optimistic local reorder so the UI commits immediately; the
    // server renumber lands a moment later and rewrites `n`.
    setProjects((prev) => {
      const bySlug = new Map(prev.map((project) => [project.slug, project]));
      const next: ProjectDraft[] = [];
      for (const id of orderedIds) {
        const project = bySlug.get(id);
        if (project) next.push(project);
      }
      for (const project of prev) {
        if (!orderedIds.includes(project.slug)) next.push(project);
      }
      return next;
    });

    startTransition(async () => {
      const result = await reorderProjectsAction(orderedIds);
      if (result.ok) {
        setProjects(result.projects);
        setUpdatedAt(result.updatedAt);
      }
    });
  }, []);

  return (
    <div className="editor-section">
      <div className="head">
        <div>
          <div className="section-ribbon">
            <span className="bar" aria-hidden="true" />
            SECTION 06
          </div>
          <h2>Projects</h2>
        </div>
        <span className="autosave-status" data-testid="autosave-status">
          {formatStatus(updatedAt, isPending)}
        </span>
      </div>

      <VisibilityToggle
        id="projects-visible"
        label="Show on site"
        sub="Section visible on public preview"
        on={!hidden}
        onChange={handleVisibilityChange}
      />

      <div className="help-panel">
        <b>Drag</b> the handle to reorder, the list number updates automatically. Use Space to pick
        up a row with the keyboard, the arrow keys to move it, and Space again to drop.
      </div>

      <DragList
        items={items}
        onReorder={handleReorder}
        ariaLabel="Projects, drag to reorder"
        getItemLabel={(item) => item.title ?? item.slug}
        renderItem={({ item, containerProps, handleProps }) => (
          <li
            ref={containerProps.ref}
            style={containerProps.style}
            className={containerProps.className}
            data-testid="project-row"
            data-slug={item.slug}
          >
            <div className="item-head">
              <button
                type="button"
                className="drag"
                title="Drag to reorder"
                aria-label={`Reorder ${item.title ?? item.slug}`}
                ref={handleProps.ref}
                {...handleProps.attributes}
                {...handleProps.listeners}
              >
                ::
              </button>
              <span className="item-meta" style={{ width: 32 }}>
                {item.n}
              </span>
              <div className="item-title">
                <b>{item.title ?? item.slug}</b>
                {item.subtitle ? (
                  <span className="item-meta"> &middot; {item.subtitle}</span>
                ) : null}
              </div>
              {item.year ? <span className="item-meta">{item.year}</span> : null}
              {item.kind ? <span className="item-meta">{item.kind}</span> : null}
            </div>
          </li>
        )}
      />
    </div>
  );
}
