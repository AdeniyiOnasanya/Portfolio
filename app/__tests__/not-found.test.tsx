import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  sampleAiPractice,
  sampleExperience,
  sampleFooter,
  sampleHero,
  samplePerson,
  sampleProjects,
  sampleSkills,
} from '../../components/public/__tests__/fixtures';
import { ThemeProvider } from '../../components/shared/ThemeProvider';
import RootNotFound from '../not-found';

vi.mock('../../lib/content', () => ({
  loadSite: vi.fn(),
}));

const { loadSite } = await import('../../lib/content');
const loadSiteMock = loadSite as unknown as ReturnType<typeof vi.fn>;

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

async function renderNotFound() {
  loadSiteMock.mockResolvedValueOnce(baseSite);
  const ui = await RootNotFound();
  // The root layout wraps every route, including the not-found, in
  // ThemeProvider so the chrome ThemeToggle has access to useTheme(). The
  // test reproduces that wrapping rather than re-mounting the whole layout.
  return render(
    <ThemeProvider initialMode="system" initialEffective="dark">
      {ui}
    </ThemeProvider>,
  );
}

describe('RootNotFound at /not-found', () => {
  it('renders exactly one h1', async () => {
    await renderNotFound();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('renders the "Page not found" heading at h1', async () => {
    await renderNotFound();
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  });

  it('renders a back-to-home link pointing at /', async () => {
    await renderNotFound();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/');
  });

  it('renders the public Footer landmark for brand chrome continuity', async () => {
    await renderNotFound();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
