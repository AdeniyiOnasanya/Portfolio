import { describe, expect, it } from 'vitest';
import type { HeroDraft } from '@/lib/draft/hero-types';
import { findForbiddenChars } from '@/lib/text/forbidden';
import { summariseHeroDiff } from '../diff';

/*
 * summariseHeroDiff, Phase 8 slice #52.
 *
 * The route handler currently passes a placeholder string ("Updated hero
 * section.") as the PR body. This summariser replaces that placeholder
 * with a deterministic plain-language list of every leaf-field change
 * between the published hero state (loaded from content/site.json) and
 * the validated draft. The output is markdown with a one-line header,
 * one bullet per changed field, and nothing emitted for sections that
 * did not change. The function is pure: no fs, no env, no time.
 *
 * Coverage:
 *  - Header is fixed and present even when the body otherwise lists no
 *    bullets (a no-op publish would never reach the route, but the
 *    function still has to return a valid string).
 *  - String change emits "Changed `<dot.path>` from \"old\" to \"new\"".
 *  - Numeric change uses the same shape without the surrounding quotes.
 *  - Adding an item to an array emits "Added N <noun> to `<dot.path>`".
 *  - Removing an item emits "Removed N <noun> from `<dot.path>`".
 *  - Reordering items (same set, different order) emits a single
 *    "Reordered <dot.path>" line so the human reviewer can spot it
 *    without seeing the same paragraph listed as both added and removed.
 *  - The whole produced body is forbidden-char clean (em-dash + emoji);
 *    if a future field carries U+2014 the summariser must still surface
 *    the change without smuggling the offender into the PR body.
 */

const baseHero: HeroDraft = {
  person: {
    name: 'Ada Lovelace',
    role: 'Software Engineer',
    location: 'London',
    yearsExp: 6,
    statement: 'A short statement.',
    longBio: ['Paragraph one.', 'Paragraph two.'],
    email: 'ada@example.com',
    phone: '07000 000000',
  },
};

describe('summariseHeroDiff', () => {
  it('returns the header alone when nothing changed', () => {
    const body = summariseHeroDiff(baseHero, baseHero);
    expect(body).toBe('Hero section update from the admin CMS.\n');
  });

  it('reports a single string field change with the dot-path and quoted values', () => {
    const after: HeroDraft = {
      person: { ...baseHero.person, name: 'Grace Hopper' },
    };
    const body = summariseHeroDiff(baseHero, after);
    expect(body).toContain('- Changed `hero.person.name` from "Ada Lovelace" to "Grace Hopper"');
    expect(body.startsWith('Hero section update from the admin CMS.\n')).toBe(true);
  });

  it('reports a numeric field change without quoting the values', () => {
    const after: HeroDraft = {
      person: { ...baseHero.person, yearsExp: 7 },
    };
    const body = summariseHeroDiff(baseHero, after);
    expect(body).toContain('- Changed `hero.person.yearsExp` from 6 to 7');
    expect(body).not.toContain('"6"');
  });

  it('reports a single added array item with the singular noun', () => {
    const after: HeroDraft = {
      person: {
        ...baseHero.person,
        longBio: ['Paragraph one.', 'Paragraph two.', 'Paragraph three.'],
      },
    };
    const body = summariseHeroDiff(baseHero, after);
    expect(body).toContain('- Added 1 paragraph to `hero.person.longBio`');
  });

  it('reports multiple added array items with the plural noun', () => {
    const after: HeroDraft = {
      person: {
        ...baseHero.person,
        longBio: ['Paragraph one.', 'Paragraph two.', 'Paragraph three.', 'Paragraph four.'],
      },
    };
    const body = summariseHeroDiff(baseHero, after);
    expect(body).toContain('- Added 2 paragraphs to `hero.person.longBio`');
  });

  it('reports a removed array item', () => {
    const after: HeroDraft = {
      person: {
        ...baseHero.person,
        longBio: ['Paragraph one.'],
      },
    };
    const body = summariseHeroDiff(baseHero, after);
    expect(body).toContain('- Removed 1 paragraph from `hero.person.longBio`');
  });

  it('reports a reorder of an array as a single line, not as add + remove', () => {
    const after: HeroDraft = {
      person: {
        ...baseHero.person,
        longBio: ['Paragraph two.', 'Paragraph one.'],
      },
    };
    const body = summariseHeroDiff(baseHero, after);
    expect(body).toContain('- Reordered `hero.person.longBio`');
    expect(body).not.toContain('Added');
    expect(body).not.toContain('Removed');
  });

  it('reports both a string change and an array change in one body', () => {
    const after: HeroDraft = {
      person: {
        ...baseHero.person,
        name: 'Grace Hopper',
        longBio: ['Paragraph one.', 'Paragraph two.', 'Paragraph three.'],
      },
    };
    const body = summariseHeroDiff(baseHero, after);
    expect(body).toContain('- Changed `hero.person.name` from "Ada Lovelace" to "Grace Hopper"');
    expect(body).toContain('- Added 1 paragraph to `hero.person.longBio`');
  });

  it('omits unchanged sibling fields entirely', () => {
    const after: HeroDraft = {
      person: { ...baseHero.person, name: 'Grace Hopper' },
    };
    const body = summariseHeroDiff(baseHero, after);
    expect(body).not.toContain('hero.person.role');
    expect(body).not.toContain('hero.person.location');
    expect(body).not.toContain('hero.person.email');
    expect(body).not.toContain('hero.person.longBio');
  });

  it('treats absent before-fields as new additions', () => {
    const before: HeroDraft = { person: {} };
    const after: HeroDraft = {
      person: { name: 'Grace Hopper' },
    };
    const body = summariseHeroDiff(before, after);
    expect(body).toContain('- Set `hero.person.name` to "Grace Hopper"');
  });

  it('treats present-then-absent fields as cleared', () => {
    const before: HeroDraft = {
      person: { name: 'Ada Lovelace' },
    };
    const after: HeroDraft = { person: {} };
    const body = summariseHeroDiff(before, after);
    expect(body).toContain('- Cleared `hero.person.name`');
  });

  it('reports a hidden flip', () => {
    const before: HeroDraft = { ...baseHero, hidden: false };
    const after: HeroDraft = { ...baseHero, hidden: true };
    const body = summariseHeroDiff(before, after);
    expect(body).toContain('- Changed `hero.hidden` from false to true');
  });

  it('emits a snapshot for the canonical multi-change fixture', () => {
    const after: HeroDraft = {
      person: {
        name: 'Grace Hopper',
        role: 'Compiler Pioneer',
        location: 'London',
        yearsExp: 7,
        statement: 'A short statement.',
        longBio: ['Paragraph one.', 'Paragraph two.', 'Paragraph three.'],
        email: 'ada@example.com',
        phone: '07000 000000',
      },
    };
    const body = summariseHeroDiff(baseHero, after);
    expect(body).toMatchInlineSnapshot(`
      "Hero section update from the admin CMS.

      - Added 1 paragraph to \`hero.person.longBio\`
      - Changed \`hero.person.name\` from "Ada Lovelace" to "Grace Hopper"
      - Changed \`hero.person.role\` from "Software Engineer" to "Compiler Pioneer"
      - Changed \`hero.person.yearsExp\` from 6 to 7
      "
    `);
  });

  it('produces a forbidden-char clean body for the canonical fixture', () => {
    // Defence in depth. The route calls `buildSiteJsonAfterHeroEdit`
    // before this summariser, and that function throws on any forbidden
    // character in the merged site JSON. So in production the diff
    // function is never asked to emit a body that includes U+2014 or an
    // emoji. This test still pins that the summariser itself does not
    // introduce a forbidden char (em-dash, emoji) into its own template.
    const after: HeroDraft = {
      person: {
        ...baseHero.person,
        name: 'Grace Hopper',
        role: 'Compiler Pioneer',
        yearsExp: 7,
        longBio: ['Paragraph one.', 'Paragraph two.', 'Paragraph three.'],
      },
    };
    const body = summariseHeroDiff(baseHero, after);
    expect(findForbiddenChars(body)).toEqual([]);
  });

  it('refuses to emit values that contain a forbidden character', () => {
    // If, hypothetically, a forbidden character ever reached this layer
    // (a future refactor changed the order of defence, or a draft was
    // hand-written to skip the field validator), the summariser must
    // not smuggle the raw character into the PR body. The contract is
    // that the function throws so the route handler maps the throw to a
    // 422, exactly as it does for `buildSiteJsonAfterHeroEdit`.
    // The em-dash is constructed via Unicode escape so the test source
    // file itself stays forbidden-char clean; the meta-test that scans
    // the tree for U+2014 must not flag this file.
    const after: HeroDraft = {
      person: {
        ...baseHero.person,
        statement: `A statement with a stray ${String.fromCodePoint(0x2014)} in it.`,
      },
    };
    expect(() => summariseHeroDiff(baseHero, after)).toThrow(/forbidden character/i);
  });
});
