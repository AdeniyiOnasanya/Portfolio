import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ADMIN_SECTION_IDS } from '@/components/admin/sections';
import { auth } from '@/lib/auth';
import { isAllowedAdminEmail } from '@/lib/auth/allowlist';
import { loadSite } from '@/lib/content';
import { parseHeroDraft } from '@/lib/draft/hero-types';
import { getDraft } from '@/lib/draft/store';
import { getOctokit } from '@/lib/github';
import { buildBranchName } from '@/lib/github/branch';
import {
  buildSiteJsonAfterHeroEdit,
  buildTreeEntries,
  classifyGitHubRequestError,
  ForbiddenCharacterError,
  publishCommit,
} from '@/lib/github/commit';
import { summariseHeroDiff } from '@/lib/github/diff';

/**
 * Publish route, Phase 8 slice #48.
 *
 * The Publish button in the admin posts here. The handler reads the
 * persisted draft for the requested section, validates it against the
 * publish-time schema, builds the canonical `content/site.json`, and
 * drives the GitHub commit pipeline. On success it returns the PR URL
 * for the modal; on a structured failure it returns a generic JSON body
 * so an attacker cannot tell which check fired.
 *
 * Defence in depth (top to bottom; any failure short-circuits without
 * touching GitHub):
 *
 *  1. Origin check: a route handler does not get the implicit origin
 *     check that server actions ship with, so we reject any cross-origin
 *     POST whose Origin header does not match the request host. A null
 *     Origin (curl, same-origin navigation) falls through to the auth
 *     check.
 *  2. Auth + allowlist: `auth()` must return a session with an email
 *     and that email must match `ADMIN_EMAIL`. Both failure modes share
 *     the same generic 401 body.
 *  3. Body parse: `application/json` with a `section` field. Anything
 *     else returns 400.
 *  4. Section gate: only `hero` is supported in this slice. The
 *     publish surface for other sections lands incrementally in #49 and
 *     beyond; until then the route refuses with 400.
 *  5. Draft load + Zod parse: the section's draft row is parsed against
 *     `HeroDraftSchema` so a malformed JSONB blob (legacy, partial,
 *     hand-edited) cannot reach the commit pipeline. Missing or invalid
 *     drafts return 422.
 *  6. Site load + merge: `content/site.json` is the canonical merge
 *     base; the hero draft only patches the keys it explicitly sets.
 *     `buildSiteJsonAfterHeroEdit` runs the forbidden-char scan inside
 *     so a stray em-dash never reaches the blob step.
 *  7. Commit pipeline: the lazy Octokit is built only when this far
 *     down the request lifetime; CI loads the route module with no
 *     `GITHUB_TOKEN_CMS` and the build still passes.
 *  8. Error mapping: a forbidden-char throw becomes 422; a missing
 *     repo config becomes 500; anything else becomes 502 ("upstream
 *     publish failed") so the modal can surface a readable message.
 *
 * Lazy boundaries the test suite pins:
 *  - `getOctokit` is only invoked after the auth + draft checks pass;
 *    a failed auth never touches `GITHUB_TOKEN_CMS`.
 *  - The forbidden-char throw on `publishCommit` is surfaced as 422
 *    before any branch or PR is opened on GitHub.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GENERIC_UNAUTHORISED = { ok: false, error: 'unauthorised' } as const;
const GENERIC_BAD_REQUEST = { ok: false, error: 'bad_request' } as const;
const GENERIC_UNPROCESSABLE = { ok: false, error: 'unprocessable' } as const;
const GENERIC_CONFIG_ERROR = { ok: false, error: 'config_error' } as const;
const GENERIC_UPSTREAM_ERROR = { ok: false, error: 'upstream_error' } as const;
const TOKEN_INVALID = { ok: false, error: 'token_invalid' } as const;
const TOKEN_SCOPE = { ok: false, error: 'token_scope' } as const;
const REPO_NOT_FOUND = { ok: false, error: 'repo_not_found' } as const;

const PublishBodySchema = z.object({
  section: z.enum(ADMIN_SECTION_IDS),
});

export async function POST(request: Request): Promise<Response> {
  // 1. Origin check. Compare against the request URL's host rather than
  // the `host` header so the check is the same value Next.js routed on;
  // it also keeps the test environment honest, since happy-dom's Request
  // polyfill strips the `host` header (it is a forbidden fetch header)
  // while the request URL still carries the deployment origin.
  const origin = request.headers.get('origin');
  if (origin !== null) {
    const expectedHost = new URL(request.url).host;
    let originHost = '';
    try {
      originHost = new URL(origin).host;
    } catch {
      return NextResponse.json(GENERIC_BAD_REQUEST, { status: 403 });
    }
    if (originHost !== expectedHost) {
      return NextResponse.json(GENERIC_BAD_REQUEST, { status: 403 });
    }
  }

  // 2. Auth. The explicit narrowing after the allowlist check turns the
  // `string | null` shape into the `string` the GitHub commit pipeline
  // requires. `isAllowedAdminEmail` already rejects null and empty
  // values; the typeof guard makes the invariant visible to TypeScript so
  // a future restructure cannot silently produce a null commit author.
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!isAllowedAdminEmail(email, process.env.ADMIN_EMAIL) || typeof email !== 'string') {
    return NextResponse.json(GENERIC_UNAUTHORISED, { status: 401 });
  }

  // 3. Body parse.
  let parsedBody: { section: string };
  try {
    const raw = (await request.json()) as unknown;
    const result = PublishBodySchema.safeParse(raw);
    if (!result.success) {
      return NextResponse.json(GENERIC_BAD_REQUEST, { status: 400 });
    }
    parsedBody = result.data;
  } catch {
    return NextResponse.json(GENERIC_BAD_REQUEST, { status: 400 });
  }

  // 4. Section gate. The slice ships hero only; other sections return
  // 400 until their publish surface lands.
  if (parsedBody.section !== 'hero') {
    return NextResponse.json(GENERIC_BAD_REQUEST, { status: 400 });
  }

  // 5. Draft load + parse.
  const row = await getDraft('hero');
  const draft = row ? parseHeroDraft(row.content) : null;
  if (!draft) {
    return NextResponse.json(GENERIC_UNPROCESSABLE, { status: 422 });
  }

  // 6. Repo config. Read environment up front so a misconfigured deploy
  // surfaces a 500 before any work happens.
  const repoConfig = readRepoConfig();
  if (!repoConfig.ok) {
    return NextResponse.json(GENERIC_CONFIG_ERROR, { status: 500 });
  }

  // 7. Site load + merge + diff body. The summariser builds a plain
  // language description of every leaf field that changed between the
  // currently published `content/site.json` and the validated draft.
  // The route used to send a fixed placeholder ("Updated hero section.")
  // as the PR body; #52 swaps it for `summariseHeroDiff` so the PR list
  // doubles as a per-publish change log. Both the merge and the diff
  // sit inside this try block because either step can throw on a stray
  // forbidden character (see `assertNoForbiddenChars` in commit.ts and
  // `assertClean` in diff.ts), which the catch maps to a 422.
  let siteJson: string;
  let pullRequestBody: string;
  try {
    const site = await loadSite();
    siteJson = buildSiteJsonAfterHeroEdit(site, draft);
    const beforeForDiff = { person: site.person };
    const afterForDiff = {
      person: { ...site.person, ...stripUndefined(draft.person ?? {}) },
    };
    pullRequestBody = summariseHeroDiff(beforeForDiff, afterForDiff);
  } catch (error) {
    if (error instanceof ForbiddenCharacterError) {
      // The walker reports the path inside the Site object (e.g.
      // `person.name`); the operator sees it under the section they
      // were editing, so prefix with the section id (`hero.person.name`).
      // The pipeline is never reached on this branch: no branch and no
      // PR can leak when the scan refuses the input.
      return NextResponse.json(
        {
          ok: false,
          error: 'forbidden_character',
          field: `${parsedBody.section}.${error.field}`,
        },
        { status: 422 },
      );
    }
    if (isForbiddenCharError(error)) {
      return NextResponse.json(GENERIC_UNPROCESSABLE, { status: 422 });
    }
    return NextResponse.json(GENERIC_UPSTREAM_ERROR, { status: 502 });
  }

  // 8. Commit pipeline.
  try {
    const octokit = getOctokit();
    const unixTs = Math.floor(Date.now() / 1000);
    const branchName = buildBranchName({ unixTs, slug: 'hero' });
    const commitMessage = `cms: update hero (${unixTs})`;
    const result = await publishCommit({
      octokit,
      owner: repoConfig.owner,
      repo: repoConfig.repo,
      baseBranch: repoConfig.baseBranch,
      branchName,
      commitMessage,
      authorName: 'CMS Publish',
      authorEmail: email,
      pullRequestTitle: commitMessage,
      pullRequestBody,
      treeEntries: buildTreeEntries({ siteJson }),
    });
    return NextResponse.json(
      {
        ok: true,
        pullRequestUrl: result.pullRequestUrl,
        pullRequestNumber: result.pullRequestNumber,
        branchName: result.branchName,
      },
      { status: 200 },
    );
  } catch (error) {
    if (isConfigError(error)) {
      return NextResponse.json(GENERIC_CONFIG_ERROR, { status: 500 });
    }
    if (error instanceof ForbiddenCharacterError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'forbidden_character',
          field: `${parsedBody.section}.${error.field}`,
        },
        { status: 422 },
      );
    }
    // Regex fallback covers the byte-level `assertNoForbiddenChars` sweep
    // inside `publishCommit`, which throws a plain `Error` (not the typed
    // `ForbiddenCharacterError`) for any forbidden char that survives the
    // walker. The two handlers are not redundant: the typed branch above
    // names the field; this one is a last-resort 422 without a field name
    // for offenders found only at the serialised JSON layer.
    if (isForbiddenCharError(error)) {
      return NextResponse.json(GENERIC_UNPROCESSABLE, { status: 422 });
    }
    // Slice #51: Octokit RequestErrors carry a numeric status that maps
    // to a fixed, operator-facing copy in the publish modal. The classifier
    // never reads `error.message`, so partial-token fingerprints and
    // rate-limit hints from GitHub responses cannot leak through this path.
    const classified = classifyGitHubRequestError(error);
    switch (classified.kind) {
      case 'token_invalid':
        return NextResponse.json(TOKEN_INVALID, { status: 401 });
      case 'token_scope':
        return NextResponse.json(TOKEN_SCOPE, { status: 403 });
      case 'repo_not_found':
        return NextResponse.json(REPO_NOT_FOUND, { status: 404 });
      case 'idempotent_collision':
        // Slice #50 owns the recovery path (update the existing PR instead
        // of opening a second). Until #50 lands the conservative answer
        // is the same generic upstream surface the modal already handles,
        // so the operator gets a retryable failure rather than a stack
        // trace.
        return NextResponse.json(GENERIC_UPSTREAM_ERROR, { status: 502 });
      default:
        return NextResponse.json(GENERIC_UPSTREAM_ERROR, { status: 502 });
    }
  }
}

type RepoConfig = { ok: true; owner: string; repo: string; baseBranch: string } | { ok: false };

// Strict `owner/repo` shape: rejects empty, single-segment, and
// multi-segment values like `owner/repo/extra` so a misconfigured env var
// does not silently point commits at the wrong target.
const GITHUB_REPO_PATTERN = /^[^/\s]+\/[^/\s]+$/;

function readRepoConfig(): RepoConfig {
  const repo = process.env.GITHUB_REPO;
  const baseBranch = process.env.GITHUB_BRANCH_BASE ?? 'develop';
  if (typeof repo !== 'string' || !GITHUB_REPO_PATTERN.test(repo)) {
    return { ok: false };
  }
  const [owner, name] = repo.split('/');
  if (!owner || !name) return { ok: false };
  return { ok: true, owner, repo: name, baseBranch };
}

function isForbiddenCharError(error: unknown): boolean {
  return error instanceof Error && /forbidden character/i.test(error.message);
}

function isConfigError(error: unknown): boolean {
  return error instanceof Error && /not configured/i.test(error.message);
}

/**
 * Drop keys whose value is `undefined` so the spread used to build the
 * "after" view for `summariseHeroDiff` does not overwrite a published
 * field with a missing draft value. The hero draft schema is permissive
 * (every key optional), so a draft that touches `name` only must leave
 * the other person fields visible to the diff in their published shape;
 * otherwise the summariser would render every untouched field as
 * "Cleared", flooding the PR body with phantom changes.
 */
function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) out[key] = val;
  }
  return out as Partial<T>;
}
