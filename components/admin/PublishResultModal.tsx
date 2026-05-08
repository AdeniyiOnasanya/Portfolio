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
  | { ok: true; pullRequestUrl: string; pullRequestNumber: number; branchName: string }
  | { ok: false; errorCode: PublishErrorCode };

export type PublishErrorCode =
  | 'unauthorised'
  | 'bad_request'
  | 'unprocessable'
  | 'config_error'
  | 'upstream_error'
  | 'network_error';

export type PublishResultModalProps = {
  outcome: PublishOutcome;
  onClose: () => void;
};

const ERROR_COPY: Record<PublishErrorCode, string> = {
  unauthorised: 'You are not signed in as the admin. Refresh the page and sign in again.',
  bad_request: 'The publish request was malformed. Try again or refresh the page.',
  unprocessable:
    'Content failed validation. Look for an em-dash or emoji in the hero fields and try again.',
  config_error:
    'The publish pipeline is not configured. Set GITHUB_TOKEN_CMS and GITHUB_REPO on the deploy.',
  upstream_error:
    'GitHub returned an error. Check the repo permissions on the token and try again.',
  network_error: 'Could not reach the publish endpoint. Check your connection and try again.',
};

export function PublishResultModal({ outcome, onClose }: PublishResultModalProps) {
  if (outcome.ok) {
    return (
      <Modal
        title="Publish opened a PR"
        onClose={onClose}
        actions={
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
        }
      >
        <p>
          The commit pipeline opened pull request #{outcome.pullRequestNumber} on the{' '}
          <code>{outcome.branchName}</code> branch. Review and merge on GitHub to ship the change.
        </p>
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
    </Modal>
  );
}
