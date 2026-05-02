import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    readFile: vi.fn(actual.readFile),
  };
});

const fsPromises = await import('node:fs/promises');
const readFileMock = fsPromises.readFile as unknown as ReturnType<typeof vi.fn>;

beforeEach(async () => {
  readFileMock.mockClear();
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
    expect(readFileMock).toHaveBeenCalledTimes(1);
  });

  it('does not re-read site.json on subsequent calls within the same request', async () => {
    const { loadSite } = await import('../content');
    const first = await loadSite();
    const second = await loadSite();
    const third = await loadSite();
    expect(readFileMock).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it('re-reads site.json after the cache is reset', async () => {
    const { loadSite, __resetSiteCache } = await import('../content');
    await loadSite();
    expect(readFileMock).toHaveBeenCalledTimes(1);
    __resetSiteCache();
    await loadSite();
    expect(readFileMock).toHaveBeenCalledTimes(2);
  });

  it('shares the in-flight promise so concurrent callers do not double-read', async () => {
    const { loadSite } = await import('../content');
    const [a, b, c] = await Promise.all([loadSite(), loadSite(), loadSite()]);
    expect(readFileMock).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});
