import { describe, expect, it } from 'vitest';
import {
  BRANCH_NAME_PATTERN,
  buildBranchName,
  buildDeterministicBranchName,
  DETERMINISTIC_BRANCH_NAME_PATTERN,
} from '../branch';

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

/*
 * Deterministic-per-section branch generator, Phase 8 slice #50.
 *
 * Slice #48 keyed each publish by unix-ts so a second click always opened a
 * fresh branch (and therefore a fresh PR). Slice #50 flips that: the same
 * section id must always resolve to the same branch name, so a republish
 * collides on `create-ref` and the pipeline can fast-forward the existing
 * branch and reuse its open PR. The hash is derived from the section id only
 * (not the clock, not the parent commit) so two clicks separated by an hour
 * still produce the same branch.
 */

describe('buildDeterministicBranchName', () => {
  it('produces cms/<slug>-<8-hex> for a clean slug + sectionId', () => {
    const name = buildDeterministicBranchName({ slug: 'hero', sectionId: 'hero' });
    expect(name).toMatch(/^cms\/hero-[0-9a-f]{8}$/);
  });

  it('returns the same branch name for the same sectionId across calls', () => {
    const a = buildDeterministicBranchName({ slug: 'hero', sectionId: 'hero' });
    const b = buildDeterministicBranchName({ slug: 'hero', sectionId: 'hero' });
    expect(a).toBe(b);
  });

  it('returns a different branch name for a different sectionId', () => {
    const hero = buildDeterministicBranchName({ slug: 'hero', sectionId: 'hero' });
    const about = buildDeterministicBranchName({ slug: 'about', sectionId: 'about' });
    expect(hero).not.toBe(about);
  });

  it('lowercases and kebab-cases a noisy slug', () => {
    const name = buildDeterministicBranchName({ slug: 'Hero About', sectionId: 'hero' });
    expect(name.startsWith('cms/hero-about-')).toBe(true);
  });

  it('rejects an empty slug', () => {
    expect(() => buildDeterministicBranchName({ slug: '', sectionId: 'hero' })).toThrow(/slug/i);
  });

  it('rejects an empty sectionId', () => {
    expect(() => buildDeterministicBranchName({ slug: 'hero', sectionId: '' })).toThrow(
      /sectionId/i,
    );
  });

  it('the produced name matches DETERMINISTIC_BRANCH_NAME_PATTERN', () => {
    const name = buildDeterministicBranchName({ slug: 'hero', sectionId: 'hero' });
    expect(DETERMINISTIC_BRANCH_NAME_PATTERN.test(name)).toBe(true);
  });

  it('DETERMINISTIC_BRANCH_NAME_PATTERN accepts the deterministic shape', () => {
    expect(DETERMINISTIC_BRANCH_NAME_PATTERN.test('cms/hero-3a4f9b2c')).toBe(true);
    expect(DETERMINISTIC_BRANCH_NAME_PATTERN.test('cms/hero-about-12345678')).toBe(true);
  });

  it('DETERMINISTIC_BRANCH_NAME_PATTERN rejects a missing or short hash', () => {
    expect(DETERMINISTIC_BRANCH_NAME_PATTERN.test('cms/hero')).toBe(false);
    expect(DETERMINISTIC_BRANCH_NAME_PATTERN.test('cms/hero-abc')).toBe(false);
    expect(DETERMINISTIC_BRANCH_NAME_PATTERN.test('cms/hero-XYZ12345')).toBe(false);
  });
});
