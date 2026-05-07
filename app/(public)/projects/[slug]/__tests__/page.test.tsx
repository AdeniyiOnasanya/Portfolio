import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProjectPage, { generateStaticParams } from '../page';

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

const KNOWN_SLUGS = [
  'multi-cloud-platform',
  'foster-care-platform',
  'compliance-electron',
  'calendar-tool',
  'microplastics-mobile',
  'endoscope-tracking',
  'elearning-platform',
] as const;

describe('generateStaticParams for /projects/[slug]', () => {
  it('returns one params entry for every slug in site.json', async () => {
    const params = await generateStaticParams();
    expect(params.map((p) => p.slug)).toEqual([...KNOWN_SLUGS]);
  });
});

describe('ProjectPage at /projects/[slug]', () => {
  it.each(KNOWN_SLUGS)('renders the case-study heading for %s', async (slug) => {
    const ui = await ProjectPage({ params: Promise.resolve({ slug }) });
    render(ui);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent?.length ?? 0).toBeGreaterThan(0);
  });

  it('calls notFound() for an unknown slug', async () => {
    await expect(
      ProjectPage({ params: Promise.resolve({ slug: 'unknown-slug-does-not-exist' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
