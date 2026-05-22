import { describe, expect, it } from 'vitest';

/**
 * Pure unit tests for the renumber + reorder helpers in
 * `lib/draft/projects.ts`, slice #44.
 *
 * The tests are intentionally narrow: they cover the behaviour the slice
 * spec calls out (renumber on save, not on drag; new id-order updates
 * the draft) without coupling to the wider draft-store layer. The action
 * itself is tested in `actions.test.ts`.
 *
 * The pure helpers live in a `'server-only'` file, so importing them in
 * Node-side Vitest is fine; the `'server-only'` import in
 * `lib/draft/projects.ts` re-exports without side effects in the test
 * environment.
 */

import { applyOrder, renumberProjects } from '../projects';

const seed = (slugs: string[]) =>
  slugs.map((slug, index) => ({
    slug,
    n: String(index + 1).padStart(2, '0'),
    title: `Project ${slug}`,
  }));

describe('renumberProjects', () => {
  it('reassigns n based on the array index, zero-padded to two digits', () => {
    const input = [
      { slug: 'b', n: '99', title: 'B' },
      { slug: 'a', n: '99', title: 'A' },
      { slug: 'c', n: '99', title: 'C' },
    ];
    const out = renumberProjects(input);
    expect(out.map((p) => p.n)).toEqual(['01', '02', '03']);
    // Order is preserved: index 0 stays index 0.
    expect(out.map((p) => p.slug)).toEqual(['b', 'a', 'c']);
  });

  it('returns a new array and does not mutate the input', () => {
    const input = [{ slug: 'a', n: '99', title: 'A' }];
    const out = renumberProjects(input);
    expect(out).not.toBe(input);
    expect(input[0]?.n).toBe('99');
  });

  it('renumbers contiguously, with no gaps, even when the input n is missing or stale', () => {
    const input = [
      { slug: 'a', n: '07' },
      { slug: 'b', n: '12' },
      { slug: 'c', n: '04' },
    ];
    const out = renumberProjects(input);
    expect(out.map((p) => p.n)).toEqual(['01', '02', '03']);
  });

  it('handles an empty list', () => {
    expect(renumberProjects([])).toEqual([]);
  });

  it('preserves the rest of the project fields verbatim', () => {
    const input = [
      { slug: 'a', n: '99', title: 'A', subtitle: 'S', year: '2024', role: 'Eng', kind: 'Web' },
    ];
    const [out] = renumberProjects(input);
    expect(out).toEqual({
      slug: 'a',
      n: '01',
      title: 'A',
      subtitle: 'S',
      year: '2024',
      role: 'Eng',
      kind: 'Web',
    });
  });
});

describe('applyOrder', () => {
  it('returns the projects re-sorted to match the slug order', () => {
    const projects = seed(['a', 'b', 'c']);
    const out = applyOrder(projects, ['c', 'a', 'b']);
    expect(out.map((p) => p.slug)).toEqual(['c', 'a', 'b']);
  });

  it('ignores unknown slugs in the order array', () => {
    const projects = seed(['a', 'b']);
    const out = applyOrder(projects, ['ghost', 'b', 'a']);
    expect(out.map((p) => p.slug)).toEqual(['b', 'a']);
  });

  it('appends slugs that are missing from the order array, in their original relative order', () => {
    const projects = seed(['a', 'b', 'c']);
    // Stale client only knows about a + c, in reverse order.
    const out = applyOrder(projects, ['c', 'a']);
    expect(out.map((p) => p.slug)).toEqual(['c', 'a', 'b']);
  });

  it('drops duplicate slugs in the order array', () => {
    const projects = seed(['a', 'b', 'c']);
    const out = applyOrder(projects, ['a', 'a', 'b', 'c']);
    expect(out.map((p) => p.slug)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input array', () => {
    const projects = seed(['a', 'b', 'c']);
    const before = projects.map((p) => p.slug);
    applyOrder(projects, ['c', 'b', 'a']);
    expect(projects.map((p) => p.slug)).toEqual(before);
  });

  it('does not renumber n on its own', () => {
    // applyOrder is order-only. Renumber happens in renumberProjects, called
    // separately by reorderProjectsAction so the two concerns stay
    // independently testable.
    const projects = seed(['a', 'b', 'c']);
    const out = applyOrder(projects, ['c', 'a', 'b']);
    expect(out.map((p) => p.n)).toEqual(['03', '01', '02']);
  });

  it('handles an empty order array by returning the input unchanged in original order', () => {
    const projects = seed(['a', 'b']);
    const out = applyOrder(projects, []);
    expect(out.map((p) => p.slug)).toEqual(['a', 'b']);
  });

  it('handles an empty project list', () => {
    const out = applyOrder([], ['a', 'b']);
    expect(out).toEqual([]);
  });
});
