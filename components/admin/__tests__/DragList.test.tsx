import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DragList } from '../DragList';

/*
 * DragList tests, Phase 7 slice #44.
 *
 * The contract this test pins:
 *  - DragList renders one row per item, in the order it received them;
 *  - each row exposes a keyboard-reachable handle that carries
 *    `aria-roledescription="sortable"` (dnd-kit's announcer reads it);
 *  - the handle is focusable so keyboard users can pick up the row;
 *  - on a Space-then-ArrowDown-then-Space keyboard sequence dnd-kit fires
 *    `onReorder` with the new order.
 *
 * The drag-end pathway in dnd-kit's KeyboardSensor depends on Pointer /
 * mutation observers that happy-dom emulates partially. We assert the
 * structural contract (handle attributes, focus, render order) and trust
 * dnd-kit's own test suite for the activator wiring; the higher-level
 * reorder behaviour is exercised in the ProjectsEditor test, which
 * stubs the action and asserts the new id-order reaches the server.
 */

type Item = { id: string; label: string };

function harness(items: Item[], onReorder = vi.fn<(ids: string[]) => void>()) {
  return {
    onReorder,
    ...render(
      <DragList
        items={items}
        onReorder={onReorder}
        getItemLabel={(item) => item.label}
        ariaLabel="Test list"
        renderItem={({ item, containerProps, handleProps }) => (
          <li
            ref={containerProps.ref}
            style={containerProps.style}
            className={containerProps.className}
          >
            <button
              type="button"
              ref={handleProps.ref}
              data-testid={`handle-${item.id}`}
              {...handleProps.attributes}
              {...handleProps.listeners}
            >
              handle
            </button>
            <span data-testid={`label-${item.id}`}>{item.label}</span>
          </li>
        )}
      />,
    ),
  };
}

describe('<DragList />', () => {
  it('renders one row per item in the supplied order', () => {
    harness([
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
      { id: 'c', label: 'Gamma' },
    ]);
    const labels = screen.getAllByText(/Alpha|Beta|Gamma/).map((node) => node.textContent);
    expect(labels).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('exposes a keyboard-reachable handle with aria-roledescription="sortable"', () => {
    harness([
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
    ]);
    const handle = screen.getByTestId('handle-a');
    expect(handle).toHaveAttribute('aria-roledescription', 'sortable');
    // dnd-kit's `attributes` object sets tabIndex on the activator. We
    // assert the handle is focusable rather than asserting a specific
    // tabIndex value because the value is dnd-kit's contract, not ours.
    handle.focus();
    expect(document.activeElement).toBe(handle);
  });

  it('renders an aria-labelled list', () => {
    harness([{ id: 'a', label: 'Alpha' }]);
    expect(screen.getByRole('list', { name: 'Test list' })).toBeInTheDocument();
  });

  it('does not call onReorder if the keyboard sequence cancels (Escape after Space)', () => {
    const onReorder = vi.fn<(ids: string[]) => void>();
    harness(
      [
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Beta' },
      ],
      onReorder,
    );
    const handle = screen.getByTestId('handle-a');
    handle.focus();
    fireEvent.keyDown(handle, { key: ' ', code: 'Space' });
    fireEvent.keyDown(handle, { key: 'Escape', code: 'Escape' });
    expect(onReorder).not.toHaveBeenCalled();
  });
});
