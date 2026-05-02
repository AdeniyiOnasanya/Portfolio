import { describe, expect, it } from 'vitest';
import { slugify } from '../slug';

describe('slugify', () => {
  it('produces kebab-case from a punctuation-rich title', () => {
    expect(slugify('Cafe & Sons!')).toBe('cafe-and-sons');
  });

  it('lowercases input', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('strips diacritics', () => {
    expect(slugify('café')).toBe('cafe');
    expect(slugify('résumé')).toBe('resume');
    expect(slugify('naïve façade')).toBe('naive-facade');
  });

  it('expands ampersand to "and"', () => {
    expect(slugify('Salt & Pepper')).toBe('salt-and-pepper');
    expect(slugify('A&B')).toBe('a-and-b');
  });

  it('collapses runs of non-alphanumeric characters to a single dash', () => {
    expect(slugify('a----b')).toBe('a-b');
    expect(slugify('  multiple   spaces  ')).toBe('multiple-spaces');
    expect(slugify('one/two\\three.four')).toBe('one-two-three-four');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('---hello---')).toBe('hello');
  });

  it('caps the result at 60 characters and trims a trailing dash if truncated mid-word', () => {
    const long = 'a'.repeat(80);
    expect(slugify(long).length).toBeLessThanOrEqual(60);
    const mixed = `${'word-'.repeat(20)}tail`;
    const result = slugify(mixed);
    expect(result.length).toBeLessThanOrEqual(60);
    expect(result.endsWith('-')).toBe(false);
  });

  it('throws when the input is empty', () => {
    expect(() => slugify('')).toThrow(/empty/i);
  });

  it('throws when the input contains only stripped characters', () => {
    expect(() => slugify('!!!')).toThrow(/empty/i);
    expect(() => slugify('---')).toThrow(/empty/i);
  });

  it.each(['admin', 'api', 'login', 'cv', '_next', 'next'])('rejects reserved slug %s', (input) => {
    expect(() => slugify(input)).toThrow(/reserved/i);
  });

  it('rejects an input that normalises to a reserved slug', () => {
    expect(() => slugify('Admin')).toThrow(/reserved/i);
    expect(() => slugify('  CV  ')).toThrow(/reserved/i);
  });

  it('does not reject reserved words when they appear inside a longer slug', () => {
    expect(slugify('admin-panel')).toBe('admin-panel');
    expect(slugify('My API Reference')).toBe('my-api-reference');
  });

  it('preserves digits', () => {
    expect(slugify('Project 42, Year 2024')).toBe('project-42-year-2024');
  });
});
