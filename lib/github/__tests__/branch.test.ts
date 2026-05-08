import { describe, expect, it } from 'vitest';
import { BRANCH_NAME_PATTERN, buildBranchName } from '../branch';

/*
 * Branch-name generator, Phase 8 slice #48.
 *
 * The publish flow opens a fresh branch per draft so the human reviewer can
 * read a clean diff against the base branch. The shape is
 * `cms/<unix-ts>-<slug>` with two refinements:
 *
 *  - `<slug>` is sanitised to kebab-case ASCII so a section id with
 *    accidental whitespace, casing drift, or non-ASCII characters never
 *    lands on a remote ref name (GitHub allows a wide alphabet but the
 *    operator scans the branch list by eye).
 *  - When a hash suffix is supplied (collision recovery in slice #50), it
 *    appends as `-<hash>` after the slug so the regex still matches.
 *
 * Both behaviours are pure: the function takes the unix timestamp and slug
 * as arguments rather than reading the clock so tests can assert exact
 * equality without time-stubbing.
 */

describe('buildBranchName', () => {
  it('produces cms/<unix-ts>-<slug> for a clean slug', () => {
    expect(buildBranchName({ unixTs: 1746630000, slug: 'hero' })).toBe('cms/1746630000-hero');
  });

  it('lowercases and kebab-cases a noisy slug', () => {
    expect(buildBranchName({ unixTs: 1746630000, slug: 'Hero About' })).toBe(
      'cms/1746630000-hero-about',
    );
  });

  it('replaces a run of characters outside [a-z0-9] with a single dash', () => {
    expect(buildBranchName({ unixTs: 1, slug: 'hero!@#$%about' })).toBe('cms/1-hero-about');
  });

  it('collapses runs of separators into a single dash', () => {
    expect(buildBranchName({ unixTs: 1, slug: 'hero___about--page' })).toBe(
      'cms/1-hero-about-page',
    );
  });

  it('trims leading and trailing dashes from the slug', () => {
    expect(buildBranchName({ unixTs: 1, slug: '--hero--' })).toBe('cms/1-hero');
  });

  it('appends an optional hash suffix after the slug', () => {
    expect(buildBranchName({ unixTs: 1746630000, slug: 'hero', hashSuffix: 'a1b2c3' })).toBe(
      'cms/1746630000-hero-a1b2c3',
    );
  });

  it('rejects an empty slug', () => {
    expect(() => buildBranchName({ unixTs: 1, slug: '' })).toThrow(/slug/i);
  });

  it('rejects a non-finite unix timestamp', () => {
    expect(() => buildBranchName({ unixTs: Number.NaN, slug: 'hero' })).toThrow(/unixTs/i);
  });

  it('the produced name matches BRANCH_NAME_PATTERN', () => {
    const name = buildBranchName({ unixTs: 1746630000, slug: 'Hero About' });
    expect(BRANCH_NAME_PATTERN.test(name)).toBe(true);
  });

  it('BRANCH_NAME_PATTERN rejects a non-cms ref', () => {
    expect(BRANCH_NAME_PATTERN.test('main')).toBe(false);
    expect(BRANCH_NAME_PATTERN.test('cms/abc-hero')).toBe(false);
    expect(BRANCH_NAME_PATTERN.test('cms/1746630000-')).toBe(false);
  });
});
