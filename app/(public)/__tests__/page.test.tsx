import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  sampleAiPractice,
  sampleExperience,
  sampleFooter,
  sampleHero,
  samplePerson,
  sampleProjectList,
  sampleProjects,
  sampleSkills,
} from '../../../components/public/__tests__/fixtures';
import HomePage from '../page';

vi.mock('../../../lib/content', () => ({
  loadSite: vi.fn(),
}));

vi.mock('../../../lib/projects', () => ({
  loadProjectFiles: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const { loadSite } = await import('../../../lib/content');
const loadSiteMock = loadSite as unknown as ReturnType<typeof vi.fn>;
const { loadProjectFiles } = await import('../../../lib/projects');
const loadProjectFilesMock = loadProjectFiles as unknown as ReturnType<typeof vi.fn>;
const projectFilesFixture = sampleProjectList.map((frontmatter) => ({
  slug: frontmatter.slug,
  frontmatter,
  body: 'sample body.',
}));

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

async function renderHome() {
  loadSiteMock.mockResolvedValueOnce(baseSite);
  loadProjectFilesMock.mockResolvedValueOnce(projectFilesFixture);
  const ui = await HomePage();
  return render(ui);
}

describe('HomePage at /', () => {
  it('renders exactly one h1', async () => {
    await renderHome();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders all section regions when every visibility flag is true', async () => {
    await renderHome();
    expect(screen.getByRole('heading', { level: 1, name: samplePerson.name })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'About' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Skills' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Experience' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Selected work' })).toBeInTheDocument();
    // The Footer no longer carries an explicit h2 heading; the design handoff
    // uses a styled big-block "Let's talk." span instead. The `<footer>`
    // element still exposes the contentinfo landmark for screen readers.
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('hides About when settings.visibility.about is false', async () => {
    loadSiteMock.mockResolvedValueOnce({
      ...baseSite,
      settings: {
        ...baseSite.settings,
        visibility: { ...baseSite.settings.visibility, about: false },
      },
    });
    loadProjectFilesMock.mockResolvedValueOnce(projectFilesFixture);
    const ui = await HomePage();
    render(ui);
    expect(screen.queryByRole('region', { name: 'About' })).toBeNull();
  });

  it('hides Skills, Experience, AI Practice, and Projects when their visibility flags are false', async () => {
    loadSiteMock.mockResolvedValueOnce({
      ...baseSite,
      settings: {
        ...baseSite.settings,
        visibility: {
          about: true,
          skills: false,
          experience: false,
          ai: false,
          work: false,
          commandPalette: true,
        },
      },
    });
    loadProjectFilesMock.mockResolvedValueOnce(projectFilesFixture);
    const ui = await HomePage();
    render(ui);
    expect(screen.queryByRole('region', { name: 'Skills' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Experience' })).toBeNull();
    expect(screen.queryByRole('region', { name: /AI/i })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Selected work' })).toBeNull();
  });

  it('always renders the Footer regardless of visibility flags', async () => {
    loadSiteMock.mockResolvedValueOnce({
      ...baseSite,
      settings: {
        ...baseSite.settings,
        visibility: {
          about: false,
          skills: false,
          experience: false,
          ai: false,
          work: false,
          commandPalette: false,
        },
      },
    });
    loadProjectFilesMock.mockResolvedValueOnce(projectFilesFixture);
    const ui = await HomePage();
    render(ui);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
