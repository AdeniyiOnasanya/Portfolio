'use client';

/**
 * TextField wraps a single-line `<input>` in the shared Field primitive.
 * Mirrors design_handoff_portfolio/design/admin/admin-shared.jsx lines 65
 * to 78. The HTML class names (`.f`, `.mono`) come from
 * design_handoff_portfolio/design/admin.css lines 192 to 205. Inline Zod
 * validation errors land via the `error` prop and are surfaced inside the
 * Field wrapper next to the input, never as a global toast.
 */
import { Field } from './Field';

export type TextFieldProps = {
  id: string;
  label: string;
  /** Bound value. Treated as a controlled component; `null`/`undefined`
   *  collapse to an empty string so React does not log a controlled to
   *  uncontrolled warning when the parent has not initialised the draft
   *  yet. */
  value: string | null | undefined;
  onChange: (next: string) => void;
  hint?: string;
  /** Inline validation message produced by the parent's Zod parse. */
  error?: string;
  type?: 'text' | 'email' | 'tel' | 'url' | 'number';
  placeholder?: string;
  /** When true the input renders in monospace, matching the design's
   *  `.mono` modifier for hex codes and slugs. */
  mono?: boolean;
};

export function TextField({
  id,
  label,
  hint,
  error,
  value,
  onChange,
  type = 'text',
  placeholder,
  mono = false,
}: TextFieldProps) {
  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      renderInput={({ inputId, describedBy, invalid }) => (
        <input
          id={inputId}
          type={type}
          value={value ?? ''}
          placeholder={placeholder}
          className={mono ? 'mono' : ''}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    />
  );
}
