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
import { buildSiteJsonAfterHeroEdit, buildTreeEntries, publishCommit } from '@/lib/github/commit';

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

  // 2. Auth.
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!isAllowedAdminEmail(email, process.env.ADMIN_EMAIL)) {
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

  // 7. Site load + merge.
  let siteJson: string;
  try {
    const site = await loadSite();
    siteJson = buildSiteJsonAfterHeroEdit(site, draft);
  } catch (error) {
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
      authorEmail: email as string,
      pullRequestTitle: commitMessage,
      pullRequestBody: 'Updated hero section.',
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
    if (isForbiddenCharError(error)) {
      return NextResponse.json(GENERIC_UNPROCESSABLE, { status: 422 });
    }
    return NextResponse.json(GENERIC_UPSTREAM_ERROR, { status: 502 });
  }
}

type RepoConfig = { ok: true; owner: string; repo: string; baseBranch: string } | { ok: false };

function readRepoConfig(): RepoConfig {
  const repo = process.env.GITHUB_REPO;
  const baseBranch = process.env.GITHUB_BRANCH_BASE ?? 'develop';
  if (typeof repo !== 'string' || repo.trim() === '' || !repo.includes('/')) {
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
