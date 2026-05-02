import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { validateSiteJsonFile } from '../validate-content';

let workdir: string;

beforeAll(() => {
  workdir = mkdtempSync(join(tmpdir(), 'validate-content-'));
});

afterAll(() => {
  rmSync(workdir, { recursive: true, force: true });
});

function writeFixture(name: string, body: string): string {
  const path = join(workdir, name);
  writeFileSync(path, body, 'utf8');
  return path;
}

describe('validateSiteJsonFile', () => {
  it('returns ok for the actual content/site.json shipped in the repo', () => {
    const result = validateSiteJsonFile(join(process.cwd(), 'content', 'site.json'));
    expect(result.ok).toBe(true);
  });

  it('returns a path-aware error when the file does not exist', () => {
    const missing = join(workdir, 'does-not-exist.json');
    const result = validateSiteJsonFile(missing);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain(missing);
      expect(result.message.toLowerCase()).toContain('could not read');
    }
  });

  it('returns a clear error when the JSON is syntactically invalid', () => {
    const path = writeFixture('broken.json', '{ "person": {');
    const result = validateSiteJsonFile(path);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain(path);
      expect(result.message).toMatch(/invalid json/i);
    }
  });

  it('reports the failing field path when the schema rejects the content', () => {
    const path = writeFixture(
      'malformed.json',
      JSON.stringify({
        person: {
          name: 'Ada',
          role: 'Engineer',
          location: 'London',
          phone: '07000 000000',
          email: 'ada@example.com',
          cvUrl: '/cv.pdf',
          cvDocxUrl: '/cv.docx',
          github: 'not-a-url',
          linkedin: 'https://www.linkedin.com/in/ada',
          yearsExp: 6,
          statement: 'one',
          longBio: ['one'],
        },
        skills: [{ label: 'Languages', items: ['TS'] }],
        experience: [
          {
            role: 'r',
            company: 'c',
            where: 'w',
            when: 'when',
            desc: 'd',
            tags: ['t'],
          },
        ],
        projects: [],
        certs: ['x'],
        education: [{ degree: 'd', school: 's', result: 'r' }],
        aiPractice: {
          eyebrow: 'e',
          headline: 'h',
          intro: 'i',
          pillars: [{ n: 'i.', title: 't', body: 'b' }],
          workflow: [{ k: 'k', v: 'v' }],
        },
        footer: { heading: 'h', copy: 'c', availability: 'a', copyright: 'c' },
        settings: {
          defaultTheme: 'system',
          intro: true,
          visibility: {
            about: true,
            skills: true,
            experience: true,
            ai: true,
            work: true,
            commandPalette: true,
          },
        },
      }),
    );
    const result = validateSiteJsonFile(path);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain(path);
      expect(result.message).toContain('person.github');
      expect(result.message).toContain('projects');
    }
  });
});
