import type { OctokitClient } from './commit';

/**
 * Thin wrapper around `octokit.rest.pulls.create`, Phase 8 slice #48.
 *
 * The wrapper exists so the route handler in `app/api/cms/save/route.ts`
 * has a single named verb for "open a PR" rather than calling the Octokit
 * REST surface directly. Decoupling the call here also gives slice #50
 * (idempotent re-publish) a single place to flip the title prefix once
 * a follow-up commit lands on the same branch.
 *
 * The function is pure modulo the injected Octokit; the unit test feeds a
 * hand-rolled mock so no network or credentials are touched.
 */

export type CreatePullRequestInput = {
  octokit: OctokitClient;
  owner: string;
  repo: string;
  title: string;
  body: string;
  head: string;
  base: string;
};

export type CreatePullRequestResult = {
  pullRequestUrl: string;
  pullRequestNumber: number;
};

export async function createPullRequest(
  input: CreatePullRequestInput,
): Promise<CreatePullRequestResult> {
  const response = await input.octokit.rest.pulls.create({
    owner: input.owner,
    repo: input.repo,
    title: input.title,
    body: input.body,
    head: input.head,
    base: input.base,
  });
  return {
    pullRequestUrl: response.data.html_url,
    pullRequestNumber: response.data.number,
  };
}
