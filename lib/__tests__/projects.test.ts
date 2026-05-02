import { describe, expect, it } from 'vitest';
import { loadProjectFiles } from '../projects';

const KNOWN_SLUGS = [
  'multi-cloud-platform',
  'foster-care-platform',
  'compliance-electron',
  'calendar-tool',
  'microplastics-mobile',
  'endoscope-tracking',
  'elearning-platform',
] as const;

describe('loadProjectFiles', () => {
  it('returns files in the order declared by site.json projects[]', async () => {
    const files = await loadProjectFiles();
    expect(files.map((f) => f.slug)).toEqual([...KNOWN_SLUGS]);
  });

  it.each(KNOWN_SLUGS)('parses frontmatter and yields a non-empty body for %s', async (slug) => {
    const files = await loadProjectFiles();
    const file = files.find((f) => f.slug === slug);
    expect(file, `expected an mdx file for slug ${slug}`).toBeDefined();
    if (!file) return;
    expect(file.frontmatter.slug).toBe(slug);
    expect(file.frontmatter.title.length).toBeGreaterThan(0);
    expect(file.frontmatter.subtitle.length).toBeGreaterThan(0);
    expect(file.frontmatter.stack.length).toBeGreaterThan(0);
    expect(file.frontmatter.visuals.length).toBeGreaterThan(0);
    expect(file.body.trim().length).toBeGreaterThan(0);
  });

  it('frontmatter for the lead project includes deepDive case-study sections', async () => {
    const files = await loadProjectFiles();
    const stratus = files.find((f) => f.slug === 'multi-cloud-platform');
    expect(stratus).toBeDefined();
    expect(stratus?.frontmatter.deepDive).toBeDefined();
    expect((stratus?.body ?? '').toLowerCase()).toContain('problem');
    expect((stratus?.body ?? '').toLowerCase()).toContain('approach');
    expect((stratus?.body ?? '').toLowerCase()).toContain('outcome');
  });
});
