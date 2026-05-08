import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * ProjectsEditor tests, Phase 7 slice #44.
 *
 * The contract this test pins:
 *  - hydrates from `initialProjects` and renders a row per project in
 *    the supplied order, each with the design's class names
 *    (.item-card, .item-head, .drag, .item-meta, .item-title);
 *  - on a reorder, calls `reorderProjectsAction` with the new slug order;
 *  - after the action returns the renumbered list, the rows display the
 *    new contiguous `n` values (01, 02, 03 ...).
 *
 * The action is mocked at module level. The keyboard pickup-move-drop
 * sequence on the dnd-kit handle is partially emulated by happy-dom; we
 * exercise the wrapper's reorder pathway directly by calling the
 * `DragList`'s `onReorder` callback through a re-export, so the test
 * stays decoupled from dnd-kit's pointer / keyboard internals (the
 * a11y contract on those is asserted in DragList.test.tsx).
 */

const reorderProjectsActionMock = vi.fn();

vi.mock('@/lib/draft/actions', () => ({
  reorderProjectsAction: (...args: unknown[]) => reorderProjectsActionMock(...args),
  // Re-declare saveDraftAction to keep the mocked module's surface
  // honest. ProjectsEditor only calls reorderProjectsAction.
  saveDraftAction: vi.fn(),
}));

// Replace DragList with a stub that renders rows and exposes the
// onReorder callback as a button so the test can drive the reorder
// without touching dnd-kit's internals. The structural contract (rows
// hydrate from initialProjects, the editor calls reorderProjectsAction
// with the new id-order, the renumbered list comes back from the action)
// is what slice #44 ships.
vi.mock('../DragList', () => ({
  DragList: <T extends { id: string }>({
    items,
    onReorder,
    renderItem,
  }: {
    items: readonly T[];
    onReorder: (ids: string[]) => void;
    renderItem: (args: {
      item: T;
      index: number;
      isDragging: boolean;
      containerProps: { ref: () => void; style: object; className: string };
      handleProps: {
        attributes: Record<string, unknown>;
        listeners: undefined;
        ref: () => void;
      };
    }) => unknown;
  }) => {
    return (
      <>
        <button
          type="button"
          data-testid="reorder-trigger"
          onClick={() => onReorder(items.map((item) => item.id).reverse())}
        >
          reverse
        </button>
        <ol data-testid="stub-list">
          {items.map((item, index) =>
            renderItem({
              item,
              index,
              isDragging: false,
              containerProps: {
                ref: () => {},
                style: {},
                className: 'item-card',
              },
              handleProps: {
                attributes: { 'aria-roledescription': 'sortable' },
                listeners: undefined,
                ref: () => {},
              },
            }),
          )}
        </ol>
      </>
    );
  },
}));

afterEach(() => {
  reorderProjectsActionMock.mockReset();
});

async function loadEditor() {
  const mod = await import('../ProjectsEditor');
  return mod.ProjectsEditor;
}

const seed = (slugs: string[]) =>
  slugs.map((slug, index) => ({
    slug,
    n: String(index + 1).padStart(2, '0'),
    title: `Title ${slug}`,
    subtitle: `Sub ${slug}`,
    year: '2024',
    kind: 'Web app',
  }));

describe('<ProjectsEditor />', () => {
  it('renders the section header and the help-panel copy', async () => {
    const ProjectsEditor = await loadEditor();
    render(<ProjectsEditor initialProjects={seed(['a', 'b'])} initialUpdatedAt={null} />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('SECTION 06')).toBeInTheDocument();
    // Help panel mentions both pointer and keyboard interactions.
    expect(screen.getByText(/Drag/i)).toBeInTheDocument();
    expect(screen.getByText(/Space to pick up/i)).toBeInTheDocument();
  });

  it('hydrates one row per initial project, with the design class names', async () => {
    const ProjectsEditor = await loadEditor();
    const { container } = render(
      <ProjectsEditor initialProjects={seed(['a', 'b', 'c'])} initialUpdatedAt={null} />,
    );
    const rows = container.querySelectorAll('[data-testid="project-row"]');
    expect(rows).toHaveLength(3);
    expect(rows[0]?.querySelector('.item-head')).not.toBeNull();
    expect(rows[0]?.querySelector('.drag')).not.toBeNull();
    expect(rows[0]?.querySelector('.item-title')).not.toBeNull();
    // n values come from the seed and stay until the server renumbers.
    const metas = container.querySelectorAll('[data-testid="project-row"] .item-meta');
    const numberCells = Array.from(metas).filter((node) => /^\d{2}$/.test(node.textContent ?? ''));
    expect(numberCells.map((cell) => cell.textContent)).toEqual(['01', '02', '03']);
  });

  it('calls reorderProjectsAction with the new slug order on reorder', async () => {
    reorderProjectsActionMock.mockResolvedValue({
      ok: true,
      updatedAt: new Date('2026-05-07T13:00:00Z').toISOString(),
      projects: seed(['c', 'b', 'a']),
    });
    const ProjectsEditor = await loadEditor();
    render(<ProjectsEditor initialProjects={seed(['a', 'b', 'c'])} initialUpdatedAt={null} />);

    await act(async () => {
      screen.getByTestId('reorder-trigger').click();
    });

    expect(reorderProjectsActionMock).toHaveBeenCalledTimes(1);
    expect(reorderProjectsActionMock).toHaveBeenCalledWith(['c', 'b', 'a']);
  });

  it('updates the visible n values after the action returns the renumbered list', async () => {
    reorderProjectsActionMock.mockResolvedValue({
      ok: true,
      updatedAt: new Date('2026-05-07T13:00:00Z').toISOString(),
      projects: [
        { slug: 'c', n: '01', title: 'Title c' },
        { slug: 'b', n: '02', title: 'Title b' },
        { slug: 'a', n: '03', title: 'Title a' },
      ],
    });
    const ProjectsEditor = await loadEditor();
    const { container } = render(
      <ProjectsEditor initialProjects={seed(['a', 'b', 'c'])} initialUpdatedAt={null} />,
    );

    await act(async () => {
      screen.getByTestId('reorder-trigger').click();
    });

    const rows = container.querySelectorAll('[data-testid="project-row"]');
    const slugOrder = Array.from(rows).map((row) => row.getAttribute('data-slug'));
    expect(slugOrder).toEqual(['c', 'b', 'a']);
    const numberCells = Array.from(
      container.querySelectorAll('[data-testid="project-row"] .item-meta'),
    ).filter((cell) => /^\d{2}$/.test(cell.textContent ?? ''));
    expect(numberCells.map((cell) => cell.textContent)).toEqual(['01', '02', '03']);
  });

  it('shows the saved-at status after the action resolves', async () => {
    const stamp = new Date('2026-05-07T12:34:00Z');
    reorderProjectsActionMock.mockResolvedValue({
      ok: true,
      updatedAt: stamp.toISOString(),
      projects: seed(['a', 'b']),
    });
    const ProjectsEditor = await loadEditor();
    render(<ProjectsEditor initialProjects={seed(['a', 'b'])} initialUpdatedAt={null} />);

    await act(async () => {
      screen.getByTestId('reorder-trigger').click();
    });

    const status = screen.getByTestId('autosave-status');
    expect(status.textContent).toMatch(/Order saved at/);

    cleanup();
  });
});
