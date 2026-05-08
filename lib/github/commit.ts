import type { HeroDraft } from '@/lib/draft/hero-types';
import { findForbiddenChars } from '@/lib/text/forbidden';

/**
 * Commit pipeline for the CMS publish flow, Phase 8 slice #48.
 *
 * The pipeline is split into three pure layers and one thin wrapper:
 *
 *  - `buildSiteJsonAfterHeroEdit`: takes the loaded `Site` (or any
 *    JSON-shaped record) and the hero draft, returns the canonical JSON
 *    string we want to commit at `content/site.json`. The merge is
 *    field-level: the draft only overrides keys it explicitly sets, so
 *    untouched fields (cvUrl, github, etc.) survive. Pure: no fs reads.
 *
 *  - `buildTreeEntries`: returns the flat tree-entry list that
 *    `octokit.rest.git.createTree` expects. For the hero slice this is a
 *    single entry; the shape is generic so #49/#50/#52 can extend it
 *    without rewriting `publishCommit`.
 *
 *  - `publishCommit`: drives the create-ref to create-pull sequence
 *    against an injected Octokit. The function never instantiates
 *    Octokit; the caller (route handler) builds it via the lazy factory
 *    in `lib/github.ts`. Forbidden-char defence runs on every tree entry
 *    before any network call lands so a stray em-dash or emoji never
 *    reaches GitHub.
 *
 * Design notes:
 *
 *  - `octokit.rest.git.createTree` accepts `{ tree: [{ path, mode, type,
 *    sha }] }` once a blob has been created, and `mode: '100644'` is the
 *    git plumbing value for a normal file. The function builds the tree
 *    against the parent commit's tree (`base_tree`) so unmodified files
 *    are preserved without us listing them.
 *
 *  - The PR body is intentionally a placeholder ("Updated hero section.")
 *    here; slice #52 expands it via `lib/github/diff.ts`.
 *
 *  - Errors from Octokit are not caught at this layer; the route handler
 *    in `app/api/cms/save/route.ts` maps them to structured responses for
 *    the modal. The forbidden-char throw is the only thing this module
 *    raises by design, so its tests can assert the failure mode without
 *    a network seam.
 */

export const CONTENT_SITE_JSON_PATH = 'content/site.json';

export type TreeEntry = {
  path: string;
  mode: '100644';
  type: 'blob';
  /** Raw UTF-8 content of the file. The blob step uploads this verbatim. */
  content: string;
};

export type TreeEntryWithSha = {
  path: string;
  mode: '100644';
  type: 'blob';
  sha: string;
};

export type PublishCommitInput = {
  octokit: OctokitClient;
  owner: string;
  repo: string;
  baseBranch: string;
  branchName: string;
  commitMessage: string;
  authorName: string;
  authorEmail: string;
  pullRequestTitle: string;
  pullRequestBody: string;
  treeEntries: readonly TreeEntry[];
};

export type PublishCommitResult = {
  pullRequestUrl: string;
  pullRequestNumber: number;
  branchName: string;
};

/**
 * Structural type for the subset of Octokit we use. Declared here (rather
 * than imported from `octokit`) so the unit tests can pass a hand-rolled
 * mock without dragging the whole SDK into the test runtime, and so a
 * future migration to a GitHub App-based client (tech-stack.md, line 49)
 * does not require rewriting the call sites.
 */
export type OctokitClient = {
  rest: {
    git: {
      getRef: (params: {
        owner: string;
        repo: string;
        ref: string;
      }) => Promise<{ data: { object: { sha: string } } }>;
      createBlob: (params: {
        owner: string;
        repo: string;
        content: string;
        encoding: 'utf-8';
      }) => Promise<{ data: { sha: string } }>;
      createTree: (params: {
        owner: string;
        repo: string;
        base_tree: string;
        tree: readonly TreeEntryWithSha[];
      }) => Promise<{ data: { sha: string } }>;
      createCommit: (params: {
        owner: string;
        repo: string;
        message: string;
        tree: string;
        parents: readonly string[];
        author: { name: string; email: string };
      }) => Promise<{ data: { sha: string } }>;
      createRef: (params: {
        owner: string;
        repo: string;
        ref: string;
        sha: string;
      }) => Promise<{ data: { ref: string; object: { sha: string } } }>;
    };
    pulls: {
      create: (params: {
        owner: string;
        repo: string;
        title: string;
        body: string;
        head: string;
        base: string;
      }) => Promise<{ data: { number: number; html_url: string } }>;
    };
  };
};

export function buildSiteJsonAfterHeroEdit(site: unknown, draft: HeroDraft): string {
  if (!isJsonRecord(site)) {
    throw new Error('buildSiteJsonAfterHeroEdit: site must be a JSON object.');
  }
  const next: Record<string, unknown> = { ...site };
  if (draft.person) {
    const existingPerson = isJsonRecord(site.person) ? site.person : {};
    next.person = mergeDefined(existingPerson, draft.person);
  }
  const json = `${JSON.stringify(next, null, 2)}\n`;
  assertNoForbiddenChars(json, CONTENT_SITE_JSON_PATH);
  return json;
}

export function buildTreeEntries(args: { siteJson: string }): TreeEntry[] {
  return [
    {
      path: CONTENT_SITE_JSON_PATH,
      mode: '100644',
      type: 'blob',
      content: args.siteJson,
    },
  ];
}

export async function publishCommit(input: PublishCommitInput): Promise<PublishCommitResult> {
  // Defence in depth, slice #49 expands this with field-level naming.
  // Every byte we are about to send to GitHub is scanned here so a stray
  // em-dash or emoji can never land on the remote, even if a future Zod
  // schema is loosened or a draft was written before the schema was
  // tightened. The check runs before any network call so a failure here
  // leaves no branch and no PR behind.
  for (const entry of input.treeEntries) {
    assertNoForbiddenChars(entry.content, entry.path);
  }

  const baseRef = await input.octokit.rest.git.getRef({
    owner: input.owner,
    repo: input.repo,
    ref: `heads/${input.baseBranch}`,
  });
  const baseSha = baseRef.data.object.sha;

  const blobs: TreeEntryWithSha[] = [];
  for (const entry of input.treeEntries) {
    const blob = await input.octokit.rest.git.createBlob({
      owner: input.owner,
      repo: input.repo,
      content: entry.content,
      encoding: 'utf-8',
    });
    blobs.push({
      path: entry.path,
      mode: entry.mode,
      type: entry.type,
      sha: blob.data.sha,
    });
  }

  const tree = await input.octokit.rest.git.createTree({
    owner: input.owner,
    repo: input.repo,
    base_tree: baseSha,
    tree: blobs,
  });

  const commit = await input.octokit.rest.git.createCommit({
    owner: input.owner,
    repo: input.repo,
    message: input.commitMessage,
    tree: tree.data.sha,
    parents: [baseSha],
    author: {
      name: input.authorName,
      email: input.authorEmail,
    },
  });

  await input.octokit.rest.git.createRef({
    owner: input.owner,
    repo: input.repo,
    ref: `refs/heads/${input.branchName}`,
    sha: commit.data.sha,
  });

  const pull = await input.octokit.rest.pulls.create({
    owner: input.owner,
    repo: input.repo,
    title: input.pullRequestTitle,
    body: input.pullRequestBody,
    head: input.branchName,
    base: input.baseBranch,
  });

  return {
    pullRequestUrl: pull.data.html_url,
    pullRequestNumber: pull.data.number,
    branchName: input.branchName,
  };
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeDefined(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    merged[key] = value;
  }
  return merged;
}

function assertNoForbiddenChars(text: string, label: string): void {
  const [first] = findForbiddenChars(text);
  if (first) {
    throw new Error(
      `forbidden character "${first.char}" in ${label} at line ${first.line} column ${first.column}.`,
    );
  }
}
