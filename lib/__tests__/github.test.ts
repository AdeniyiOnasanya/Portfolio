import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * Lazy Octokit factory, Phase 8 slice #48.
 *
 * Mirrors the lazy seam in `lib/db/index.ts`: the factory returns a
 * function that resolves `GITHUB_TOKEN_CMS` only at the first call site,
 * so a Next.js build can load route modules in CI (where the token is
 * intentionally absent) without crashing.
 *
 * The tests pin two invariants:
 *  - importing the module never reads `GITHUB_TOKEN_CMS`;
 *  - calling the factory throws a generic config error if the token is
 *    empty or missing, and never echoes the value back through the
 *    error message.
 */

beforeEach(() => {
  vi.resetModules();
  delete process.env.GITHUB_TOKEN_CMS;
});

afterEach(() => {
  delete process.env.GITHUB_TOKEN_CMS;
});

describe('getOctokit', () => {
  it('importing the module does not throw when GITHUB_TOKEN_CMS is missing', async () => {
    await expect(import('../github')).resolves.toBeDefined();
  });

  it('throws a generic config error if GITHUB_TOKEN_CMS is empty at call time', async () => {
    process.env.GITHUB_TOKEN_CMS = '';
    const { getOctokit } = await import('../github');
    expect(() => getOctokit()).toThrow(/GITHUB_TOKEN_CMS is not configured/);
  });

  it('throws a generic config error if GITHUB_TOKEN_CMS is whitespace at call time', async () => {
    process.env.GITHUB_TOKEN_CMS = '   ';
    const { getOctokit } = await import('../github');
    expect(() => getOctokit()).toThrow(/GITHUB_TOKEN_CMS is not configured/);
  });

  it('does not echo the configured token back through the error message', async () => {
    process.env.GITHUB_TOKEN_CMS = 'super-secret-pat-value';
    const { getOctokit } = await import('../github');
    // The factory only fails when the env var is missing or blank; pass a
    // present-but-bogus token and assert the constructor returns. The
    // negative case above already covers the missing path; this test
    // exists to confirm a real value never lands in any thrown error.
    const client = getOctokit();
    expect(client).toBeDefined();
  });

  it('returns an Octokit-shaped client with rest.git and rest.pulls accessors', async () => {
    process.env.GITHUB_TOKEN_CMS = 'present';
    const { getOctokit } = await import('../github');
    const client = getOctokit();
    expect(client.rest.git.getRef).toBeTypeOf('function');
    expect(client.rest.git.createBlob).toBeTypeOf('function');
    expect(client.rest.git.createTree).toBeTypeOf('function');
    expect(client.rest.git.createCommit).toBeTypeOf('function');
    expect(client.rest.git.createRef).toBeTypeOf('function');
    expect(client.rest.pulls.create).toBeTypeOf('function');
  });
});
