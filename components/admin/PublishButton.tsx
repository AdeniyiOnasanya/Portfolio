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

/*
 * Slice #51: the server tags configuration-level failures with a stable
 * `error` string. When present the button forwards it directly so the
 * modal can show actionable copy ("token is invalid or revoked", "repo
 * not found", and so on). Status-only fallback stays as a safety net for
 * unrecognised shapes.
 */
const KNOWN_ERROR_CODES: ReadonlySet<PublishErrorCode> = new Set<PublishErrorCode>([
  'unauthorised',
  'bad_request',
  'unprocessable',
  'config_error',
  'upstream_error',
  'network_error',
  'token_invalid',
  'token_scope',
  'repo_not_found',
]);

function readServerErrorCode(body: unknown): PublishErrorCode | null {
  if (typeof body !== 'object' || body === null) return null;
  const candidate = (body as { error?: unknown }).error;
  if (typeof candidate !== 'string') return null;
  return KNOWN_ERROR_CODES.has(candidate as PublishErrorCode)
    ? (candidate as PublishErrorCode)
    : null;
}

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
            // `reused` is sent by /api/cms/save on republish; older builds
            // that predate slice #50 omit it, so default to `false`.
            reused?: boolean;
          };
          setOutcome({
            ok: true,
            pullRequestUrl: data.pullRequestUrl,
            pullRequestNumber: data.pullRequestNumber,
            branchName: data.branchName,
            reused: data.reused === true,
          });
          return;
        }
        // Forbidden-character branch first (#49): the route emits
        // `error: 'forbidden_character'` plus a `field` key on 422 so the
        // modal can name the offending field. Other 422s (#51 server-side
        // mapping) keep their `error: '<code>'` body and flow through
        // `readServerErrorCode`; unmapped responses fall back to the
        // HTTP-status lookup.
        const errorBody = body as { error?: string; field?: string };
        if (errorBody.error === 'forbidden_character' && response.status === 422) {
          setOutcome({
            ok: false,
            errorCode: 'forbidden_character',
            ...(typeof errorBody.field === 'string' ? { field: errorBody.field } : {}),
          });
          return;
        }
        const serverCode = readServerErrorCode(body);
        setOutcome({
          ok: false,
          errorCode: serverCode ?? ERROR_BY_STATUS[response.status] ?? 'upstream_error',
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
