'use client';

import type { ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';

/**
 * Modal is the admin's confirm/discard/publish-result dialog primitive.
 * Mirrors design_handoff_portfolio/design/admin/admin-shared.jsx lines 171
 * to 188 and the styling at design_handoff_portfolio/design/admin.css
 * lines 299 to 319 (`.modal-mask`, `.modal`, `.modal h3`, `.modal p`,
 * `.modal .row`).
 *
 * The DOM shape stays verbatim with the design (a fixed mask + a centred
 * card + an action row). On top of the design we add the a11y wiring the
 * design file did not explicitly call for: `role="dialog"` and
 * `aria-modal="true"` on the card, `aria-labelledby` pointing at the
 * heading, focus moves into the card on mount, and the trigger element
 * receives focus back on close. The mask is a real `<button>` with an
 * accessible "Close dialog" name so a click and a Space/Enter both work
 * for keyboard users; Escape also invokes `onClose`. These are
 * reduced-motion safe (no animation is required for the modal itself).
 */

export type ModalProps = {
  /** Title rendered as the dialog heading. Used to derive
   *  `aria-labelledby`. */
  title: string;
  children?: ReactNode;
  /** Action row, typically two buttons (cancel + confirm). */
  actions?: ReactNode;
  /** Accessible name for the mask close button. Localised here so the
   *  string can be customised per surface without mutating the primitive. */
  closeLabel?: string;
  onClose: () => void;
};

export function Modal({
  title,
  children,
  actions,
  closeLabel = 'Close dialog',
  onClose,
}: ModalProps) {
  const titleId = useId();
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    // Move focus into the dialog so screen readers and keyboard users land
    // on the heading rather than staying behind the mask. Focusing the card
    // (which is `tabIndex={-1}`) is the cheapest correct behaviour and
    // matches the design's modal feel without dragging in a focus-trap
    // dependency that the rest of the surface does not need yet.
    cardRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="modal-mask">
      <button
        type="button"
        className="modal-mask-close"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        ref={cardRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h3 id={titleId}>{title}</h3>
        {children}
        {actions ? <div className="row">{actions}</div> : null}
      </div>
    </div>
  );
}
