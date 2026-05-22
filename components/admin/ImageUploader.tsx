'use client';

import { useId, useRef, useState } from 'react';
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from '../../lib/upload/limits';

/**
 * Admin image uploader, Phase 7 slice #45.
 *
 * Mirrors `design_handoff_portfolio/design/admin/admin-shared.jsx` lines 136
 * to 170 (`ImageUpload`) and `design_handoff_portfolio/design/admin.css`
 * lines 336 to 359 (`.uploader`, `.uploader .drop`, `.uploader .preview`,
 * `.uploader .preview.empty`). The DOM structure, class names, and the
 * "Drop image or click" copy are kept verbatim so the live admin shell
 * lines up with the design file byte for byte.
 *
 * Behaviour beyond the design (the design file is presentational only):
 *
 *  - The file input gates on `MAX_UPLOAD_BYTES` (1.5 MiB) and the MIME
 *    allowlist before fetch. The server enforces the same checks; the
 *    client gate is purely a UX shortcut so the user does not wait for a
 *    round trip to learn the file is too large.
 *  - On success the parent's `onChange(url)` callback fires with the Blob
 *    URL. The caller is responsible for writing that URL into the draft
 *    (the draft persistence layer lands in slice #42 and #46).
 *  - Errors render inline under the dropzone using the `.upload-error`
 *    class. Reduced-motion users see no transitions on the dropzone, the
 *    same as the rest of the admin shell.
 *
 * Auth: the route handler at `/api/cms/upload` does the real check. This
 * component assumes it is rendered inside `app/(admin)/admin/*`, which is
 * already gated by `middleware.ts` and the layout's server-side `auth()`
 * call.
 */

type ImageUploaderProps = {
  value: string | null;
  onChange: (url: string | null) => void;
  hint?: string;
  label?: string;
};

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading'; filename: string }
  | { status: 'error'; message: string };

const ACCEPT_ATTR = ALLOWED_MIME_TYPES.join(',');

const ERROR_COPY: Record<string, string> = {
  too_large: 'File is over 1.5 MiB. Compress and try again.',
  wrong_type: 'Only JPEG, PNG, WebP, or AVIF images are allowed.',
  network: 'Upload failed. Check the network and try again.',
  server: 'The server rejected the upload. Try a different image.',
};

export function ImageUploader({ value, onChange, hint, label = 'Image' }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [state, setState] = useState<UploadState>({ status: 'idle' });
  const errorId = useId();
  const isUploading = state.status === 'uploading';

  function reset(): void {
    setState({ status: 'idle' });
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  async function handle(file: File | null | undefined): Promise<void> {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setState({ status: 'error', message: ERROR_COPY.too_large ?? 'File too large' });
      return;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
      setState({ status: 'error', message: ERROR_COPY.wrong_type ?? 'Wrong file type' });
      return;
    }

    setState({ status: 'uploading', filename: file.name });
    const body = new FormData();
    body.append('file', file);

    let response: Response;
    try {
      response = await fetch('/api/cms/upload', { method: 'POST', body });
    } catch {
      setState({ status: 'error', message: ERROR_COPY.network ?? 'Network error' });
      return;
    }
    if (!response.ok) {
      setState({ status: 'error', message: ERROR_COPY.server ?? 'Server error' });
      return;
    }

    let payload: { url?: unknown };
    try {
      payload = (await response.json()) as { url?: unknown };
    } catch {
      setState({ status: 'error', message: ERROR_COPY.server ?? 'Server error' });
      return;
    }
    if (typeof payload.url !== 'string' || payload.url.length === 0) {
      setState({ status: 'error', message: ERROR_COPY.server ?? 'Server error' });
      return;
    }
    onChange(payload.url);
    setState({ status: 'idle' });
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  function onClear(): void {
    onChange(null);
    reset();
  }

  return (
    <div className="uploader-region">
      <div className="uploader">
        <div
          className={`preview${value ? '' : ' empty'}`}
          style={value ? { backgroundImage: `url(${value})` } : undefined}
          aria-label={value ? `${label} preview` : `${label}, no image`}
          role="img"
        >
          {!value && <span>NO IMAGE</span>}
        </div>
        <button
          type="button"
          className="drop"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const dropped = event.dataTransfer.files?.[0];
            void handle(dropped);
          }}
          disabled={isUploading}
          aria-describedby={state.status === 'error' ? errorId : undefined}
        >
          {isUploading
            ? `Uploading ${state.filename}...`
            : `Drop image or click. ${hint ?? ''}`.trim()}
        </button>
        {value && !isUploading && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>
            Clear
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          style={{ display: 'none' }}
          onChange={(event) => {
            const next = event.target.files?.[0];
            void handle(next);
          }}
        />
      </div>
      {state.status === 'error' && (
        <p id={errorId} role="alert" className="upload-error">
          {state.message}
        </p>
      )}
    </div>
  );
}
