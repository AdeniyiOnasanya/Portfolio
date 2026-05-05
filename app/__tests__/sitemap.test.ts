import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  sampleAiPractice,
  sampleExperience,
  sampleFooter,
  sampleHero,
  samplePerson,
  sampleProjects,
  sampleSkills,
} from '../../components/public/__tests__/fixtures';

vi.mock('../../lib/content', () => ({
  loadSite: vi.fn(),
}));

const { loadSite } = await import('../../lib/content');
const loadSiteMock = vi.mocked(loadSite);

const baseSite = {
  person: samplePerson,
  hero: sampleHero,
  skills: sampleSkills,
  experience: sampleExperience,
  projects: sampleProjects,
  certs: ['AWS Cert'],
  education: [{ degree: 'BSc', school: 'University', result: 'First-Class Honours' }],
  aiPractice: sampleAiPractice,
  footer: sampleFooter,
  settings: {
    defaultTheme: 'system' as const,
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
};

const ORIGINAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

beforeEach(() => {
  loadSiteMock.mockReset();
  vi.resetModules();
});

afterEach(() => {
  if (ORIGINAL_SITE_URL === undefined) {
    delete process.env.NEXT_PUBLIC_SITE_URL;
  } else {
    process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL_SITE_URL;
  }
});

describe('app/sitemap.ts', () => {
  it('lists the home page plus every project slug', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    loadSiteMock.mockResolvedValueOnce(baseSite);
    const sitemap = (await import('../sitemap')).default;
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(urls).toEqual([
      'https://davidonasanya.com',
      'https://davidonasanya.com/projects/project-one',
      'https://davidonasanya.com/projects/project-two',
      'https://davidonasanya.com/projects/project-three',
    ]);
  });

  it('uses NEXT_PUBLIC_SITE_URL when set', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://staging.example.com';
    loadSiteMock.mockResolvedValueOnce(baseSite);
    const sitemap = (await import('../sitemap')).default;
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);
    expect(urls[0]).toBe('https://staging.example.com');
    expect(urls[1]).toBe('https://staging.example.com/projects/project-one');
  });

  it('matches the snapshot for the seed project list', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    loadSiteMock.mockResolvedValueOnce(baseSite);
    const sitemap = (await import('../sitemap')).default;
    const entries = await sitemap();
    expect(entries.map((entry) => ({ url: entry.url }))).toMatchInlineSnapshot(`
      [
        {
          "url": "https://davidonasanya.com",
        },
        {
          "url": "https://davidonasanya.com/projects/project-one",
        },
        {
          "url": "https://davidonasanya.com/projects/project-two",
        },
        {
          "url": "https://davidonasanya.com/projects/project-three",
        },
      ]
    `);
  });
});

describe('app/robots.ts', () => {
  it('allows indexing of the public site and points at /sitemap.xml', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    const robots = (await import('../robots')).default;
    expect(robots()).toMatchInlineSnapshot(`
      {
        "host": "https://davidonasanya.com",
        "rules": [
          {
            "allow": "/",
            "userAgent": "*",
          },
        ],
        "sitemap": "https://davidonasanya.com/sitemap.xml",
      }
    `);
  });

  it('uses NEXT_PUBLIC_SITE_URL when set', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://staging.example.com';
    const robots = (await import('../robots')).default;
    const result = robots();
    expect(result.sitemap).toBe('https://staging.example.com/sitemap.xml');
    expect(result.host).toBe('https://staging.example.com');
  });
});

describe('app/manifest.ts', () => {
  it('returns a Web App Manifest sourced from site content', async () => {
    loadSiteMock.mockResolvedValueOnce(baseSite);
    const manifest = (await import('../manifest')).default;
    const result = await manifest();
    expect(result).toMatchInlineSnapshot(`
      {
        "background_color": "#0a0a0a",
        "display": "standalone",
        "name": "Ada Lovelace",
        "short_name": "Ada",
        "start_url": "/",
        "theme_color": "#7cd87a",
      }
    `);
  });

  it('keeps short_name within the 12-character home-screen budget', async () => {
    loadSiteMock.mockResolvedValueOnce({
      ...baseSite,
      person: { ...baseSite.person, name: 'David Onasanya' },
    });
    const manifest = (await import('../manifest')).default;
    const result = await manifest();
    expect(result.short_name).toBe('David');
    expect((result.short_name as string).length).toBeLessThanOrEqual(12);
  });
});
