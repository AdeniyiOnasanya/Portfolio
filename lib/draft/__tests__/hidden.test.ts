import { describe, expect, it } from 'vitest';
import { isDraftHidden, withHidden } from '../hidden';

describe('isDraftHidden', () => {
  it('returns false for null, undefined, primitives, and arrays', () => {
    expect(isDraftHidden(null)).toBe(false);
    expect(isDraftHidden(undefined)).toBe(false);
    expect(isDraftHidden('hidden')).toBe(false);
    expect(isDraftHidden(42)).toBe(false);
    expect(isDraftHidden([])).toBe(false);
  });

  it('returns false when hidden is missing, false, or non-boolean', () => {
    expect(isDraftHidden({})).toBe(false);
    expect(isDraftHidden({ person: { name: 'D' } })).toBe(false);
    expect(isDraftHidden({ hidden: false })).toBe(false);
    expect(isDraftHidden({ hidden: 'yes' })).toBe(false);
    expect(isDraftHidden({ hidden: 1 })).toBe(false);
  });

  it('returns true only when hidden is strictly true', () => {
    expect(isDraftHidden({ hidden: true })).toBe(true);
    expect(isDraftHidden({ hidden: true, person: { name: 'D' } })).toBe(true);
  });
});

describe('withHidden', () => {
  it('returns a fresh object even when the input is null or a primitive', () => {
    expect(withHidden(null, true)).toEqual({ hidden: true });
    expect(withHidden(undefined, false)).toEqual({ hidden: false });
    expect(withHidden('not an object', true)).toEqual({ hidden: true });
  });

  it('preserves every other field on the input record', () => {
    const input = { person: { name: 'D' }, draftRevision: 4 };
    const next = withHidden(input, true);
    expect(next).toEqual({ person: { name: 'D' }, draftRevision: 4, hidden: true });
  });

  it('overrides an existing hidden flag without mutating the input', () => {
    const input = { hidden: true, person: { name: 'D' } };
    const next = withHidden(input, false);
    expect(next).toEqual({ hidden: false, person: { name: 'D' } });
    expect(input.hidden).toBe(true);
  });

  it('is pure: input is not mutated', () => {
    const input: Record<string, unknown> = { person: { name: 'D' } };
    const snapshot = JSON.stringify(input);
    withHidden(input, true);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
