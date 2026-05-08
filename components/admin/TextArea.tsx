'use client';

/**
 * TextArea wraps a multi-line `<textarea>` in the shared Field primitive.
 * Mirrors design_handoff_portfolio/design/admin/admin-shared.jsx lines 79
 * to 91. Layout and focus styles come from
 * design_handoff_portfolio/design/admin.css lines 192 to 205, where the
 * textarea is given a sans-serif body font, vertical resize, and a 90px
 * minimum height. Inline Zod validation errors land via the `error` prop
 * and are surfaced inside the Field wrapper next to the textarea.
 */
import { Field } from './Field';

export type TextAreaProps = {
  id: string;
  label: string;
  value: string | null | undefined;
  onChange: (next: string) => void;
  hint?: string;
  error?: string;
  rows?: number;
  placeholder?: string;
};

export function TextArea({
  id,
  label,
  hint,
  error,
  value,
  onChange,
  rows = 4,
  placeholder,
}: TextAreaProps) {
  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      renderInput={({ inputId, describedBy, invalid }) => (
        <textarea
          id={inputId}
          value={value ?? ''}
          rows={rows}
          placeholder={placeholder}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    />
  );
}
