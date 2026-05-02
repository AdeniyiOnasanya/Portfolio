import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  sampleAiPractice,
  sampleExperience,
  sampleFooter,
  samplePerson,
  sampleProjects,
  sampleSkills,
} from '../../../components/public/__tests__/fixtures';
import HomePage from '../page';

vi.mock('../../../lib/content', () => ({
  loadSite: vi.fn(),
}));

const { loadSite } = await import('../../../lib/content');
const loadSiteMock = loadSite as unknown as ReturnType<typeof vi.fn>;

const baseSite = {
  person: samplePerson,
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
  const ui = await HomePage();
  return render(ui);
}

describe('HomePage at /', () => {
  it('renders exactly one h1', async () => {
    await renderHome();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders all section headings when every visibility flag is true', async () => {
    await renderHome();
    expect(screen.getByRole('heading', { level: 1, name: samplePerson.name })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'About' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Skills' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Experience' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Selected work' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: sampleFooter.heading }),
    ).toBeInTheDocument();
  });

  it('hides About when settings.visibility.about is false', async () => {
    loadSiteMock.mockResolvedValueOnce({
      ...baseSite,
      settings: {
        ...baseSite.settings,
        visibility: { ...baseSite.settings.visibility, about: false },
      },
    });
    const ui = await HomePage();
    render(ui);
    expect(screen.queryByRole('heading', { level: 2, name: 'About' })).toBeNull();
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
    const ui = await HomePage();
    render(ui);
    expect(screen.queryByRole('heading', { level: 2, name: 'Skills' })).toBeNull();
    expect(screen.queryByRole('heading', { level: 2, name: 'Experience' })).toBeNull();
    expect(screen.queryByRole('heading', { level: 2, name: /AI/i })).toBeNull();
    expect(screen.queryByRole('heading', { level: 2, name: 'Selected work' })).toBeNull();
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
    const ui = await HomePage();
    render(ui);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
