'use client';

import { Modal } from './Modal';

/**
 * PublishResultModal, Phase 8 slice #48.
 *
 * Surfaces the outcome of pressing Publish: on success a link to the PR
 * the commit pipeline opened on GitHub; on failure a readable message
 * mapped from the server's structured error code. The modal is the only
 * place the operator learns whether the publish landed, so the copy is
 * deliberately concrete (server returns 422 -> "Content failed
 * validation. Look for an em-dash or emoji."). The Toast primitive
 * (`Toast.tsx`) is used elsewhere for ambient status pings; the modal
 * is reserved for the publish outcome because the operator needs to
 * read and click through.
 *
 * The link uses `target="_blank"` plus `rel="noopener noreferrer"` so a
 * malicious GitHub redirect cannot reach back into the admin tab.
 */

export type PublishOutcome =
  | {
      ok: true;
      pullRequestUrl: string;
      pullRequestNumber: number;
      branchName: string;
      /**
       * `true` when the publish updated an existing PR rather than
       * opening a new one (slice #50). The modal swaps to the
       * "Draft updated" copy so the operator can tell the publish
       * resulted in a force-push to a known PR rather than a fresh
       * branch in the GitHub UI.
       */
      reused: boolean;
    }
  | { ok: false; errorCode: PublishErrorCode; field?: string };

export type PublishErrorCode =
  | 'unauthorised'
  | 'bad_request'
  | 'unprocessable'
  | 'forbidden_character'
  | 'config_error'
  | 'upstream_error'
  | 'network_error'
  | 'token_invalid'
  | 'token_scope'
  | 'repo_not_found';

export type PublishResultModalProps = {
  outcome: PublishOutcome;
  onClose: () => void;
};

const ERROR_COPY: Record<PublishErrorCode, string> = {
  unauthorised: 'You are not signed in as the admin. Refresh the page and sign in again.',
  bad_request: 'The publish request was malformed. Try again or refresh the page.',
  unprocessable:
    'Content failed validation. Look for an em-dash or emoji in the hero fields and try again.',
  forbidden_character:
    'A field contains an em-dash or emoji. Remove the character and press Publish again.',
  config_error:
    'The publish pipeline is not configured. Set GITHUB_TOKEN_CMS and GITHUB_REPO on the deploy.',
  upstream_error:
    'GitHub returned an error. Check the repo permissions on the token and try again.',
  network_error: 'Could not reach the publish endpoint. Check your connection and try again.',
  // Slice #51: configuration-level diagnoses that the route handler maps
  // from the Octokit RequestError.status. The copy is intentionally
  // actionable so the operator knows the next step without opening a
  // browser console.
  token_invalid:
    'GitHub token is invalid or revoked. Set a fresh fine-grained PAT in Vercel and redeploy.',
  token_scope:
    'GitHub token lacks required scope. Verify Contents: Read and write and Pull requests: Read and write on the fine-grained PAT.',
  repo_not_found:
    'GitHub repo not found. Check GITHUB_REPO is owner/repo and that the PAT has repository access.',
};

export function PublishResultModal({ outcome, onClose }: PublishResultModalProps) {
  if (outcome.ok) {
    const title = outcome.reused ? 'Draft updated' : 'Publish opened a PR';
    const description = outcome.reused
      ? `The existing pull request #${outcome.pullRequestNumber} on the ${outcome.branchName} branch was updated with your latest changes.`
      : `The commit pipeline opened pull request #${outcome.pullRequestNumber} on the ${outcome.branchName} branch. Review and merge on GitHub to ship the change.`;
    return (
      <Modal
        title={title}
        onClose={onClose}
        actions={
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        }
      >
        <p>{description}</p>
        <p>
          <a
            href={outcome.pullRequestUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Open pull request on GitHub
          </a>
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      title="Publish failed"
      onClose={onClose}
      actions={
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
      }
    >
      <p>{ERROR_COPY[outcome.errorCode]}</p>
      {outcome.errorCode === 'forbidden_character' && outcome.field ? (
        <p>
          Offending field: <code>{outcome.field}</code>
        </p>
      ) : null}
    </Modal>
  );
}
