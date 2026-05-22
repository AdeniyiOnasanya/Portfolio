'use client';

/**
 * VisibilityToggle is the admin shell's per-section visibility switch.
 * Mirrors design_handoff_portfolio/design/admin/admin-shared.jsx lines 92
 * to 103 (`Switch`) and the styling at
 * design_handoff_portfolio/design/admin.css lines 207 to 231 (`.toggle-row`,
 * `.switch`, `.switch.on`). The DOM is identical: a `.toggle-row` with a
 * label column and a `.switch` track that toggles the `.on` class.
 *
 * The widget is rendered as `role="switch"` with `aria-checked` reflecting
 * the value; both Space and Enter toggle. Slice #47 wires this primitive
 * into per-section visibility on the public preview; this slice ships only
 * the primitive and validates the a11y + keyboard contract.
 */
import type { KeyboardEvent } from 'react';

export type VisibilityToggleProps = {
  id?: string;
  label: string;
  /** Optional secondary description shown beneath the label. */
  sub?: string;
  on: boolean;
  onChange: (next: boolean) => void;
  /** Optional inline validation message. The toggle stays operable even
   *  when an error is present; the error renders below the row with
   *  `role="alert"` and is referenced by `aria-describedby`. */
  error?: string;
};

export function VisibilityToggle({ id, label, sub, on, onChange, error }: VisibilityToggleProps) {
  const errorId = error && id ? `${id}-error` : undefined;
  const handleKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onChange(!on);
    }
  };
  return (
    <div className={`toggle-row${error ? ' f-invalid' : ''}`}>
      <div className="label">
        <b>{label}</b>
        {sub ? <span>{sub}</span> : null}
      </div>
      <button
        type="button"
        id={id}
        className={`switch${on ? ' on' : ''}`}
        role="switch"
        aria-checked={on}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        onClick={() => onChange(!on)}
        onKeyDown={handleKey}
      />
      {error ? (
        <p className="f-error" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
