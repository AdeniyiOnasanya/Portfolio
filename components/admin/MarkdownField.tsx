'use client';

/**
 * MarkdownField is a TextArea variant tuned for the long-form prose blocks
 * (problem/approach/outcome on case studies, hero sub-copy, deep dive
 * paragraphs). It composes Field + a wider textarea, defaults to 8 rows,
 * and renders a small mono caption under the field that signals
 * Markdown-aware editing to the author. The DOM shape stays inside the
 * design's `.f` wrapper; the markdown caption uses the same `.hint` styling
 * vocabulary the design already exposes (admin.css lines 191 to 205).
 *
 * Inline Zod validation errors land via the `error` prop and are surfaced
 * inside the Field wrapper next to the textarea. The Vercel
 * `composition-patterns` skill guides this primitive: it is the same
 * TextArea pattern with a tighter prop surface and a fixed minimum row
 * count, not a parallel implementation.
 */
import { Field } from './Field';

export type MarkdownFieldProps = {
  id: string;
  label: string;
  value: string | null | undefined;
  onChange: (next: string) => void;
  hint?: string;
  error?: string;
  rows?: number;
  placeholder?: string;
};

export function MarkdownField({
  id,
  label,
  hint = 'Markdown',
  error,
  value,
  onChange,
  rows = 8,
  placeholder,
}: MarkdownFieldProps) {
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
          className="markdown"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    />
  );
}
