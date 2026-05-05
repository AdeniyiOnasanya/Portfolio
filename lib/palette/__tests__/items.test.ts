import { describe, expect, it } from 'vitest';
import type { Site } from '../../schema';
import { buildPaletteItems } from '../items';

// Local Site fixture. The schema-level guarantees are covered in
// lib/__tests__/schema.test.ts; this test cares only about the deterministic
// shape of buildPaletteItems for a given Site, so an inline literal cast to
// Site is enough and keeps the test free of fs reads.
const baseSite: Site = {
  person: {
    name: 'Ada Lovelace',
    nameAccent: 'Lovelace',
    role: 'Software Engineer',
    location: 'London, United Kingdom',
    phone: '07000 000000',
    email: 'ada@example.com',
    cvUrl: '/cv/ada.pdf',
    cvDocxUrl: '/cv/ada.docx',
    github: 'https://github.com/example',
    linkedin: 'https://www.linkedin.com/in/example',
    yearsExp: 6,
    statement: 'A short statement that fits in one paragraph.',
    longBio: ['Paragraph one.', 'Paragraph two.'],
  },
  skills: [{ label: 'Languages', items: ['TypeScript'] }],
  experience: [
    {
      role: 'Software Engineer',
      company: 'Acme',
      where: 'London',
      when: '2024, Present',
      desc: 'Building things that work.',
      tags: ['TypeScript'],
    },
  ],
  projects: ['project-one', 'project-two', 'project-three'],
  certs: ['Some cert'],
  education: [{ degree: 'BSc', school: 'Uni', result: 'First' }],
  aiPractice: {
    eyebrow: 'AI',
    headline: 'Headline.',
    intro: 'Intro.',
    pillars: [{ n: 'i.', title: 'Title.', body: 'Body.' }],
    workflow: [{ k: 'Spec', v: 'Plain.' }],
  },
  footer: {
    heading: 'Let us talk.',
    copy: 'Open to roles.',
    availability: 'Available now',
    copyright: '(c) 2026 Ada Lovelace.',
  },
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
};

describe('buildPaletteItems', () => {
  it('returns items in the fixed group order: Navigation, Projects, Contact, Theme', () => {
    const items = buildPaletteItems(baseSite);
    const groups = items.map((item) => item.group);

    let lastIndex = -1;
    const order = ['Navigation', 'Projects', 'Contact', 'Theme'] as const;
    for (const group of groups) {
      const index = order.indexOf(group);
      expect(index).toBeGreaterThanOrEqual(lastIndex);
      lastIndex = index;
    }
  });

  it('emits navigation entries in the documented sequence', () => {
    const items = buildPaletteItems(baseSite);
    const navLabels = items.filter((item) => item.group === 'Navigation').map((item) => item.label);
    expect(navLabels).toEqual(['Home', 'About', 'Skills', 'Experience', 'AI Practice', 'Projects']);
  });

  it('emits one Project item per slug, in site.projects order, after Navigation', () => {
    const items = buildPaletteItems(baseSite);
    const projectItems = items.filter((item) => item.group === 'Projects');
    expect(projectItems).toHaveLength(baseSite.projects.length);
    expect(projectItems.map((item) => item.label)).toEqual([
      'project-one',
      'project-two',
      'project-three',
    ]);
    expect(projectItems[0]?.action).toEqual({ kind: 'link', href: '/projects/project-one' });
  });

  it('emits Contact actions: email mailto, GitHub, LinkedIn, CV download', () => {
    const items = buildPaletteItems(baseSite);
    const contact = items.filter((item) => item.group === 'Contact');
    expect(contact.map((item) => item.label)).toEqual([
      'Email',
      'GitHub',
      'LinkedIn',
      'Download CV',
    ]);

    const email = contact.find((item) => item.label === 'Email');
    expect(email?.action).toEqual({ kind: 'link', href: `mailto:${baseSite.person.email}` });

    const cv = contact.find((item) => item.label === 'Download CV');
    expect(cv?.action).toEqual({ kind: 'link', href: baseSite.person.cvUrl, download: true });
  });

  it('emits Theme actions for system, light, and dark in that order', () => {
    const items = buildPaletteItems(baseSite);
    const theme = items.filter((item) => item.group === 'Theme');
    expect(theme.map((item) => item.label)).toEqual([
      'Theme: System',
      'Theme: Light',
      'Theme: Dark',
    ]);
    expect(theme.map((item) => (item.action.kind === 'theme' ? item.action.mode : null))).toEqual([
      'system',
      'light',
      'dark',
    ]);
  });

  it('omits Skills from Navigation when settings.visibility.skills is false', () => {
    const site: Site = {
      ...baseSite,
      settings: {
        ...baseSite.settings,
        visibility: { ...baseSite.settings.visibility, skills: false },
      },
    };
    const labels = buildPaletteItems(site)
      .filter((item) => item.group === 'Navigation')
      .map((item) => item.label);
    expect(labels).not.toContain('Skills');
    expect(labels).toEqual(['Home', 'About', 'Experience', 'AI Practice', 'Projects']);
  });

  it('omits the Projects group entirely when settings.visibility.work is false', () => {
    const site: Site = {
      ...baseSite,
      settings: {
        ...baseSite.settings,
        visibility: { ...baseSite.settings.visibility, work: false },
      },
    };
    const items = buildPaletteItems(site);
    expect(items.filter((item) => item.group === 'Projects')).toEqual([]);
    expect(items.filter((item) => item.label === 'Projects')).toEqual([]);
  });

  it('returns an empty array when settings.visibility.commandPalette is false', () => {
    const site: Site = {
      ...baseSite,
      settings: {
        ...baseSite.settings,
        visibility: { ...baseSite.settings.visibility, commandPalette: false },
      },
    };
    expect(buildPaletteItems(site)).toEqual([]);
  });

  it('produces deterministic output across calls (snapshot)', () => {
    const first = buildPaletteItems(baseSite);
    const second = buildPaletteItems(baseSite);
    expect(second).toEqual(first);
    expect(first.map((item) => `${item.group}:${item.id}`)).toMatchInlineSnapshot(`
      [
        "Navigation:nav-home",
        "Navigation:nav-about",
        "Navigation:nav-skills",
        "Navigation:nav-experience",
        "Navigation:nav-ai-practice",
        "Navigation:nav-projects",
        "Projects:project-project-one",
        "Projects:project-project-two",
        "Projects:project-project-three",
        "Contact:contact-email",
        "Contact:contact-github",
        "Contact:contact-linkedin",
        "Contact:contact-cv",
        "Theme:theme-system",
        "Theme:theme-light",
        "Theme:theme-dark",
      ]
    `);
  });
});
