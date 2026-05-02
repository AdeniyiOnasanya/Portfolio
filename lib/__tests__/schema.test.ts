import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AiPracticeSchema,
  CertsSchema,
  EducationSchema,
  ExperienceSchema,
  FooterSchema,
  PersonSchema,
  ProjectSchema,
  ProjectsSchema,
  SettingsSchema,
  SiteSchema,
  SkillsSchema,
} from '../schema';

const SITE_JSON = JSON.parse(
  readFileSync(join(process.cwd(), 'content', 'site.json'), 'utf8'),
) as unknown;

const validPerson = {
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

const validProject = {
  slug: 'sample-project',
  n: '01',
  title: 'Sample',
  subtitle: 'A sample project',
  year: '2024',
  role: 'Lead engineer',
  kind: 'Web platform',
  stack: ['Laravel', 'React'],
  tagline: 'A short tagline.',
  summary: 'A short summary in one paragraph.',
  visuals: [
    { label: 'Wide hero shot', w: 'wide', span: 2 },
    { label: 'Tall detail', w: 'tall' },
  ],
  meta: { Year: '2024', Role: 'Lead', Sector: 'SaaS', Status: 'In production' },
};

const validDeepDive = {
  metricsIntro: 'Numbers from production.',
  metrics: [
    { value: '18', suffix: '%', label: 'reduction', note: 'sampled monthly' },
    { value: '2', prefix: '->', suffix: ' min', label: 'time-to-first-sync' },
    { value: '60', label: 'screens shipped' },
  ],
  beforeAfter: {
    intro: 'Before and after.',
    beforeLabel: 'Two consoles',
    afterLabel: 'One pane',
  },
  process: [
    { title: 'Discovery', desc: 'Two weeks shadowing operators.' },
    { title: 'Build', desc: 'Three months building.' },
  ],
  lessons: [
    { title: 'Boring is a feature.', body: 'Trust beats delight.' },
    { title: 'Spec the seams.', body: 'Provider abstraction earned its keep.' },
  ],
};

describe('PersonSchema', () => {
  it('parses a valid person', () => {
    expect(() => PersonSchema.parse(validPerson)).not.toThrow();
  });

  it('rejects when statement is empty', () => {
    const result = PersonSchema.safeParse({ ...validPerson, statement: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join('.'))).toContain('statement');
    }
  });

  it('rejects when github is not a URL', () => {
    const result = PersonSchema.safeParse({ ...validPerson, github: 'not a url' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join('.'))).toContain('github');
    }
  });

  it('rejects when yearsExp is negative', () => {
    const result = PersonSchema.safeParse({ ...validPerson, yearsExp: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join('.'))).toContain('yearsExp');
    }
  });

  it('rejects when longBio has fewer than one paragraph', () => {
    const result = PersonSchema.safeParse({ ...validPerson, longBio: [] });
    expect(result.success).toBe(false);
  });
});

describe('SkillsSchema', () => {
  it('parses a valid list of skill groups', () => {
    expect(() =>
      SkillsSchema.parse([
        { label: 'Languages', items: ['TypeScript', 'PHP'] },
        { label: 'Frameworks', items: ['React'] },
      ]),
    ).not.toThrow();
  });

  it('rejects an empty items array on a group', () => {
    const result = SkillsSchema.safeParse([{ label: 'Empty', items: [] }]);
    expect(result.success).toBe(false);
  });
});

describe('ExperienceSchema', () => {
  it('parses a valid experience array', () => {
    expect(() =>
      ExperienceSchema.parse([
        {
          role: 'Software Engineer',
          company: 'ACME',
          where: 'London',
          when: '2020, 2024',
          desc: 'Did things.',
          tags: ['Laravel', 'React'],
        },
      ]),
    ).not.toThrow();
  });

  it('rejects when tags is empty', () => {
    const result = ExperienceSchema.safeParse([
      {
        role: 'Software Engineer',
        company: 'ACME',
        where: 'London',
        when: '2020, 2024',
        desc: 'Did things.',
        tags: [],
      },
    ]);
    expect(result.success).toBe(false);
  });
});

describe('ProjectSchema', () => {
  it('parses a valid project without deepDive', () => {
    expect(() => ProjectSchema.parse(validProject)).not.toThrow();
  });

  it('parses a valid project with deepDive', () => {
    expect(() => ProjectSchema.parse({ ...validProject, deepDive: validDeepDive })).not.toThrow();
  });

  it('rejects when slug is not kebab-case-friendly (uppercase)', () => {
    const result = ProjectSchema.safeParse({ ...validProject, slug: 'Bad-Slug' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.path.join('.'))).toContain('slug');
    }
  });

  it('rejects when visuals.span is greater than 2', () => {
    const result = ProjectSchema.safeParse({
      ...validProject,
      visuals: [{ label: 'too wide', w: 'wide', span: 3 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects when visuals.w is not wide or tall', () => {
    const result = ProjectSchema.safeParse({
      ...validProject,
      visuals: [{ label: 'square', w: 'square' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects when meta is missing required keys', () => {
    const result = ProjectSchema.safeParse({
      ...validProject,
      meta: { Year: '2024', Role: 'Lead' },
    });
    expect(result.success).toBe(false);
  });

  it('captures issue paths for nested deepDive metrics', () => {
    const result = ProjectSchema.safeParse({
      ...validProject,
      deepDive: {
        ...validDeepDive,
        metrics: [{ value: '', label: 'broken' }],
      },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths.some((p) => p.startsWith('deepDive.metrics.0'))).toBe(true);
    }
  });
});

describe('AiPracticeSchema', () => {
  it('parses a valid aiPractice block', () => {
    const valid = {
      eyebrow: 'AI in the loop',
      headline: 'I ship faster, and better, with AI in the loop.',
      intro: 'Daily toolchain.',
      pillars: [
        { n: 'i.', title: 'Spec first.', body: 'Every task starts with intent.' },
        { n: 'ii.', title: 'Review every diff.', body: 'Generated code reviewed line by line.' },
      ],
      workflow: [
        { k: 'Spec', v: 'Plain-English intent.' },
        { k: 'Review', v: 'Diff-by-diff.' },
      ],
    };
    expect(() => AiPracticeSchema.parse(valid)).not.toThrow();
  });

  it('preserves an inline em tag inside headline', () => {
    const headlineWithEm = 'I ship faster, and better, with <em>AI in the loop</em>.';
    const valid = {
      eyebrow: 'AI in the loop',
      headline: headlineWithEm,
      intro: 'Daily toolchain.',
      pillars: [{ n: 'i.', title: 'Spec.', body: 'Body.' }],
      workflow: [{ k: 'Spec', v: 'Intent.' }],
    };
    const parsed = AiPracticeSchema.parse(valid);
    expect(parsed.headline).toBe(headlineWithEm);
  });
});

describe('FooterSchema', () => {
  it('parses a valid footer', () => {
    expect(() =>
      FooterSchema.parse({
        heading: 'Hello.',
        copy: 'A line of copy.',
        availability: 'Available now',
        copyright: '(c) 2026',
      }),
    ).not.toThrow();
  });
});

describe('SettingsSchema', () => {
  it('parses settings with all visibility flags', () => {
    expect(() =>
      SettingsSchema.parse({
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
      }),
    ).not.toThrow();
  });

  it('rejects an unknown defaultTheme', () => {
    const result = SettingsSchema.safeParse({
      defaultTheme: 'midnight',
      intro: true,
      visibility: {
        about: true,
        skills: true,
        experience: true,
        ai: true,
        work: true,
        commandPalette: true,
      },
    });
    expect(result.success).toBe(false);
  });
});

describe('CertsSchema and EducationSchema', () => {
  it('parses certs as a non-empty array of strings', () => {
    expect(() => CertsSchema.parse(['AWS Certified Solutions Architect'])).not.toThrow();
  });

  it('rejects an empty certs array', () => {
    expect(CertsSchema.safeParse([]).success).toBe(false);
  });

  it('parses education entries with degree, school, result', () => {
    expect(() =>
      EducationSchema.parse([
        { degree: 'BSc Computing', school: 'Some University', result: 'First-Class Honours' },
      ]),
    ).not.toThrow();
  });
});

describe('ProjectsSchema', () => {
  it('parses an ordered list of kebab-case slugs', () => {
    expect(() => ProjectsSchema.parse(['one', 'two-things', 'three'])).not.toThrow();
  });

  it('rejects an empty slug list', () => {
    expect(ProjectsSchema.safeParse([]).success).toBe(false);
  });

  it('rejects an entry that is not kebab-case', () => {
    expect(ProjectsSchema.safeParse(['Bad-Slug']).success).toBe(false);
  });

  it('rejects duplicate slugs and reports the duplicate index', () => {
    const result = ProjectsSchema.safeParse(['one', 'two', 'one']);
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('2');
    }
  });
});

describe('SiteSchema', () => {
  it('parses the actual content/site.json without throwing', () => {
    expect(() => SiteSchema.parse(SITE_JSON)).not.toThrow();
  });

  it('rejects when projects is empty', () => {
    const valid = SiteSchema.parse(SITE_JSON);
    const broken = { ...valid, projects: [] };
    expect(SiteSchema.safeParse(broken).success).toBe(false);
  });

  it('round-trips: parsing the parse result returns the same shape', () => {
    const first = SiteSchema.parse(SITE_JSON);
    const second = SiteSchema.parse(first);
    expect(second).toEqual(first);
  });
});
