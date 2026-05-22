import { describe, expect, it } from 'vitest';
import { ContactPayloadSchema } from '../schema';

const base = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'A short hello.',
  turnstileToken: 't-stub',
};

describe('ContactPayloadSchema', () => {
  it('parses a clean submission', () => {
    expect(ContactPayloadSchema.safeParse(base).success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = ContactPayloadSchema.safeParse({ ...base, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a name longer than 120 characters', () => {
    const result = ContactPayloadSchema.safeParse({ ...base, name: 'a'.repeat(121) });
    expect(result.success).toBe(false);
  });

  it('rejects a U+2014 em-dash in name', () => {
    const result = ContactPayloadSchema.safeParse({
      ...base,
      name: `Ada${String.fromCodePoint(0x2014)}L`,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'name');
      expect(issue?.message).toContain('U+2014');
    }
  });

  it('rejects an emoji in message', () => {
    const result = ContactPayloadSchema.safeParse({
      ...base,
      message: `Hi ${String.fromCodePoint(0x1f600)}`,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'message');
      expect(issue?.message).toContain('emoji');
    }
  });

  it('rejects a malformed email', () => {
    const result = ContactPayloadSchema.safeParse({ ...base, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects a message longer than 4000 characters', () => {
    const result = ContactPayloadSchema.safeParse({ ...base, message: 'a'.repeat(4001) });
    expect(result.success).toBe(false);
  });

  it('rejects an empty turnstileToken', () => {
    const result = ContactPayloadSchema.safeParse({ ...base, turnstileToken: '' });
    expect(result.success).toBe(false);
  });
});
