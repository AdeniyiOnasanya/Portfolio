import { describe, expect, it, vi } from 'vitest';
import {
  buildSiteJsonAfterHeroEdit,
  buildTreeEntries,
  CONTENT_SITE_JSON_PATH,
  publishCommit,
} from '../commit';

/*
 * Commit pipeline tests, Phase 8 slice #48.
 *
 * Two layers, both pure modulo the Octokit dependency:
 *
 *  1. `buildSiteJsonAfterHeroEdit` merges a `HeroDraft` into the loaded
 *     `Site` and returns the canonical JSON string for `content/site.json`.
 *     Pure: no fs reads, no env access. Tests assert the merged shape and
 *     the trailing newline that mirrors `content/site.json` on disk.
 *
 *  2. `buildTreeEntries` returns the flat `{path, mode, type, content}` list
 *     that `octokit.rest.git.createTree` expects. For the hero slice this
 *     is a single entry (`content/site.json`); the shape is exercised here
 *     so #49/#50/#52 can extend it without rewriting the call sequence.
 *
 *  3. `publishCommit` ties the two together with the Octokit dependency
 *     mocked. The integration test asserts the full call sequence:
 *     get-ref / create-blob / create-tree / create-commit / create-ref
 *     / create-pull. Each call sees the sha returned by the previous one
 *     so a misuse of the API (passing the wrong sha as parent, for
 *     example) is caught at the unit layer instead of at runtime.
 */

const baseSite = {
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
    longBio: ['Paragraph one.', 'Paragraph two.'],
  },
  hero: {
    meta: ['Available'],
    stats: [
      { value: '06', label: 'Years' },
      { value: '07', label: 'Projects' },
      { value: 'inf', label: 'CSS rewrites' },
    ],
  },
} as const;

describe('buildSiteJsonAfterHeroEdit', () => {
  it('merges the hero draft person into the existing site.person', () => {
    const merged = buildSiteJsonAfterHeroEdit(baseSite, {
      person: { name: 'Grace Hopper', role: 'Compiler Pioneer' },
    });
    const parsed = JSON.parse(merged);
    expect(parsed.person.name).toBe('Grace Hopper');
    expect(parsed.person.role).toBe('Compiler Pioneer');
    // Untouched fields survive the merge.
    expect(parsed.person.location).toBe('London');
    expect(parsed.person.email).toBe('ada@example.com');
  });

  it('terminates the JSON with a single trailing newline', () => {
    const merged = buildSiteJsonAfterHeroEdit(baseSite, { person: { name: 'Grace Hopper' } });
    expect(merged.endsWith('\n')).toBe(true);
    expect(merged.endsWith('\n\n')).toBe(false);
  });

  it('formats with two-space indent so site.json stays diff-friendly', () => {
    const merged = buildSiteJsonAfterHeroEdit(baseSite, { person: { name: 'Grace Hopper' } });
    expect(merged).toContain('\n  "person":');
  });

  it('drops draft fields whose value is undefined', () => {
    const merged = buildSiteJsonAfterHeroEdit(baseSite, {
      person: { name: 'Grace Hopper', role: undefined },
    });
    const parsed = JSON.parse(merged);
    // Untouched original wins; undefined never overwrites.
    expect(parsed.person.role).toBe('Software Engineer');
    expect(parsed.person.name).toBe('Grace Hopper');
  });

  it('throws if the hero draft contains a forbidden character', () => {
    // Built via String.fromCharCode so the test source itself stays clean
    // of the U+2014 byte that scripts/check-forbidden-chars.ts refuses;
    // the runtime byte the function rejects is identical.
    const emDash = String.fromCharCode(0x2014);
    expect(() =>
      buildSiteJsonAfterHeroEdit(baseSite, {
        person: { statement: `Em${emDash}dash slipped through.` },
      }),
    ).toThrow(/forbidden/i);
  });
});

describe('buildTreeEntries', () => {
  it('returns one entry for content/site.json with mode 100644', () => {
    const entries = buildTreeEntries({
      siteJson: '{"hero":1}\n',
    });
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      path: CONTENT_SITE_JSON_PATH,
      mode: '100644',
      type: 'blob',
    });
  });

  it('exposes the file content so the commit step can stage it as a blob', () => {
    const siteJson = '{"hero":1}\n';
    const entries = buildTreeEntries({ siteJson });
    expect(entries[0].content).toBe(siteJson);
  });
});

describe('publishCommit', () => {
  // Octokit shape we depend on. The mocks return the smallest plausible
  // payloads; the assertions below pin the call sequence and the
  // chained-sha contract between steps.
  type RestMock = {
    git: {
      getRef: ReturnType<typeof vi.fn>;
      createBlob: ReturnType<typeof vi.fn>;
      createTree: ReturnType<typeof vi.fn>;
      createCommit: ReturnType<typeof vi.fn>;
      createRef: ReturnType<typeof vi.fn>;
      updateRef: ReturnType<typeof vi.fn>;
    };
    pulls: {
      create: ReturnType<typeof vi.fn>;
      list: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  function makeOctokit(): { octokit: { rest: RestMock }; rest: RestMock } {
    const rest: RestMock = {
      git: {
        getRef: vi.fn().mockResolvedValue({
          data: { object: { sha: 'BASE_COMMIT_SHA' } },
        }),
        createBlob: vi.fn().mockResolvedValue({ data: { sha: 'BLOB_SHA' } }),
        createTree: vi.fn().mockResolvedValue({ data: { sha: 'TREE_SHA' } }),
        createCommit: vi.fn().mockResolvedValue({ data: { sha: 'COMMIT_SHA' } }),
        createRef: vi.fn().mockResolvedValue({
          data: { ref: 'refs/heads/cms/1-hero', object: { sha: 'COMMIT_SHA' } },
        }),
        updateRef: vi.fn().mockResolvedValue({
          data: { ref: 'refs/heads/cms/1-hero', object: { sha: 'COMMIT_SHA' } },
        }),
      },
      pulls: {
        create: vi.fn().mockResolvedValue({
          data: { number: 42, html_url: 'https://github.com/owner/repo/pull/42' },
        }),
        list: vi.fn().mockResolvedValue({ data: [] }),
        update: vi.fn().mockResolvedValue({
          data: { number: 42, html_url: 'https://github.com/owner/repo/pull/42' },
        }),
      },
    };
    return { octokit: { rest }, rest };
  }

  it('drives the create-ref to create-pull sequence in order', async () => {
    const { octokit, rest } = makeOctokit();
    const result = await publishCommit({
      octokit,
      owner: 'owner',
      repo: 'repo',
      baseBranch: 'develop',
      branchName: 'cms/1-hero',
      commitMessage: 'cms: update hero (1)',
      authorName: 'Operator',
      authorEmail: 'ops@example.com',
      pullRequestTitle: 'cms: update hero (1)',
      pullRequestBody: 'Updated hero section.',
      treeEntries: [
        { path: CONTENT_SITE_JSON_PATH, mode: '100644', type: 'blob', content: '{}\n' },
      ],
    });

    expect(rest.git.getRef).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      ref: 'heads/develop',
    });
    expect(rest.git.createBlob).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      content: '{}\n',
      encoding: 'utf-8',
    });
    expect(rest.git.createTree).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      base_tree: 'BASE_COMMIT_SHA',
      tree: [
        {
          path: CONTENT_SITE_JSON_PATH,
          mode: '100644',
          type: 'blob',
          sha: 'BLOB_SHA',
        },
      ],
    });
    expect(rest.git.createCommit).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      message: 'cms: update hero (1)',
      tree: 'TREE_SHA',
      parents: ['BASE_COMMIT_SHA'],
      author: {
        name: 'Operator',
        email: 'ops@example.com',
      },
    });
    expect(rest.git.createRef).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      ref: 'refs/heads/cms/1-hero',
      sha: 'COMMIT_SHA',
    });
    expect(rest.pulls.create).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      title: 'cms: update hero (1)',
      body: 'Updated hero section.',
      head: 'cms/1-hero',
      base: 'develop',
    });
    expect(result).toEqual({
      pullRequestUrl: 'https://github.com/owner/repo/pull/42',
      pullRequestNumber: 42,
      branchName: 'cms/1-hero',
      reused: false,
    });
  });

  it('refuses to commit if a tree entry contains a forbidden character', async () => {
    const { octokit, rest } = makeOctokit();
    await expect(
      publishCommit({
        octokit,
        owner: 'o',
        repo: 'r',
        baseBranch: 'develop',
        branchName: 'cms/1-hero',
        commitMessage: 'cms: update hero (1)',
        authorName: 'Operator',
        authorEmail: 'ops@example.com',
        pullRequestTitle: 'cms: update hero (1)',
        pullRequestBody: 'body',
        treeEntries: [
          {
            path: CONTENT_SITE_JSON_PATH,
            mode: '100644',
            type: 'blob',
            content: `{"x":"${String.fromCharCode(0x2014)}"}\n`,
          },
        ],
      }),
    ).rejects.toThrow(/forbidden/i);
    expect(rest.git.createBlob).not.toHaveBeenCalled();
    expect(rest.git.createRef).not.toHaveBeenCalled();
    expect(rest.pulls.create).not.toHaveBeenCalled();
  });

  /*
   * Slice #50, idempotent republish.
   *
   * The branch name is now deterministic per section, so a second publish
   * collides on `create-ref` with HTTP 422 "Reference already exists". The
   * pipeline must respond by issuing `update-ref` with `force: true` to
   * fast-forward the branch to the new commit, then look up the open PR for
   * the head/base pair. If a PR is open, reuse its URL and refresh its body
   * via `pulls.update`; if none, fall back to opening a fresh PR.
   *
   * The 422 mapping uses both the HTTP status and the message body so a
   * different 422 (validation, for example) does not silently fast-forward
   * a branch the operator did not intend to clobber.
   */

  function make422CollisionError(): Error & { status: number } {
    const error = new Error('Reference already exists') as Error & { status: number };
    error.status = 422;
    return error;
  }

  it('on createRef 422 collision, force-updates the ref and reuses the open PR', async () => {
    const { octokit, rest } = makeOctokit();
    rest.git.createRef.mockRejectedValueOnce(make422CollisionError());
    rest.pulls.list.mockResolvedValueOnce({
      data: [{ number: 42, html_url: 'https://github.com/owner/repo/pull/42' }],
    });
    rest.pulls.update.mockResolvedValueOnce({
      data: { number: 42, html_url: 'https://github.com/owner/repo/pull/42' },
    });

    const result = await publishCommit({
      octokit,
      owner: 'owner',
      repo: 'repo',
      baseBranch: 'develop',
      branchName: 'cms/hero-3a4f9b2c',
      commitMessage: 'cms: update hero',
      authorName: 'Operator',
      authorEmail: 'ops@example.com',
      pullRequestTitle: 'cms: update hero',
      pullRequestBody: 'Updated hero section.',
      treeEntries: [
        { path: CONTENT_SITE_JSON_PATH, mode: '100644', type: 'blob', content: '{}\n' },
      ],
    });

    expect(rest.git.createRef).toHaveBeenCalledTimes(1);
    expect(rest.git.updateRef).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      ref: 'heads/cms/hero-3a4f9b2c',
      sha: 'COMMIT_SHA',
      force: true,
    });
    expect(rest.pulls.list).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      head: 'owner:cms/hero-3a4f9b2c',
      base: 'develop',
      state: 'open',
    });
    expect(rest.pulls.update).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      pull_number: 42,
      body: 'Updated hero section.',
    });
    expect(rest.pulls.create).not.toHaveBeenCalled();
    expect(result).toEqual({
      pullRequestUrl: 'https://github.com/owner/repo/pull/42',
      pullRequestNumber: 42,
      branchName: 'cms/hero-3a4f9b2c',
      reused: true,
    });
  });

  it('on createRef 422 collision with no open PR, opens a fresh PR after force-update', async () => {
    const { octokit, rest } = makeOctokit();
    rest.git.createRef.mockRejectedValueOnce(make422CollisionError());
    rest.pulls.list.mockResolvedValueOnce({ data: [] });

    const result = await publishCommit({
      octokit,
      owner: 'owner',
      repo: 'repo',
      baseBranch: 'develop',
      branchName: 'cms/hero-3a4f9b2c',
      commitMessage: 'cms: update hero',
      authorName: 'Operator',
      authorEmail: 'ops@example.com',
      pullRequestTitle: 'cms: update hero',
      pullRequestBody: 'Updated hero section.',
      treeEntries: [
        { path: CONTENT_SITE_JSON_PATH, mode: '100644', type: 'blob', content: '{}\n' },
      ],
    });

    expect(rest.git.updateRef).toHaveBeenCalledTimes(1);
    expect(rest.pulls.update).not.toHaveBeenCalled();
    expect(rest.pulls.create).toHaveBeenCalledTimes(1);
    expect(result.reused).toBe(false);
    expect(result.pullRequestNumber).toBe(42);
  });

  it('does not fall back to update-ref for a non-422 createRef failure', async () => {
    const { octokit, rest } = makeOctokit();
    const boom = new Error('upstream blew up') as Error & { status: number };
    boom.status = 500;
    rest.git.createRef.mockRejectedValueOnce(boom);

    await expect(
      publishCommit({
        octokit,
        owner: 'owner',
        repo: 'repo',
        baseBranch: 'develop',
        branchName: 'cms/hero-3a4f9b2c',
        commitMessage: 'cms: update hero',
        authorName: 'Operator',
        authorEmail: 'ops@example.com',
        pullRequestTitle: 'cms: update hero',
        pullRequestBody: 'Updated hero section.',
        treeEntries: [
          { path: CONTENT_SITE_JSON_PATH, mode: '100644', type: 'blob', content: '{}\n' },
        ],
      }),
    ).rejects.toThrow(/upstream blew up/i);
    expect(rest.git.updateRef).not.toHaveBeenCalled();
    expect(rest.pulls.list).not.toHaveBeenCalled();
    expect(rest.pulls.update).not.toHaveBeenCalled();
    expect(rest.pulls.create).not.toHaveBeenCalled();
  });
});
