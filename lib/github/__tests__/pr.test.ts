import { describe, expect, it, vi } from 'vitest';
import type { OctokitClient } from '../commit';
import { createPullRequest } from '../pr';

/*
 * createPullRequest, Phase 8 slice #48.
 *
 * Thin wrapper around `octokit.rest.pulls.create` so the route handler
 * does not poke at the Octokit shape directly. The test asserts the
 * pass-through and the URL extraction.
 */

function makeOctokit(payload: { number: number; html_url: string }): {
  octokit: OctokitClient;
  create: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn().mockResolvedValue({ data: payload });
  const octokit: OctokitClient = {
    rest: {
      git: {
        getRef: vi.fn(),
        createBlob: vi.fn(),
        createTree: vi.fn(),
        createCommit: vi.fn(),
        createRef: vi.fn(),
      },
      pulls: { create },
    },
  };
  return { octokit, create };
}

describe('createPullRequest', () => {
  it('forwards the title, body, head, and base to octokit.rest.pulls.create', async () => {
    const { octokit, create } = makeOctokit({
      number: 7,
      html_url: 'https://github.com/o/r/pull/7',
    });
    const result = await createPullRequest({
      octokit,
      owner: 'o',
      repo: 'r',
      title: 'cms: update hero (1)',
      body: 'Updated hero section.',
      head: 'cms/1-hero',
      base: 'develop',
    });
    expect(create).toHaveBeenCalledWith({
      owner: 'o',
      repo: 'r',
      title: 'cms: update hero (1)',
      body: 'Updated hero section.',
      head: 'cms/1-hero',
      base: 'develop',
    });
    expect(result).toEqual({
      pullRequestUrl: 'https://github.com/o/r/pull/7',
      pullRequestNumber: 7,
    });
  });
});
