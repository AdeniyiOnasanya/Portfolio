import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AdminSectionId } from '@/components/admin/sections';

/*
 * saveDraftAction integration, Phase 7 slice #42.
 *
 * The action is the write surface that the Hero editor calls every 300 ms
 * after a keystroke. It must:
 *  - reject anonymous callers (auth() returns null);
 *  - reject any email that is not the configured ADMIN_EMAIL;
 *  - reject an unknown section id;
 *  - reject non-object content;
 *  - on the happy path, call `saveDraft(section, content)` and surface
 *    the row's updatedAt as an ISO string.
 *
 * The whole timing budget for the slice is 350 ms end-to-end. The action
 * itself runs entirely in JS (the database call is mocked here), so it
 * must complete in well under that window; the assertion below pins it
 * generously at 200 ms to leave the network round-trip a real budget.
 */

const authMock = vi.fn<() => Promise<{ user?: { email?: string | null } } | null>>();
const saveDraftMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  auth: () => authMock(),
}));

vi.mock('@/lib/draft/store', () => ({
  saveDraft: (...args: unknown[]) => saveDraftMock(...args),
}));

beforeEach(() => {
  authMock.mockReset();
  saveDraftMock.mockReset();
  process.env.ADMIN_EMAIL = 'admin@example.com';
});

afterEach(() => {
  delete process.env.ADMIN_EMAIL;
});

async function loadAction() {
  const mod = await import('../actions');
  return mod.saveDraftAction;
}

describe('saveDraftAction', () => {
  it('rejects anonymous callers without touching the store', async () => {
    authMock.mockResolvedValue(null);
    const action = await loadAction();
    const result = await action('hero', { person: { name: 'Test' } });
    expect(result).toEqual({ ok: false, error: 'unauthenticated' });
    expect(saveDraftMock).not.toHaveBeenCalled();
  });

  it('rejects a session whose email is not ADMIN_EMAIL', async () => {
    authMock.mockResolvedValue({ user: { email: 'someone-else@example.com' } });
    const action = await loadAction();
    const result = await action('hero', { person: { name: 'Test' } });
    expect(result).toEqual({ ok: false, error: 'forbidden' });
    expect(saveDraftMock).not.toHaveBeenCalled();
  });

  it('rejects an unknown section id', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    const action = await loadAction();
    // Cast through `unknown` to a valid AdminSectionId so we feed a
    // deliberately-wrong value at runtime without bypassing the type system
    // any wider than the test requires.
    const result = await action('not-a-section' as unknown as AdminSectionId, { person: {} });
    expect(result).toEqual({ ok: false, error: 'invalid_section' });
    expect(saveDraftMock).not.toHaveBeenCalled();
  });

  it('rejects non-object content', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    const action = await loadAction();
    const result = await action('hero', 'not an object');
    expect(result).toEqual({ ok: false, error: 'invalid_content' });
    expect(saveDraftMock).not.toHaveBeenCalled();
  });

  it('persists the draft and returns the ISO updatedAt on the happy path', async () => {
    authMock.mockResolvedValue({ user: { email: 'ADMIN@example.com' } });
    const stamp = new Date('2026-05-07T12:34:56.000Z');
    saveDraftMock.mockResolvedValue({ id: 'hero', content: { person: {} }, updatedAt: stamp });
    const action = await loadAction();
    const result = await action('hero', { person: { name: 'Test' } });
    expect(result).toEqual({ ok: true, updatedAt: stamp.toISOString() });
    expect(saveDraftMock).toHaveBeenCalledTimes(1);
    expect(saveDraftMock).toHaveBeenCalledWith('hero', { person: { name: 'Test' } });
  });

  it('completes well within the 350 ms slice budget', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    saveDraftMock.mockResolvedValue({
      id: 'hero',
      content: { person: { name: 'x' } },
      updatedAt: new Date(),
    });
    const action = await loadAction();
    const start = performance.now();
    const result = await action('hero', { person: { name: 'x' } });
    const elapsed = performance.now() - start;
    expect(result.ok).toBe(true);
    expect(elapsed).toBeLessThan(200);
  });
});
