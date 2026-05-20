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

/*
 * Manifest snapshot tests, Phase 9 slice #56.
 *
 * The PWA manifest's `theme_color` is the one piece of brand identity
 * that propagates beyond the page: the Android home-screen tile, the
 * iOS Safari status bar, and the Chrome custom-tab shell all read it.
 * Snapshotting the resolved JSON here pins both the source-of-truth
 * link to `lib/seo/brand-colors.ts` (#56) and the short_name truncation
 * rule that landed earlier. A drift on either surface fails CI before
 * shipping a wrong colour to users' devices.
 */

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
    accentToken: 'brand-500' as const,
    fontStack: 'inter' as const,
  },
};

describe('manifest()', () => {
  it('renders theme_color from brand 500 token, not a stale hex literal', async () => {
    loadSiteMock.mockResolvedValue(baseSite);
    const { default: manifest } = await import('../manifest');
    const result = await manifest();
    // The expected hex is the sRGB resolution of oklch(0.78 0.18 145).
    // Pinning the value here means a token change in tokens.css that
    // does not propagate to brand-colors.ts will fail this snapshot
    // before reaching the device home screen.
    expect(result.theme_color).toBe('#61d46a');
    expect(result.background_color).toBe('#0a0a0a');
  });

  it('uses the first space-separated name token as short_name', async () => {
    loadSiteMock.mockResolvedValue({
      ...baseSite,
      person: { ...samplePerson, name: 'David Onasanya' },
    });
    const { default: manifest } = await import('../manifest');
    const result = await manifest();
    expect(result.short_name).toBe('David');
    expect(result.name).toBe('David Onasanya');
  });

  it('falls back to the full name when there is no whitespace to split on', async () => {
    loadSiteMock.mockResolvedValue({
      ...baseSite,
      person: { ...samplePerson, name: 'Mononym' },
    });
    const { default: manifest } = await import('../manifest');
    const result = await manifest();
    expect(result.short_name).toBe('Mononym');
    expect(result.name).toBe('Mononym');
  });
});
