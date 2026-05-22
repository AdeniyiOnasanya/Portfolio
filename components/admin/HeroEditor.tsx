'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { saveDraftAction } from '@/lib/draft/actions';
import { debounce } from '@/lib/draft/debounce';
import { VisibilityToggle } from './VisibilityToggle';

/**
 * HeroEditor, Phase 7 slice #42.
 *
 * Mirrors `design_handoff_portfolio/design/admin/admin-editors.jsx` lines
 * 7 to 34: the field grid (Name, Role, Location, Years experience), the
 * personal-statement TextArea, and the long-bio TextArea split on blank
 * lines. The header uses the same `.editor-section .head` markup as the
 * placeholder it replaces (admin.css lines 169 to 179) so the visual frame
 * stays continuous with the rest of the section pages.
 *
 * Auto-save contract:
 *  - typing fires `setField`, which patches the in-memory `person` record
 *    and schedules a debounced server-action call;
 *  - the debounce window is 300 ms (lib/draft/debounce.ts); the slice
 *    budget is 350 ms end-to-end, leaving 50 ms for the server round-trip;
 *  - the call is wrapped in `useTransition` so React marks it as a
 *    non-blocking update and the form never gates keystrokes on network;
 *  - the latest server timestamp is surfaced in the small status line
 *    above the form so the operator sees the save landed.
 *
 * The DOM mirrors the design's primitives (`Field`, `TextField`,
 * `TextArea`) by reusing the same class names (`.f`, `.f label`,
 * `.field-grid`); the design composes them via a globals-only window
 * registry that does not survive into the App Router build, so the
 * primitives are inlined here as small local helpers. Class names match
 * `admin.css` lines 181 to 205 verbatim.
 */

import type { HeroDraft, HeroPersonDraft } from '@/lib/draft/hero-types';

type HeroEditorProps = {
  initialDraft: HeroDraft | null;
  initialUpdatedAt: string | null;
  /**
   * Initial value of the per-section `hidden` flag from the persisted
   * draft. Default `false` so a fresh hero is shown on the public preview.
   * Slice #47 wires this through; toggling persists alongside the form
   * content via the same `saveDraftAction` so the operator never sees a
   * split state where the field changes saved but the visibility did not
   * (or vice versa).
   */
  initialHidden?: boolean;
  // Optional sibling-state mirror. Slice #43 (live preview pane) lifts the
  // working person record up so a parallel `<Hero>` render can read the
  // same in-memory shape on every keystroke. The callback fires
  // synchronously inside `setField`, before React commits, so the preview
  // never lags the editor. Omitted callers keep the existing
  // single-route behaviour (server save is the only consumer).
  onPersonChange?: (next: HeroPersonDraft) => void;
};

// Local, single-instance copies of `TextField` and `TextArea` from
// `admin-shared.jsx` lines 65 to 90. The design exposes these via `window`,
// which we cannot do in App Router; the named class names on the wrapping
// `.f`, the label markup, and the input styling all match the source.
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className="f">
      {/* biome-ignore lint/a11y/noLabelWithoutControl: label wraps input via children */}
      <label>
        {label}
        {hint ? <span className="hint">{hint}</span> : null}
      </label>
      {children}
    </div>
  );
}

function TextField({
  label,
  hint,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  hint?: string | undefined;
  value: string;
  onChange: (next: string) => void;
  type?: 'text' | 'number';
}) {
  return (
    <Field label={label} hint={hint}>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function TextArea({
  label,
  hint,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  hint?: string | undefined;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

// 300 ms keeps the round-trip under the slice's 350 ms budget end-to-end.
const DEBOUNCE_MS = 300;

function formatStatus(updatedAt: string | null, isPending: boolean): string {
  if (isPending) return 'Saving draft';
  if (!updatedAt) return 'No draft saved yet';
  const stamp = new Date(updatedAt);
  if (Number.isNaN(stamp.getTime())) return 'Draft saved';
  const time = stamp.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `Draft saved at ${time}`;
}

export function HeroEditor({
  initialDraft,
  initialUpdatedAt,
  initialHidden = false,
  onPersonChange,
}: HeroEditorProps) {
  const [person, setPerson] = useState<HeroPersonDraft>(() => initialDraft?.person ?? {});
  const [hidden, setHidden] = useState<boolean>(
    () => initialDraft?.hidden ?? initialHidden ?? false,
  );
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialUpdatedAt);
  const [isPending, startTransition] = useTransition();

  // The transition state is the source of truth; the refs are only used
  // to avoid triggering a stale save after unmount. The saved draft is
  // the whole `person` record plus the `hidden` flag, mirroring the
  // design's `data.person` shape with the per-section visibility added
  // by slice #47.
  const latestPerson = useRef(person);
  const latestHidden = useRef(hidden);
  useEffect(() => {
    latestPerson.current = person;
  }, [person]);
  useEffect(() => {
    latestHidden.current = hidden;
  }, [hidden]);

  const fire = useCallback(() => {
    const snapshot: HeroDraft = { person: latestPerson.current, hidden: latestHidden.current };
    startTransition(async () => {
      const result = await saveDraftAction('hero', snapshot);
      if (result.ok) {
        setUpdatedAt(result.updatedAt);
      }
    });
  }, []);

  const debounced = useMemo(() => debounce(fire, DEBOUNCE_MS), [fire]);

  // Flush any pending save on unmount so a fast navigation does not lose
  // the last keystroke. `cancel` is not used because flushing is the safer
  // default for an admin tool.
  useEffect(() => {
    return () => {
      debounced.flush();
    };
  }, [debounced]);

  function setField<K extends keyof HeroPersonDraft>(key: K, value: HeroPersonDraft[K]): void {
    setPerson((prev) => {
      const next = { ...prev, [key]: value };
      // Synchronous mirror to the optional parent (slice #43 preview pane).
      // Calling inside the updater gives the parent the freshly composed
      // snapshot before React commits, so the preview never lags the
      // editor by a tick. The base case (no parent) drops the call
      // entirely, leaving the auto-save server action as the only consumer.
      onPersonChange?.(next);
      return next;
    });
    debounced();
  }

  function handleVisibilityChange(nextOn: boolean): void {
    // The toggle reads "Show on site": on => visible, off => hidden.
    // Visibility flips are deliberate and rare, so skip the debounce
    // window and persist immediately. Any in-flight typing save will
    // still flush its own snapshot via the same action.
    const nextHidden = !nextOn;
    setHidden(nextHidden);
    latestHidden.current = nextHidden;
    debounced.cancel();
    const snapshot: HeroDraft = { person: latestPerson.current, hidden: nextHidden };
    startTransition(async () => {
      const result = await saveDraftAction('hero', snapshot);
      if (result.ok) {
        setUpdatedAt(result.updatedAt);
      }
    });
  }

  const longBioValue = (person.longBio ?? []).join('\n\n');

  return (
    <div className="editor-section">
      <div className="head">
        <div>
          <div className="section-ribbon">
            <span className="bar" aria-hidden="true" />
            SECTION 01
          </div>
          <h2>Hero</h2>
        </div>
        <span className="autosave-status" data-testid="autosave-status">
          {formatStatus(updatedAt, isPending)}
        </span>
      </div>

      <VisibilityToggle
        id="hero-visible"
        label="Show on site"
        sub="Section visible on public preview"
        on={!hidden}
        onChange={handleVisibilityChange}
      />

      <div className="field-grid">
        <TextField label="Name" value={person.name ?? ''} onChange={(v) => setField('name', v)} />
        <TextField label="Role" value={person.role ?? ''} onChange={(v) => setField('role', v)} />
        <TextField
          label="Location"
          value={person.location ?? ''}
          onChange={(v) => setField('location', v)}
        />
        <TextField
          label="Years experience"
          type="number"
          value={person.yearsExp === undefined ? '' : String(person.yearsExp)}
          onChange={(v) => {
            const parsed = Number.parseInt(v, 10);
            setField('yearsExp', Number.isFinite(parsed) ? parsed : person.yearsExp);
          }}
        />
      </div>

      <div style={{ height: 16 }} />
      <TextArea
        label="Personal statement"
        hint="Sits under hero, kept short"
        rows={3}
        value={person.statement ?? ''}
        onChange={(v) => setField('statement', v)}
      />

      <div style={{ height: 16 }} />
      <TextArea
        label="Long bio (about section)"
        hint="Three paragraphs separated by a blank line"
        rows={9}
        value={longBioValue}
        onChange={(v) =>
          setField(
            'longBio',
            v
              .split(/\n\n+/)
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
      />
    </div>
  );
}
