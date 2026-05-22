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
      branchName: 'cms/hero-3a4f9b2c',
      reused: false,
    });

    const POST = await loadHandler();
    const response = await POST(makeRequest({ section: 'hero' }));

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      ok: true,
      pullRequestUrl: 'https://github.com/owner/repo/pull/42',
      pullRequestNumber: 42,
      branchName: 'cms/hero-3a4f9b2c',
      reused: false,
    });
    expect(publishCommitMock).toHaveBeenCalledTimes(1);
    const args = publishCommitMock.mock.calls[0][0] as Record<string, unknown>;
    expect(args.owner).toBe('owner');
    expect(args.repo).toBe('repo');
    expect(args.baseBranch).toBe('develop');
    expect(args.branchName).toMatch(/^cms\/hero-[0-9a-f]{8}$/);
    expect(args.commitMessage).toMatch(/^cms: update hero \(\d+\)$/);
    expect(args.pullRequestTitle).toBe(args.commitMessage);
    // #52: PR body is now a real plain-language diff. The header line is
    // fixed and each changed leaf field is listed as a single bullet. The
    // fixture above changes `person.name` and `person.role`; both bullets
    // appear with the dot path rooted at `hero.person`, ordered by the
    // summariser's stable lexical sort.
    const pullRequestBody = args.pullRequestBody as string;
    expect(pullRequestBody.startsWith('Hero section update from the admin CMS.\n')).toBe(true);
    expect(pullRequestBody).toContain(
      '- Changed `hero.person.name` from "Ada Lovelace" to "Grace Hopper"',
    );
    expect(pullRequestBody).toContain(
      '- Changed `hero.person.role` from "Software Engineer" to "Compiler Pioneer"',
    );
    expect(pullRequestBody).not.toContain('Updated hero section.');
  });

  it('returns the same PR URL with reused=true when publish is pressed twice on the same section', async () => {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    getDraftMock.mockResolvedValue({
      id: 'hero',
      content: { person: { name: 'Grace Hopper' } },
      updatedAt: new Date(),
    });
    loadSiteMock.mockResolvedValue(validSite);
    getOctokitMock.mockReturnValue({ rest: {} });
    publishCommitMock.mockResolvedValueOnce({
      pullRequestUrl: 'https://github.com/owner/repo/pull/42',
      pullRequestNumber: 42,
      branchName: 'cms/hero-3a4f9b2c',
      reused: false,
    });
    publishCommitMock.mockResolvedValueOnce({
      pullRequestUrl: 'https://github.com/owner/repo/pull/42',
      pullRequestNumber: 42,
      branchName: 'cms/hero-3a4f9b2c',
      reused: true,
    });

    const POST = await loadHandler();
    const first = (await (await POST(makeRequest({ section: 'hero' }))).json()) as Record<
      string,
      unknown
    >;
    const second = (await (await POST(makeRequest({ section: 'hero' }))).json()) as Record<
      string,
      unknown
    >;

    expect(first.pullRequestUrl).toBe('https://github.com/owner/repo/pull/42');
    expect(first.reused).toBe(false);
    expect(second.pullRequestUrl).toBe(first.pullRequestUrl);
    expect(second.reused).toBe(true);
    // Both calls received the same deterministic branch name.
    const firstArgs = publishCommitMock.mock.calls[0][0] as Record<string, unknown>;
    const secondArgs = publishCommitMock.mock.calls[1][0] as Record<string, unknown>;
    expect(firstArgs.branchName).toBe(secondArgs.branchName);
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

  it('returns a structured forbidden_character body naming the field on draft em-dash', async () => {
    // U+2014 sits in the merged Site at person.name; the handler must
    // surface a 422 with `error: 'forbidden_character'`, `field:
    // 'hero.person.name'`, and never reach the Octokit pipeline. Built
    // via String.fromCharCode so the test source itself stays clean of
    // U+2014.
    const emDash = String.fromCharCode(0x2014);
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    getDraftMock.mockResolvedValue({
      id: 'hero',
      content: { person: { name: `Grace${emDash}Hopper` } },
      updatedAt: new Date(),
    });
    loadSiteMock.mockResolvedValue(validSite);
    getOctokitMock.mockReturnValue({ rest: {} });
    const POST = await loadHandler();
    const response = await POST(makeRequest({ section: 'hero' }));
    expect(response.status).toBe(422);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      ok: false,
      error: 'forbidden_character',
      field: 'hero.person.name',
    });
    // Pipeline must not be reached: no branch and no PR can leak when
    // the scan refuses the input.
    expect(publishCommitMock).not.toHaveBeenCalled();
  });

  it('returns a structured forbidden_character body when an emoji lands in person.statement', async () => {
    const emoji = String.fromCodePoint(0x1f600);
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    getDraftMock.mockResolvedValue({
      id: 'hero',
      content: { person: { statement: `Hi ${emoji} there.` } },
      updatedAt: new Date(),
    });
    loadSiteMock.mockResolvedValue(validSite);
    getOctokitMock.mockReturnValue({ rest: {} });
    const POST = await loadHandler();
    const response = await POST(makeRequest({ section: 'hero' }));
    expect(response.status).toBe(422);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      ok: false,
      error: 'forbidden_character',
      field: 'hero.person.statement',
    });
    expect(publishCommitMock).not.toHaveBeenCalled();
  });

  /*
   * Token / repo configuration mappings, slice #51.
   *
   * The publishCommit Octokit calls can fail with 401 (token revoked or
   * invalid), 403 (token missing required scope) or 404 (repo not found
   * or PAT lacks repository access). Each HTTP status maps to a stable
   * `errorCode` string the modal already understands. The route must
   * never echo Octokit's raw `error.message` because GitHub responses
   * sometimes include rate-limit headers, request IDs, or partial token
   * fingerprints; the operator-facing copy is the modal's job.
   */

  type RequestErrorLike = Error & {
    status: number;
    request?: { method?: string; url?: string };
  };

  function makeOctokitError(
    status: number,
    url = 'https://api.github.com/repos/owner/repo/git/refs',
  ): RequestErrorLike {
    const error = new Error(
      `mocked upstream: token=ghp_PARTIAL ratelimit-remaining=0`,
    ) as RequestErrorLike;
    error.name = 'HttpError';
    error.status = status;
    error.request = { method: 'POST', url };
    return error;
  }

  function primeAdminAndDraft() {
    authMock.mockResolvedValue({ user: { email: 'admin@example.com' } });
    getDraftMock.mockResolvedValue({
      id: 'hero',
      content: { person: { name: 'Grace Hopper' } },
      updatedAt: new Date(),
    });
    loadSiteMock.mockResolvedValue(validSite);
    getOctokitMock.mockReturnValue({ rest: {} });
  }

  it('maps a 401 from publishCommit to errorCode token_invalid', async () => {
    primeAdminAndDraft();
    publishCommitMock.mockRejectedValue(makeOctokitError(401));
    const POST = await loadHandler();
    const response = await POST(makeRequest({ section: 'hero' }));
    expect(response.status).toBe(401);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ ok: false, error: 'token_invalid' });
  });

  it('maps a 403 from publishCommit to errorCode token_scope', async () => {
    primeAdminAndDraft();
    publishCommitMock.mockRejectedValue(makeOctokitError(403));
    const POST = await loadHandler();
    const response = await POST(makeRequest({ section: 'hero' }));
    expect(response.status).toBe(403);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ ok: false, error: 'token_scope' });
  });

  it('maps a 404 from publishCommit to errorCode repo_not_found', async () => {
    primeAdminAndDraft();
    publishCommitMock.mockRejectedValue(makeOctokitError(404));
    const POST = await loadHandler();
    const response = await POST(makeRequest({ section: 'hero' }));
    expect(response.status).toBe(404);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ ok: false, error: 'repo_not_found' });
  });

  it('does not echo the raw GitHub error message in the JSON body', async () => {
    primeAdminAndDraft();
    publishCommitMock.mockRejectedValue(makeOctokitError(401));
    const POST = await loadHandler();
    const response = await POST(makeRequest({ section: 'hero' }));
    const text = await response.text();
    // Defence: the partial-token fingerprint and the rate-limit hint that
    // the mock embeds in the error message must never reach the wire.
    expect(text).not.toContain('ghp_PARTIAL');
    expect(text).not.toContain('ratelimit-remaining');
  });

  it('maps a 500 from publishCommit to the generic upstream_error', async () => {
    primeAdminAndDraft();
    publishCommitMock.mockRejectedValue(makeOctokitError(500));
    const POST = await loadHandler();
    const response = await POST(makeRequest({ section: 'hero' }));
    expect(response.status).toBe(502);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ ok: false, error: 'upstream_error' });
  });
});
