'use client';

/**
 * DragList, Phase 7 slice #44.
 *
 * Generic dnd-kit wrapper over a vertical list. Items are addressed by
 * `id`; the wrapper renders inside a single `DndContext` with both a
 * `PointerSensor` (pointer + touch) and a `KeyboardSensor` so the list is
 * fully keyboard-operable: focus the drag handle, press Space to pick up,
 * arrow keys to move, Space to drop, Escape to cancel.
 *
 * Why dnd-kit and not the design's HTML5-drag pattern: the handoff
 * (`design_handoff_portfolio/design/admin/admin-shared.jsx` lines 189 to
 * 211, `useDragReorder`) hangs the reorder on `onDragStart` / `onDragOver`
 * / `onDrop`, which is opaque to keyboards and screen readers. Dnd-kit's
 * `KeyboardSensor` plus `sortableKeyboardCoordinates` gives the same UX
 * with a real a11y contract; the deviation is documented in the slice's
 * PR body.
 *
 * Announcements: dnd-kit ships a default `screenReaderInstructions` and
 * `announcements` config that announces "Picked up draggable item N",
 * "Draggable item moved to position M", and "Draggable item dropped" via
 * an aria-live region. We pass a `getItemLabel` prop so the announcements
 * read the project title rather than the slug.
 *
 * The wrapper's surface stays narrow: it renders a single `<ol>` with the
 * design's `.item-list` class, and delegates each row's DOM to the
 * `renderItem` render-prop. Each row receives a `dragHandleProps` object
 * the caller spreads onto whatever element should be the keyboard- and
 * pointer-reachable handle (the `:: ` glyph in the design).
 */

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export type DragListItem = {
  id: string;
};

export type DragHandleProps = {
  /** Spread onto the handle element. Provides the listeners and aria-roledescription. */
  attributes: HTMLAttributes<HTMLElement> & { [key: `data-${string}`]: string | undefined };
  listeners: HTMLAttributes<HTMLElement> | undefined;
  ref: (node: HTMLElement | null) => void;
};

export type DragListRenderItemArgs<T extends DragListItem> = {
  item: T;
  index: number;
  isDragging: boolean;
  /** Spread onto the row container so dnd-kit can apply transform + transition. */
  containerProps: {
    ref: (node: HTMLElement | null) => void;
    style: CSSProperties;
    className: string;
  };
  /** Spread onto the keyboard- and pointer-reachable handle. */
  handleProps: DragHandleProps;
};

export type DragListProps<T extends DragListItem> = {
  items: readonly T[];
  /** Fired with the full new order of ids when the operator drops. The
   *  parent is responsible for persisting the order; the wrapper does not
   *  manage state because the source-of-truth list lives in the editor's
   *  draft. */
  onReorder: (orderedIds: string[]) => void;
  renderItem: (args: DragListRenderItemArgs<T>) => ReactNode;
  /** Reads the human-readable label dnd-kit announces over the live region.
   *  Defaults to the item's id. */
  getItemLabel?: (item: T) => string;
  /** Optional accessible label for the list. */
  ariaLabel?: string;
};

/**
 * Internal sortable row. Owns the dnd-kit `useSortable` hook and forwards
 * the bag of props the parent's `renderItem` needs. Splitting the row out
 * of the wrapper means the hook runs once per row, which is the contract
 * `useSortable` expects.
 */
function SortableRow<T extends DragListItem>({
  item,
  index,
  renderItem,
  itemClassName,
}: {
  item: T;
  index: number;
  renderItem: DragListProps<T>['renderItem'];
  itemClassName: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    setActivatorNodeRef,
  } = useSortable({ id: item.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <>
      {renderItem({
        item,
        index,
        isDragging,
        containerProps: {
          ref: setNodeRef,
          style,
          className: `${itemClassName}${isDragging ? ' dragging' : ''}`,
        },
        handleProps: {
          attributes: {
            ...attributes,
            'aria-roledescription': 'sortable',
          },
          listeners,
          ref: setActivatorNodeRef,
        },
      })}
    </>
  );
}

export function DragList<T extends DragListItem>({
  items,
  onReorder,
  renderItem,
  getItemLabel,
  ariaLabel,
}: DragListProps<T>) {
  const sensors = useSensors(
    // 4px activation distance keeps a click-on-row from firing a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = items.map((item) => item.id);

  const announcements = {
    onDragStart({ active }: { active: { id: string | number } }): string {
      const item = items.find((candidate) => candidate.id === String(active.id));
      const label = item ? (getItemLabel?.(item) ?? item.id) : String(active.id);
      return `Picked up project ${label}.`;
    },
    onDragOver({
      active,
      over,
    }: {
      active: { id: string | number };
      over: { id: string | number } | null;
    }): string | undefined {
      if (!over) return undefined;
      const overItem = items.find((candidate) => candidate.id === String(over.id));
      const label = overItem ? (getItemLabel?.(overItem) ?? overItem.id) : String(over.id);
      const activeItem = items.find((candidate) => candidate.id === String(active.id));
      const activeLabel = activeItem
        ? (getItemLabel?.(activeItem) ?? activeItem.id)
        : String(active.id);
      return `Project ${activeLabel} is now over ${label}.`;
    },
    onDragEnd({
      active,
      over,
    }: {
      active: { id: string | number };
      over: { id: string | number } | null;
    }): string {
      const activeItem = items.find((candidate) => candidate.id === String(active.id));
      const activeLabel = activeItem
        ? (getItemLabel?.(activeItem) ?? activeItem.id)
        : String(active.id);
      if (!over) return `Project ${activeLabel} dropped, no change.`;
      const overItem = items.find((candidate) => candidate.id === String(over.id));
      const overLabel = overItem ? (getItemLabel?.(overItem) ?? overItem.id) : String(over.id);
      return `Project ${activeLabel} dropped onto ${overLabel}.`;
    },
    onDragCancel({ active }: { active: { id: string | number } }): string {
      const item = items.find((candidate) => candidate.id === String(active.id));
      const label = item ? (getItemLabel?.(item) ?? item.id) : String(active.id);
      return `Reorder of project ${label} cancelled.`;
    },
  };

  function handleDragEnd(event: DragEndEvent): void {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = ids.slice();
    const [moved] = next.splice(oldIndex, 1);
    if (moved === undefined) return;
    next.splice(newIndex, 0, moved);
    onReorder(next);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'To pick up a draggable item, press space or enter. While dragging, use the arrow keys to move the item. Press space or enter again to drop the item in its new position, or press escape to cancel.',
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ol className="item-list" aria-label={ariaLabel}>
          {items.map((item, index) => (
            <SortableRow
              key={item.id}
              item={item}
              index={index}
              renderItem={renderItem}
              itemClassName="item-card"
            />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
