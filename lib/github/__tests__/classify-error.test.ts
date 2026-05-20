import { describe, expect, it } from 'vitest';
import { classifyGitHubRequestError } from '../commit';

/*
 * classifyGitHubRequestError, Phase 8 slice #51.
 *
 * The route handler at app/api/cms/save/route.ts catches whatever Octokit
 * raises and needs to surface a configuration-level diagnosis to the
 * admin's PublishResultModal. The classifier maps the HTTP status on the
 * Octokit `RequestError` to a small structured kind:
 *
 *  - 401 -> 'token_invalid'      (PAT revoked, expired, or wrong)
 *  - 403 -> 'token_scope'        (PAT missing Contents/Pull-request perms)
 *  - 404 -> 'repo_not_found'     (GITHUB_REPO points at the wrong repo)
 *  - 422 from create-ref or
 *         create-pull            -> 'idempotent_collision' (slice #50 owns
 *                                  the recovery path; this slice keeps it
 *                                  intact and visible to the route handler
 *                                  so it does not get re-mapped to a
 *                                  generic upstream error)
 *  - anything else               -> 'upstream'
 *
 * The shape of the input mirrors `@octokit/request-error`'s `RequestError`:
 * a regular `Error` with a numeric `status` property and an optional
 * `request` object whose `url` carries the API path. The classifier never
 * reads the response body or its headers; the route handler must not echo
 * GitHub's raw error message (rate-limit headers leak quotas and partial
 * tokens leak via "Bad credentials for token ghp_..." in some legacy
 * payloads).
 */

type RequestErrorLike = Error & {
  status: number;
  request?: { method?: string; url?: string };
};

function makeRequestError(
  status: number,
  url = 'https://api.github.com/repos/owner/repo/git/refs',
  method = 'POST',
): RequestErrorLike {
  const error = new Error('mocked upstream failure') as RequestErrorLike;
  error.name = 'HttpError';
  error.status = status;
  error.request = { method, url };
  return error;
}

describe('classifyGitHubRequestError', () => {
  it('classifies 401 as token_invalid', () => {
    const result = classifyGitHubRequestError(makeRequestError(401));
    expect(result).toEqual({ kind: 'token_invalid' });
  });

  it('classifies 403 as token_scope', () => {
    const result = classifyGitHubRequestError(makeRequestError(403));
    expect(result).toEqual({ kind: 'token_scope' });
  });

  it('classifies 404 as repo_not_found', () => {
    const result = classifyGitHubRequestError(makeRequestError(404));
    expect(result).toEqual({ kind: 'repo_not_found' });
  });

  it('classifies 422 from create-ref as idempotent_collision', () => {
    const result = classifyGitHubRequestError(
      makeRequestError(422, 'https://api.github.com/repos/owner/repo/git/refs', 'POST'),
    );
    expect(result).toEqual({ kind: 'idempotent_collision' });
  });

  it('classifies 422 from create-pull as idempotent_collision', () => {
    const result = classifyGitHubRequestError(
      makeRequestError(422, 'https://api.github.com/repos/owner/repo/pulls', 'POST'),
    );
    expect(result).toEqual({ kind: 'idempotent_collision' });
  });

  it('classifies 422 from create-blob as upstream (not an idempotent collision)', () => {
    const result = classifyGitHubRequestError(
      makeRequestError(422, 'https://api.github.com/repos/owner/repo/git/blobs', 'POST'),
    );
    expect(result).toEqual({ kind: 'upstream' });
  });

  it('classifies 500 as upstream', () => {
    const result = classifyGitHubRequestError(makeRequestError(500));
    expect(result).toEqual({ kind: 'upstream' });
  });

  it('classifies 502 as upstream', () => {
    const result = classifyGitHubRequestError(makeRequestError(502));
    expect(result).toEqual({ kind: 'upstream' });
  });

  it('classifies a non-RequestError shape as upstream', () => {
    const plainError = new Error('not from octokit');
    const result = classifyGitHubRequestError(plainError);
    expect(result).toEqual({ kind: 'upstream' });
  });

  it('classifies a non-Error value as upstream', () => {
    const result = classifyGitHubRequestError('a string thrown by something else');
    expect(result).toEqual({ kind: 'upstream' });
  });

  it('classifies a RequestError without a request object as upstream when status is 422', () => {
    const error = new Error('bare') as RequestErrorLike;
    error.status = 422;
    const result = classifyGitHubRequestError(error);
    // No `request.url` means we cannot prove this came from create-ref or
    // create-pull, so the conservative choice is the generic upstream
    // bucket rather than the idempotent collision branch.
    expect(result).toEqual({ kind: 'upstream' });
  });
});
