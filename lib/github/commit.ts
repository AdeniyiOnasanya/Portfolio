import type { HeroDraft } from '@/lib/draft/hero-types';
import { findForbiddenChars } from '@/lib/text/forbidden';

/**
 * Typed error raised when the publish-time scan finds a forbidden
 * character (U+2014 or any Extended_Pictographic codepoint) inside the
 * merged Site object. The route handler maps this to a 422 with a
 * `field` key so the modal can name the offending field. The error
 * exposes:
 *
 *  - `field`: dot-path to the offending string leaf, e.g. `person.name`
 *    or `person.longBio[1]`. Array indices use bracket notation so the
 *    operator can find the entry without counting; nested arrays are
 *    chained left to right (`stats[0].label`).
 *  - `codePoint`: numeric Unicode code point of the offending character.
 *    Captured via String.prototype.codePointAt so a non-BMP emoji
 *    (e.g. U+1F600) reports the astral code point rather than the
 *    UTF-16 high surrogate.
 *  - `char`: the offending character itself, kept for log messages.
 */
export class ForbiddenCharacterError extends Error {
  readonly field: string;
  readonly codePoint: number;
  readonly char: string;

  constructor(input: { field: string; codePoint: number; char: string }) {
    super(
      `forbidden character (U+${input.codePoint.toString(16).toUpperCase().padStart(4, '0')}) at ${input.field}`,
    );
    this.name = 'ForbiddenCharacterError';
    this.field = input.field;
    this.codePoint = input.codePoint;
    this.char = input.char;
  }
}

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
  // Walk the merged tree first so the operator sees a field-named error
  // (`person.name`) rather than a JSON-string-offset error. The byte-level
  // sweep below is defence in depth in case a future field path slips
  // past the walker.
  assertNoForbiddenCharsInValue(next, '');
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

/**
 * Maps a thrown value (typically `@octokit/request-error`'s `RequestError`,
 * but tolerant of plain `Error` and non-Error throws) to a small structured
 * kind the route handler turns into a JSON body for the publish modal.
 *
 * Mapping, slice #51:
 *  - 401 -> 'token_invalid'      PAT revoked, expired, or wrong shape.
 *  - 403 -> 'token_scope'        PAT lacks Contents or Pull-requests perms.
 *  - 404 -> 'repo_not_found'     `GITHUB_REPO` mismatch, or PAT has no
 *                                repository access.
 *  - 422 from create-ref or
 *         create-pull            -> 'idempotent_collision'. Slice #50 owns
 *                                  the recovery path; this slice tags the
 *                                  case so the route handler can keep that
 *                                  recovery distinct from a generic upstream
 *                                  failure once #50 lands.
 *  - anything else               -> 'upstream'. The conservative bucket
 *                                  covers 5xx, malformed throws, and any
 *                                  status we have not classified.
 *
 * The classifier reads only the numeric `status` and the `request.url`. It
 * never reads `error.message`, `error.response`, or any header: GitHub
 * payloads sometimes include rate-limit hints, request IDs, or partial
 * token fingerprints, and the route handler must surface a fixed,
 * operator-facing string instead of echoing those bytes.
 */
export type GitHubErrorKind =
  | 'token_invalid'
  | 'token_scope'
  | 'repo_not_found'
  | 'idempotent_collision'
  | 'upstream';

export type ClassifiedGitHubError = { kind: GitHubErrorKind };

export function classifyGitHubRequestError(error: unknown): ClassifiedGitHubError {
  if (!isRequestErrorLike(error)) {
    return { kind: 'upstream' };
  }
  switch (error.status) {
    case 401:
      return { kind: 'token_invalid' };
    case 403:
      return { kind: 'token_scope' };
    case 404:
      return { kind: 'repo_not_found' };
    case 422:
      return isCreateRefOrCreatePullUrl(error.request?.url)
        ? { kind: 'idempotent_collision' }
        : { kind: 'upstream' };
    default:
      return { kind: 'upstream' };
  }
}

type RequestErrorLike = {
  status: number;
  request?: { method?: string; url?: string };
};

function isRequestErrorLike(value: unknown): value is RequestErrorLike {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { status?: unknown };
  return typeof candidate.status === 'number';
}

const CREATE_REF_PATH = /\/repos\/[^/]+\/[^/]+\/git\/refs(?:\/|$|\?)/;
const CREATE_PULL_PATH = /\/repos\/[^/]+\/[^/]+\/pulls(?:\/|$|\?)/;

function isCreateRefOrCreatePullUrl(url: string | undefined): boolean {
  if (typeof url !== 'string' || url.length === 0) return false;
  return CREATE_REF_PATH.test(url) || CREATE_PULL_PATH.test(url);
}

/**
 * Recursively walks a JSON-shaped value and throws a typed
 * `ForbiddenCharacterError` on the first string leaf that contains a
 * forbidden character. The walker is depth-first and visits keys in
 * insertion order so the operator's reported field is deterministic.
 *
 * Path syntax:
 *
 *  - Nested objects use dot notation: `person.name`.
 *  - Arrays use bracket notation: `person.longBio[1]`,
 *    `hero.stats[0].label`.
 *  - The root path is the empty string; the first object level produces
 *    keys without a leading dot so the error reads `person.name` rather
 *    than `.person.name`.
 *
 * `findForbiddenChars` returns matches by UTF-16 index; the walker
 * converts that to the astral code point via `codePointAt` so emoji
 * outside the BMP report a single number rather than a surrogate.
 */
function assertNoForbiddenCharsInValue(value: unknown, path: string): void {
  if (typeof value === 'string') {
    const [first] = findForbiddenChars(value);
    if (first) {
      const codePoint = value.codePointAt(first.index) ?? first.char.codePointAt(0) ?? 0;
      // `<root>` is defensive: the only current caller passes an object
      // root (`next` in `buildSiteJsonAfterHeroEdit`), so the walker enters
      // the object branch below and builds paths starting with the first
      // key. The fallback only fires if a future caller passes a string
      // value directly, in which case the empty path would otherwise
      // produce a misleading `forbidden character at ""` label.
      throw new ForbiddenCharacterError({
        field: path || '<root>',
        codePoint,
        char: first.char,
      });
    }
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      assertNoForbiddenCharsInValue(value[i], `${path}[${i}]`);
    }
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const nextPath = path ? `${path}.${key}` : key;
      assertNoForbiddenCharsInValue(child, nextPath);
    }
    return;
  }
  // numbers, booleans, null: no string content to scan.
}
