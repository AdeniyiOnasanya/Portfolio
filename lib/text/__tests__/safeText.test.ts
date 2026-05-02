import { describe, expect, it } from 'vitest';
import { PersonSchema } from '../../schema';
import { SafeText } from '../safeText';

describe('SafeText', () => {
  it('accepts a clean string', () => {
    const result = SafeText.safeParse('plain prose, with commas.');
    expect(result.success).toBe(true);
  });

  it('accepts en-dash and curly quotes', () => {
    const result = SafeText.safeParse('a–b “c” it’s');
    expect(result.success).toBe(true);
  });

  it('accepts inline <em>...</em> HTML', () => {
    const result = SafeText.safeParse('a <em>strong</em> claim');
    expect(result.success).toBe(true);
  });

  it('rejects an empty string via min(1)', () => {
    const result = SafeText.safeParse('');
    expect(result.success).toBe(false);
  });

  it('rejects U+2014 with em-dash named in the message', () => {
    const result = SafeText.safeParse('before—after');
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join(' ');
      expect(message).toMatch(/em-dash/);
    }
  });

  it('rejects an emoji with emoji named in the message', () => {
    const result = SafeText.safeParse('hi \u{1F600}');
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join(' ');
      expect(message).toMatch(/emoji/);
    }
  });
});

describe('PersonSchema integration with SafeText', () => {
  const baseValidPerson = {
    name: 'Ada Lovelace',
    role: 'Software Engineer',
    location: 'London, United Kingdom',
    phone: '07000 000000',
    email: 'ada@example.com',
    cvUrl: 'assets/cv.pdf',
    cvDocxUrl: 'assets/cv.docx',
    github: 'https://github.com/example',
    linkedin: 'https://www.linkedin.com/in/example',
    yearsExp: 6,
    statement: 'A short statement that fits in one paragraph.',
    longBio: ['Paragraph one.', 'Paragraph two.', 'Paragraph three.'],
  };

  it('rejects when person.statement contains U+2014, with the path pointing at statement', () => {
    const result = PersonSchema.safeParse({
      ...baseValidPerson,
      statement: 'before—after',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const offendingIssue = result.error.issues.find(
        (issue) => issue.path[0] === 'statement',
      );
      expect(offendingIssue).toBeDefined();
      expect(offendingIssue?.message).toMatch(/em-dash/);
    }
  });
});
