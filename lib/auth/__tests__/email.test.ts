import { describe, expect, it } from 'vitest';
import { AuthEmailPayloadSchema, buildAuthEmail } from '../email';

/*
 * Sign-in email payload validation, Phase 6 slice (#40).
 *
 * Auth.js v5 ships a default sendVerificationRequest for its Resend
 * provider that builds subject and body strings internally. The slice
 * replaces that default with a layer that composes the payload, parses it
 * through `AuthEmailPayloadSchema`, and only then delegates to the Resend
 * SDK; the schema rejects U+2014 (em-dash) and any
 * `Extended_Pictographic` codepoint so neither character can reach an
 * inbox.
 *
 * The Resend SDK call itself is not exercised here: that is an HTTP side
 * effect covered by the Playwright sign-in spec against a Vercel preview.
 * This test stays narrow on the schema and the builder.
 *
 * Forbidden codepoints are constructed at runtime from char codes
 * (`String.fromCharCode(0x2014)` for the em-dash and
 * `String.fromCodePoint(0x1F600)` and friends for the emoji samples) so
 * that the source bytes of this file never themselves contain a forbidden
 * character. `pnpm check:forbidden` therefore stays clean while the
 * runtime payload still carries the offending codepoint that the schema
 * is supposed to reject.
 */

const EM_DASH = String.fromCharCode(0x2014);
const EMOJI_GRINNING = String.fromCodePoint(0x1f600);
const EMOJI_PARTY = String.fromCodePoint(0x1f389);
const EMOJI_WAVE = String.fromCodePoint(0x1f44b);
const EMOJI_ROCKET = String.fromCodePoint(0x1f680);

const VALID_PAYLOAD = {
  from: 'David Onasanya <auth@davidonasanya.com>',
  to: 'admin@example.com',
  subject: 'Sign in to davidonasanya.com',
  html: '<p>Click the link to finish signing in.</p>',
  text: 'Click the link to finish signing in.',
};

describe('AuthEmailPayloadSchema', () => {
  it('accepts a clean payload', () => {
    const result = AuthEmailPayloadSchema.safeParse(VALID_PAYLOAD);
    expect(result.success).toBe(true);
  });

  it('rejects a payload with U+2014 in subject', () => {
    const result = AuthEmailPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      subject: `Sign in${EM_DASH}davidonasanya.com`,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'subject');
      expect(issue?.message).toMatch(/em-dash/);
    }
  });

  it('rejects a payload with U+2014 in html', () => {
    const result = AuthEmailPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      html: `<p>before${EM_DASH}after</p>`,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'html');
      expect(issue?.message).toMatch(/em-dash/);
    }
  });

  it('rejects a payload with U+2014 in text', () => {
    const result = AuthEmailPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      text: `before${EM_DASH}after`,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'text');
      expect(issue?.message).toMatch(/em-dash/);
    }
  });

  it('rejects a payload with U+2014 in from', () => {
    const result = AuthEmailPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      from: `David${EM_DASH}Onasanya <auth@davidonasanya.com>`,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'from');
      expect(issue?.message).toMatch(/em-dash/);
    }
  });

  it('rejects a payload with an emoji in subject', () => {
    const result = AuthEmailPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      subject: `Sign in ${EMOJI_GRINNING}`,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'subject');
      expect(issue?.message).toMatch(/emoji/);
    }
  });

  it('rejects a payload with an emoji in html', () => {
    const result = AuthEmailPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      html: `<p>welcome ${EMOJI_PARTY}</p>`,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'html');
      expect(issue?.message).toMatch(/emoji/);
    }
  });

  it('rejects a payload with an emoji in text', () => {
    const result = AuthEmailPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      text: `welcome ${EMOJI_WAVE}`,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'text');
      expect(issue?.message).toMatch(/emoji/);
    }
  });

  it('rejects a payload with an emoji in from', () => {
    const result = AuthEmailPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      from: `David ${EMOJI_ROCKET} <auth@davidonasanya.com>`,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'from');
      expect(issue?.message).toMatch(/emoji/);
    }
  });

  it('rejects a payload whose to is not a valid email', () => {
    const result = AuthEmailPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      to: 'not-an-email',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === 'to');
      expect(issue).toBeDefined();
    }
  });

  it('rejects an empty subject', () => {
    const result = AuthEmailPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      subject: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty html', () => {
    const result = AuthEmailPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      html: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty text', () => {
    const result = AuthEmailPayloadSchema.safeParse({
      ...VALID_PAYLOAD,
      text: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('buildAuthEmail()', () => {
  const URL_SAMPLE =
    'https://davidonasanya.com/api/auth/callback/resend?token=abc&email=admin%40example.com';

  it('returns a payload whose subject names the host parsed from url', () => {
    const payload = buildAuthEmail({
      to: 'admin@example.com',
      url: URL_SAMPLE,
      from: 'auth@davidonasanya.com',
    });
    expect(payload.subject).toContain('davidonasanya.com');
  });

  it('embeds the magic-link url in both html and text bodies', () => {
    const payload = buildAuthEmail({
      to: 'admin@example.com',
      url: URL_SAMPLE,
      from: 'auth@davidonasanya.com',
    });
    expect(payload.html).toContain(URL_SAMPLE);
    expect(payload.text).toContain(URL_SAMPLE);
  });

  it('passes the recipient through unchanged', () => {
    const payload = buildAuthEmail({
      to: 'admin@example.com',
      url: URL_SAMPLE,
      from: 'auth@davidonasanya.com',
    });
    expect(payload.to).toBe('admin@example.com');
    expect(payload.from).toBe('auth@davidonasanya.com');
  });

  it('throws when from contains U+2014', () => {
    expect(() =>
      buildAuthEmail({
        to: 'admin@example.com',
        url: URL_SAMPLE,
        from: `David${EM_DASH}Onasanya <auth@davidonasanya.com>`,
      }),
    ).toThrow();
  });

  it('throws when the host override carries forbidden chars', () => {
    expect(() =>
      buildAuthEmail({
        to: 'admin@example.com',
        url: URL_SAMPLE,
        from: 'auth@davidonasanya.com',
        host: `davidonasanya.com${EM_DASH}staging`,
      }),
    ).toThrow();
  });

  it('throws when from contains an emoji', () => {
    expect(() =>
      buildAuthEmail({
        to: 'admin@example.com',
        url: URL_SAMPLE,
        from: `David ${EMOJI_ROCKET} <auth@davidonasanya.com>`,
      }),
    ).toThrow();
  });

  it('produces deterministic output for identical inputs', () => {
    const a = buildAuthEmail({
      to: 'admin@example.com',
      url: URL_SAMPLE,
      from: 'auth@davidonasanya.com',
    });
    const b = buildAuthEmail({
      to: 'admin@example.com',
      url: URL_SAMPLE,
      from: 'auth@davidonasanya.com',
    });
    expect(a).toEqual(b);
  });
});
