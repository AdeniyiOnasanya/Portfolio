import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * reorderProjectsAction integration, Phase 7 slice #44.
 *
 * The action is the write surface ProjectsEditor calls when the operator
 * finishes a drag (or a keyboard pickup-move-drop). It must:
 *  - reject anonymous callers (auth() returns null);
 *  - reject any email that is not the configured ADMIN_EMAIL;
 *  - reject a payload that is not an array of non-empty strings;
 *  - on the happy path, read the current draft (or seed from MDX) via
 *    `readOrSeedProjects`, apply the new order, renumber `n` contiguously
 *    by index, and save the re-shaped projects array back to the draft.
 *
 * The store and the server-only seed seam are mocked at the module
 * boundary. `projects.server.ts` carries the `'server-only'` import that
 * throws under Node-side Vitest, so mocking it at `@/lib/draft/projects.server`
 * keeps the test in-process.
 */

const authMock = vi.fn<() => Promise<{ user?: { email?: string | null } } | null>>();
const saveDraftMock = vi.fn();
const readOrSeedProjectsMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  auth: () => authMock(),
}));

vi.mock('@/lib/draft/store', () => ({
  saveDraft: (...args: unknown[]) => saveDraftMock(...args),
  // getDraft and clearDraft are unused by the action under test but the
  // module exports must exist so consumer imports do not blow up.
  getDraft: vi.fn(),
  clearDraft: vi.fn(),
}));

// `projects.server` is the server-only seam between the action and the
// store. Mocking it at the module boundary avoids dragging the real
// `'server-only'` import (which throws under Node-side Vitest) into the
// test's module graph.
vi.mock('@/lib/draft/projects.server', () => ({
  readOrSeedProjects: (...args: unknown[]) => readOrSeedProjectsMock(...args),
  loadProjectsDraft: vi.fn(),
}));

beforeEach(() => {
  authMock.mockReset();
  saveDraftMock.mockReset();
  readOrSeedProjectsMock.mockReset();
  process.env.ADMIN_EMAIL = 'admin@example.com';
});

afterEach(() => {
  delete process.env.ADMIN_EMAIL;
});

async function loadAction() {
  const mod = await import('../actions');
  return mod.reorderProjectsAction;
}

const seed = (slugs: string[]) =>
  slugs.map((slug, index) => ({
    slug,
    n: String(index + 1).padStart(2, '0'),
    title: `Project ${slug}`,
  }));

describe('reorderProjectsAction', () => {
  it('rejects anonymous callers without touching the store', async () => {
    authMock.mockResolvedValue(null);
    const action = await loadAction();
    const result = await action(['a', 'b']);
    expect(result).toEqual({ ok: false, error: 'unauthenticated' });
    expect(saveDraftMock).not.toHaveBeenCalled();
    expect(readOrSeedProjectsMock).not.toHaveBeenCalled();
  });

  it('rejects a session whose email is not ADMIN_EMAIL', async () => {
    authMock.mockResolvedValue({ user: { email: 'someone-else@example.com' } });
    const action = await loadAction();
    const result = await action(['a', 'b']);
    expect(result).toEqual({ ok: false, error: 'forbidden' });
    expect(saveDraftMock).not.toHaveBeenCalled();
    expect(readOrSeedProjectsMock).not.toHaveBeenCalled();
  });

  it('rejects a payload that is not an array', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    const action = await loadAction();
    const result = await action('not an array');
    expect(result).toEqual({ ok: false, error: 'invalid_order' });
    expect(saveDraftMock).not.toHaveBeenCalled();
  });

  it('rejects an array containing non-string entries', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    const action = await loadAction();
    const result = await action(['a', 42, 'b']);
    expect(result).toEqual({ ok: false, error: 'invalid_order' });
    expect(saveDraftMock).not.toHaveBeenCalled();
  });

  it('rejects an array containing an empty string', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    const action = await loadAction();
    const result = await action(['a', '', 'b']);
    expect(result).toEqual({ ok: false, error: 'invalid_order' });
    expect(saveDraftMock).not.toHaveBeenCalled();
  });

  it('reorders, renumbers, and persists using the seed returned from readOrSeedProjects', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    readOrSeedProjectsMock.mockResolvedValue(seed(['a', 'b', 'c']));
    const stamp = new Date('2026-05-07T12:34:56.000Z');
    saveDraftMock.mockImplementation((_section: string, content: unknown) => ({
      id: 'projects',
      content,
      updatedAt: stamp,
    }));

    const action = await loadAction();
    const result = await action(['c', 'a', 'b']);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    expect(result.updatedAt).toBe(stamp.toISOString());
    expect(result.projects.map((p) => p.slug)).toEqual(['c', 'a', 'b']);
    expect(result.projects.map((p) => p.n)).toEqual(['01', '02', '03']);

    expect(saveDraftMock).toHaveBeenCalledTimes(1);
    expect(saveDraftMock).toHaveBeenCalledWith('projects', {
      projects: [
        expect.objectContaining({ slug: 'c', n: '01' }),
        expect.objectContaining({ slug: 'a', n: '02' }),
        expect.objectContaining({ slug: 'b', n: '03' }),
      ],
    });
    expect(readOrSeedProjectsMock).toHaveBeenCalledTimes(1);
  });

  it('treats unknown slugs in the order array as no-ops without dropping known ones', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    readOrSeedProjectsMock.mockResolvedValue(seed(['a', 'b', 'c']));
    saveDraftMock.mockImplementation((_section: string, content: unknown) => ({
      id: 'projects',
      content,
      updatedAt: new Date(),
    }));

    const action = await loadAction();
    const result = await action(['ghost', 'c', 'a']);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('unreachable');
    // c, a from the order; b from the tail since the stale client did not
    // mention it. Renumber runs across the merged list.
    expect(result.projects.map((p) => p.slug)).toEqual(['c', 'a', 'b']);
    expect(result.projects.map((p) => p.n)).toEqual(['01', '02', '03']);
  });
});
