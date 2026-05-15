import type { HeroDraft, HeroPersonDraft } from '@/lib/draft/hero-types';
import { findForbiddenChars } from '@/lib/text/forbidden';

/**
 * Hero diff summariser, Phase 8 slice #52.
 *
 * Builds the human-readable PR body that ships with every CMS publish.
 * The route handler used to pass a fixed placeholder ("Updated hero
 * section.") into `publishCommit`; this module replaces that placeholder
 * with a deterministic plain-language list of every leaf-field change
 * between the published hero state and the validated draft.
 *
 * Contract:
 *  - Pure: no fs reads, no env access, no time-of-day. Same input, same
 *    output. The route handler builds the inputs from `loadSite()` and
 *    the draft store; this module never touches them directly.
 *  - The body always opens with the fixed header line so a reader of the
 *    PR list can recognise CMS publishes at a glance even when the diff
 *    itself is a single-character tweak.
 *  - The body never contains U+2014 or an emoji. The summariser is the
 *    last hop before the body lands on GitHub via `octokit.pulls.create`,
 *    and the project's hard rule applies to PR bodies as well as code,
 *    so a stray forbidden char from a hand-edited draft must not pass.
 *    The function throws on any input value that carries a forbidden
 *    character so the route handler can map the throw to a 422, exactly
 *    as it does for the upstream `buildSiteJsonAfterHeroEdit` defence.
 *  - No em-dashes in any template literal in this file. Use commas,
 *    periods, parentheses, or colons.
 *
 * Output shape:
 *
 *   Hero section update from the admin CMS.
 *   <blank line, only if the body has at least one bullet>
 *   - Changed `hero.person.name` from "Old" to "New"
 *   - Added 1 paragraph to `hero.person.longBio`
 *   - Removed 1 paragraph from `hero.person.longBio`
 *   - Reordered `hero.person.longBio`
 *   - Set `hero.person.role` to "New"   (when the before value was absent)
 *   - Cleared `hero.person.role`        (when the after value is absent)
 *   - Changed `hero.hidden` from false to true
 */

const HEADER = 'Hero section update from the admin CMS.';

/**
 * Per-array noun map. Each array under HeroPersonDraft gets its own
 * singular and plural so the bullet reads naturally
 * ("Added 1 paragraph", "Added 2 paragraphs"). Adding a new array field
 * to HeroPersonDraft only requires extending this map and the field
 * walker below picks it up automatically.
 */
const ARRAY_FIELD_NOUNS: Record<string, { singular: string; plural: string }> = {
  longBio: { singular: 'paragraph', plural: 'paragraphs' },
};

type Bullet = string;

export function summariseHeroDiff(before: HeroDraft, after: HeroDraft): string {
  const bullets: Bullet[] = [];

  // Person fields. The HeroPersonDraft schema is permissive (every key
  // optional), so the diff walks the union of keys present in either
  // side. The two sides may share keys, only-before, or only-after, and
  // each combination maps to a distinct bullet shape ("Set", "Cleared",
  // or "Changed"). Keys are walked in a stable lexical order so the body
  // is deterministic for snapshot tests.
  const beforePerson: HeroPersonDraft = before.person ?? {};
  const afterPerson: HeroPersonDraft = after.person ?? {};
  // HeroPersonDraft is a closed shape from `@/lib/draft/hero-types`; every
  // leaf is `string | number | string[] | undefined`. The cast widens the
  // value type to `unknown` so the generic walker (`diffField`) can handle
  // it without per-key fan-out. If the shape ever grows a nested object,
  // `diffField` will fall through to the JSON.stringify branch and the
  // unit tests for the new field will surface the gap immediately.
  const beforeRecord = beforePerson as Record<string, unknown>;
  const afterRecord = afterPerson as Record<string, unknown>;
  const personKeys = sortedUnion(Object.keys(beforePerson), Object.keys(afterPerson));
  for (const key of personKeys) {
    const path = `hero.person.${key}`;
    const bullet = diffField(path, beforeRecord[key], afterRecord[key]);
    if (bullet) bullets.push(bullet);
  }

  // Top-level hidden flag. The route does not currently set this from the
  // draft (the visibility toggle ships in #47), but the field is part of
  // HeroDraftSchema so the summariser surfaces a flip if a future call
  // path passes one through. `undefined` and `false` are treated as the
  // same observable state (section visible), so the comparison runs on
  // the normalised pair: `undefined -> false` is not a flip, `false ->
  // true` is.
  const beforeHidden = before.hidden ?? false;
  const afterHidden = after.hidden ?? false;
  if (beforeHidden !== afterHidden) {
    bullets.push(`- Changed \`hero.hidden\` from ${beforeHidden} to ${afterHidden}`);
  }

  const body = bullets.length === 0 ? `${HEADER}\n` : `${HEADER}\n\n${bullets.join('\n')}\n`;

  // Final defence in depth. The per-bullet builders (`formatScalar`,
  // `quoteString`) all run their values through `assertClean`, but this
  // pass guards against a future template tweak (a contributor adding a
  // raw string interpolation) reintroducing the offender silently.
  assertClean(body, 'pull request body');

  return body;
}

function diffField(path: string, before: unknown, after: unknown): Bullet | null {
  const beforePresent = before !== undefined;
  const afterPresent = after !== undefined;

  if (!beforePresent && !afterPresent) return null;

  // Array branch first: an unchanged-by-deep-equality array still has to
  // exit before the scalar branch fires (otherwise the scalar formatter
  // would render "[object Object]"-style output).
  if (Array.isArray(before) || Array.isArray(after)) {
    return diffArrayField(path, before, after);
  }

  if (!beforePresent && afterPresent) {
    return `- Set \`${path}\` to ${formatScalar(after)}`;
  }
  if (beforePresent && !afterPresent) {
    return `- Cleared \`${path}\``;
  }
  if (Object.is(before, after)) return null;
  return `- Changed \`${path}\` from ${formatScalar(before)} to ${formatScalar(after)}`;
}

function diffArrayField(path: string, before: unknown, after: unknown): Bullet | null {
  const beforeArr = Array.isArray(before) ? before : [];
  const afterArr = Array.isArray(after) ? after : [];

  // Pin every element so the eventual bullet text never embeds a stray
  // forbidden character in a count summary or reorder report. Label
  // stays as `pull request body` for consistency with the route's
  // `isForbiddenCharError` regex and the rest of the file; the offending
  // field path is still derivable from the per-bullet structure.
  for (const item of beforeArr) assertClean(stringify(item), 'pull request body');
  for (const item of afterArr) assertClean(stringify(item), 'pull request body');

  if (arraysShallowEqual(beforeArr, afterArr)) return null;

  const noun = ARRAY_FIELD_NOUNS[lastSegment(path)] ?? { singular: 'item', plural: 'items' };
  const beforeMultiset = toMultiset(beforeArr);
  const afterMultiset = toMultiset(afterArr);

  if (multisetsEqual(beforeMultiset, afterMultiset)) {
    // Same set of values, different order. A single bullet is friendlier
    // than two ("Removed N", "Added N") that read as a much bigger churn.
    return `- Reordered \`${path}\``;
  }

  const delta = afterArr.length - beforeArr.length;
  if (delta > 0) {
    const word = delta === 1 ? noun.singular : noun.plural;
    return `- Added ${delta} ${word} to \`${path}\``;
  }
  if (delta < 0) {
    const removed = -delta;
    const word = removed === 1 ? noun.singular : noun.plural;
    return `- Removed ${removed} ${word} from \`${path}\``;
  }
  // Same length, same multiset would have hit the reorder branch; same
  // length with a different multiset means at least one swap. Surface it
  // as a generic edit so the reviewer reads the actual diff for the
  // detail, rather than a misleading "Reordered" line.
  return `- Edited \`${path}\``;
}

function formatScalar(value: unknown): string {
  if (typeof value === 'string') return quoteString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null) return 'null';
  // Fall back through stringify for nested objects, but assert clean so
  // we never embed a stray forbidden char in the body.
  const text = stringify(value);
  assertClean(text, 'pull request body');
  return text;
}

function quoteString(value: string): string {
  assertClean(value, 'pull request body');
  // Inner double quotes are escaped so the bullet is unambiguous and
  // markdown does not break on a stray quote.
  const escaped = value.replace(/"/g, '\\"');
  return `"${escaped}"`;
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function lastSegment(path: string): string {
  const parts = path.split('.');
  return parts[parts.length - 1] ?? path;
}

function sortedUnion(a: string[], b: string[]): string[] {
  const set = new Set<string>([...a, ...b]);
  return [...set].sort();
}

function arraysShallowEqual(a: readonly unknown[], b: readonly unknown[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!Object.is(a[i], b[i])) return false;
  }
  return true;
}

function toMultiset(items: readonly unknown[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const item of items) {
    const key = stringify(item);
    out.set(key, (out.get(key) ?? 0) + 1);
  }
  return out;
}

function multisetsEqual(a: Map<string, number>, b: Map<string, number>): boolean {
  if (a.size !== b.size) return false;
  for (const [key, count] of a) {
    if (b.get(key) !== count) return false;
  }
  return true;
}

function assertClean(text: string, label: string): void {
  const matches = findForbiddenChars(text);
  if (matches.length > 0) {
    const first = matches[0];
    if (!first) return;
    throw new Error(
      `forbidden character ${JSON.stringify(first.char)} in ${label} at line ${first.line}, column ${first.column}.`,
    );
  }
}
