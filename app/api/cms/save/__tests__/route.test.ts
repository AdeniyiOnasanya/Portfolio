import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * /api/cms/save route handler tests, Phase 8 slice #48.
 *
 * The handler is the publish surface the editor calls when the operator
 * presses the Publish button. The tests pin the auth contract and the
 * happy-path call sequence; the deeper integration tests for the commit
 * pipeline live in `lib/github/__tests__/commit.test.ts`.
 *
 * Module mocks:
 *  - `@/lib/auth` provides the session
 *  - `@/lib/draft/store` returns the draft row
 *  - `@/lib/content` provides the loaded site (used as the merge base)
 *  - `@/lib/github` provides the lazy Octokit factory
 *  - `@/lib/github/commit` exposes `publishCommit`; we spy on the call
 *    rather than re-test the inner logic here.
 */

const authMock = vi.fn<() => Promise<{ user?: { email?: string | null } } | null>>();
const getDraftMock = vi.fn();
const loadSiteMock = vi.fn();
const getOctokitMock = vi.fn();
const publishCommitMock = vi.fn();

vi.mock('@/lib/auth', () => ({
  auth: () => authMock(),
}));

vi.mock('@/lib/draft/store', () => ({
  getDraft: (...args: unknown[]) => getDraftMock(...args),
  saveDraft: vi.fn(),
  clearDraft: vi.fn(),
}));

vi.mock('@/lib/content', () => ({
  loadSite: () => loadSiteMock(),
}));

vi.mock('@/lib/github', () => ({
  getOctokit: () => getOctokitMock(),
}));

vi.mock('@/lib/github/commit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/github/commit')>('@/lib/github/commit');
  return {
    ...actual,
    publishCommit: (...args: unknown[]) => publishCommitMock(...args),
  };
});

const validSite = {
  person: {
    name: 'Ada Lovelace',
    role: 'Software Engineer',
    location: 'London',
    phone: '07000 000000',
    email: 'ada@example.com',
    cvUrl: '/cv/x.pdf',
    cvDocxUrl: '/cv/x.docx',
    github: 'https://github.com/example',
    linkedin: 'https://linkedin.com/in/example',
    yearsExp: 6,
    estYear: '2019',
    statement: 'A short statement.',
    longBio: ['Paragraph one.'],
  },
  hero: {
    meta: ['Available'],
    stats: [
      { value: '06', label: 'Years' },
      { value: '07', label: 'Projects' },
      { value: 'inf', label: 'CSS rewrites' },
    ],
  },
};

beforeEach(() => {
  authMock.mockReset();
  getDraftMock.mockReset();
  loadSiteMock.mockReset();
  getOctokitMock.mockReset();
  publishCommitMock.mockReset();
  process.env.ADMIN_EMAIL = 'admin@example.com';
  process.env.GITHUB_REPO = 'owner/repo';
  process.env.GITHUB_BRANCH_BASE = 'develop';
  process.env.GITHUB_TOKEN_CMS = 'present';
});

afterEach(() => {
  delete process.env.ADMIN_EMAIL;
  delete process.env.GITHUB_REPO;
  delete process.env.GITHUB_BRANCH_BASE;
  delete process.env.GITHUB_TOKEN_CMS;
});

async function loadHandler() {
  const mod = await import('../route');
  return mod.POST;
}

function makeRequest(body: unknown, origin?: string) {
  // happy-dom and the WHATWG `Request` constructor both strip the
  // `origin` header on synthetic same-process requests because it is a
  // forbidden fetch header. The route handler reads it via
  // `request.headers.get('origin')`, so the test builds a stub with an
  // explicit `Headers` map (mirroring the pattern in the upload route's
  // test, app/api/cms/upload/__tests__/route.test.ts lines 73 to 90)
  // rather than relying on the constructor to round-trip the value.
  const json = JSON.stringify(body);
  const headers = new Headers();
  headers.set('content-type', 'application/json');
  if (origin) headers.set('origin', origin);
  const stub = {
    headers,
    method: 'POST',
    url: 'https://admin.example.com/api/cms/save',
    async json(): Promise<unknown> {
      return JSON.parse(json);
    },
  };
  return stub as unknown as Request;
}

describe('POST /api/cms/save', () => {
  it('rejects an anonymous caller with 401', async () => {
    authMock.mockResolvedValue(null);
    const POST = await loadHandler();
    const response = await POST(makeRequest({ section: 'hero' }));
    expect(response.status).toBe(401);
    expect(publishCommitMock).not.toHaveBeenCalled();
  });

  it('rejects a non-admin email with 401', async () => {
    authMock.mockResolvedValue({ user: { email: 'someone@example.com' } });
    const POST = await loadHandler();
    const response = await POST(makeRequest({ section: 'hero' }));
    expect(response.status).toBe(401);
    expect(publishCommitMock).not.toHaveBeenCalled();
  });

  it('rejects a cross-origin POST with 403', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    const POST = await loadHandler();
    const req = makeRequest({ section: 'hero' }, 'https://attacker.example');
    const response = await POST(req);
    expect(response.status).toBe(403);
    expect(publishCommitMock).not.toHaveBeenCalled();
  });

  it('rejects an unknown section with 400', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    const POST = await loadHandler();
    const response = await POST(makeRequest({ section: 'not-a-section' }));
    expect(response.status).toBe(400);
    expect(publishCommitMock).not.toHaveBeenCalled();
  });

  it('rejects sections other than hero in this slice', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    const POST = await loadHandler();
    const response = await POST(makeRequest({ section: 'about' }));
    expect(response.status).toBe(400);
    expect(publishCommitMock).not.toHaveBeenCalled();
  });

  it('returns 422 if the draft does not pass HeroDraft validation', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    getDraftMock.mockResolvedValue({
      id: 'hero',
      content: 'a string is not a record',
      updatedAt: new Date(),
    });
    loadSiteMock.mockResolvedValue(validSite);
    const POST = await loadHandler();
    const response = await POST(makeRequest({ section: 'hero' }));
    expect(response.status).toBe(422);
    expect(publishCommitMock).not.toHaveBeenCalled();
  });

  it('returns 422 if no draft exists for the requested section', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    getDraftMock.mockResolvedValue(null);
    loadSiteMock.mockResolvedValue(validSite);
    const POST = await loadHandler();
    const response = await POST(makeRequest({ section: 'hero' }));
    expect(response.status).toBe(422);
    expect(publishCommitMock).not.toHaveBeenCalled();
  });

  it('returns 500 if GITHUB_REPO is unset', async () => {
    delete process.env.GITHUB_REPO;
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    getDraftMock.mockResolvedValue({
      id: 'hero',
      content: { person: { name: 'Grace Hopper' } },
      updatedAt: new Date(),
    });
    loadSiteMock.mockResolvedValue(validSite);
    const POST = await loadHandler();
    const response = await POST(makeRequest({ section: 'hero' }));
    expect(response.status).toBe(500);
  });

  it('publishes a hero edit and returns the PR URL on the happy path', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    getDraftMock.mockResolvedValue({
      id: 'hero',
      content: { person: { name: 'Grace Hopper', role: 'Compiler Pioneer' } },
      updatedAt: new Date(),
    });
    loadSiteMock.mockResolvedValue(validSite);
    getOctokitMock.mockReturnValue({ rest: {} });
    publishCommitMock.mockResolvedValue({
      pullRequestUrl: 'https://github.com/owner/repo/pull/42',
      pullRequestNumber: 42,
      branchName: 'cms/1746630000-hero',
    });

    const POST = await loadHandler();
    const response = await POST(makeRequest({ section: 'hero' }));

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      ok: true,
      pullRequestUrl: 'https://github.com/owner/repo/pull/42',
      pullRequestNumber: 42,
      branchName: 'cms/1746630000-hero',
    });
    expect(publishCommitMock).toHaveBeenCalledTimes(1);
    const args = publishCommitMock.mock.calls[0][0] as Record<string, unknown>;
    expect(args.owner).toBe('owner');
    expect(args.repo).toBe('repo');
    expect(args.baseBranch).toBe('develop');
    expect((args.branchName as string).startsWith('cms/')).toBe(true);
    expect(args.commitMessage).toMatch(/^cms: update hero \(\d+\)$/);
    expect(args.pullRequestTitle).toBe(args.commitMessage);
    expect(args.pullRequestBody).toBe('Updated hero section.');
  });

  it('maps a publishCommit forbidden-char throw to a 422', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    getDraftMock.mockResolvedValue({
      id: 'hero',
      content: { person: { statement: 'Em-dash will be caught.' } },
      updatedAt: new Date(),
    });
    loadSiteMock.mockResolvedValue(validSite);
    getOctokitMock.mockReturnValue({ rest: {} });
    publishCommitMock.mockRejectedValue(new Error('forbidden character "x" in content/site.json'));
    const POST = await loadHandler();
    const response = await POST(makeRequest({ section: 'hero' }));
    expect(response.status).toBe(422);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ ok: false });
  });
});
