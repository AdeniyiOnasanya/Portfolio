import { describe, expect, it } from 'vitest';
import { findForbiddenChars } from '../forbidden';

describe('findForbiddenChars', () => {
  it('returns an empty array for clean ASCII text', () => {
    expect(findForbiddenChars('hello world, no problem.')).toEqual([]);
  });

  it('flags a single em-dash by Unicode escape', () => {
    const result = findForbiddenChars('before\u2014after');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      char: '\u2014',
      index: 6,
      line: 1,
      column: 7,
    });
  });

  it('flags an em-dash on the second line with the right line and column', () => {
    const result = findForbiddenChars('clean line\nthen \u2014 here');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      char: '\u2014',
      line: 2,
      column: 6,
    });
  });

  it('flags multiple offenders in document order', () => {
    const result = findForbiddenChars('\u2014 then later \u2014 again');
    expect(result).toHaveLength(2);
    expect(result[0].char).toBe('\u2014');
    expect(result[1].char).toBe('\u2014');
    expect(result[0].index).toBeLessThan(result[1].index);
  });

  it('flags an emoji via Extended_Pictographic', () => {
    const result = findForbiddenChars('ok \u{1F600} done');
    expect(result).toHaveLength(1);
    expect(result[0].char).toBe('\u{1F600}');
  });

  it('flags both an em-dash and an emoji together', () => {
    const result = findForbiddenChars('\u2014\u{1F600}');
    expect(result).toHaveLength(2);
  });

  it('does not flag a regular hyphen-minus or en-dash', () => {
    expect(findForbiddenChars('a-b, c\u2013d')).toEqual([]);
  });

  it('does not flag curly quotes or other typographic punctuation', () => {
    expect(findForbiddenChars('she said \u201chello\u201d and it\u2019s fine')).toEqual([]);
  });
});
