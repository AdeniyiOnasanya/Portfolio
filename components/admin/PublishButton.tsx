'use client';

import { useState, useTransition } from 'react';
import {
  type PublishErrorCode,
  type PublishOutcome,
  PublishResultModal,
} from './PublishResultModal';
import type { AdminSectionId } from './sections';

/**
 * PublishButton, Phase 8 slice #48.
 *
 * Posts the operator's "publish this section" intent to /api/cms/save
 * and surfaces the outcome through `PublishResultModal`. Two guarantees:
 *
 *  - Idempotent click: the underlying `useTransition` keeps `isPending`
 *    true while the request is in flight, and the button is disabled
 *    while pending so a second click cannot fire a second request.
 *  - Structured error mapping: the server returns generic JSON bodies
 *    (`{ ok: false, error: 'unprocessable' }`); the button maps the
 *    code to a readable string for the modal so the operator knows
 *    whether to retry or fix their content.
 *
 * The button is a client component (the modal needs interactivity); it
 * does not import the route handler module so the bundle stays small.
 */

const ERROR_BY_STATUS: Record<number, PublishErrorCode> = {
  401: 'unauthorised',
  400: 'bad_request',
  403: 'bad_request',
  422: 'unprocessable',
  500: 'config_error',
  502: 'upstream_error',
};

export type PublishButtonProps = {
  section: AdminSectionId;
};

export function PublishButton({ section }: PublishButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<PublishOutcome | null>(null);

  function handleClick() {
    if (isPending) return;
    startTransition(async () => {
      try {
        const response = await fetch('/api/cms/save', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ section }),
        });
        const body = (await safeJson(response)) ?? {};
        if (response.ok && (body as { ok?: boolean }).ok === true) {
          const data = body as {
            ok: true;
            pullRequestUrl: string;
            pullRequestNumber: number;
            branchName: string;
          };
          setOutcome({
            ok: true,
            pullRequestUrl: data.pullRequestUrl,
            pullRequestNumber: data.pullRequestNumber,
            branchName: data.branchName,
          });
          return;
        }
        setOutcome({
          ok: false,
          errorCode: ERROR_BY_STATUS[response.status] ?? 'upstream_error',
        });
      } catch {
        setOutcome({ ok: false, errorCode: 'network_error' });
      }
    });
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={handleClick}
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? 'Publishing' : 'Publish'}
      </button>
      {outcome ? <PublishResultModal outcome={outcome} onClose={() => setOutcome(null)} /> : null}
    </>
  );
}

async function safeJson(response: Response): Promise<unknown | null> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}
