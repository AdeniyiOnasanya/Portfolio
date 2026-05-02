import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { readSpy } = vi.hoisted(() => ({
  readSpy: vi.fn(),
}));

vi.mock('../content/site-json', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../content/site-json')>();
  readSpy.mockImplementation(actual.readSiteFromDisk);
  return { readSiteFromDisk: readSpy };
});

beforeEach(async () => {
  readSpy.mockClear();
  const { __resetSiteCache } = await import('../content');
  __resetSiteCache();
});

afterEach(async () => {
  const { __resetSiteCache } = await import('../content');
  __resetSiteCache();
});

describe('loadSite memoisation', () => {
  it('reads content/site.json from disk on the first call', async () => {
    const { loadSite } = await import('../content');
    const site = await loadSite();
    expect(site.person.name.length).toBeGreaterThan(0);
    expect(readSpy).toHaveBeenCalledTimes(1);
  });

  it('does not re-read site.json on subsequent calls within the same request', async () => {
    const { loadSite } = await import('../content');
    const first = await loadSite();
    const second = await loadSite();
    const third = await loadSite();
    expect(readSpy).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it('re-reads site.json after the cache is reset', async () => {
    const { loadSite, __resetSiteCache } = await import('../content');
    await loadSite();
    expect(readSpy).toHaveBeenCalledTimes(1);
    __resetSiteCache();
    await loadSite();
    expect(readSpy).toHaveBeenCalledTimes(2);
  });

  it('shares the in-flight promise so concurrent callers do not double-read', async () => {
    const { loadSite } = await import('../content');
    const [a, b, c] = await Promise.all([loadSite(), loadSite(), loadSite()]);
    expect(readSpy).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});
