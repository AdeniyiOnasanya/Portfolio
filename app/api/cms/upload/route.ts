import { put } from '@vercel/blob';
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../lib/auth';
import { isAllowedAdminEmail } from '../../../../lib/auth/allowlist';
import {
  MAX_UPLOAD_BYTES,
  sanitiseBlobPathname,
  sniffImageMime,
  validateMimeType,
  validateUploadSize,
} from '../../../../lib/upload/limits';
import { transformToAvif } from '../../../../lib/upload/transform';

/**
 * Image upload route, Phase 7 slice #45.
 *
 * Pipeline (defence in depth, top to bottom; any failure returns a generic
 * JSON body so an attacker cannot tell which check fired):
 *
 *  1. Auth: `auth()` must return a session, and `session.user.email` must
 *     match `ADMIN_EMAIL` through the same allowlist helper used by sign-in
 *     (slice #36 / #37). Anonymous and non-admin requests both return 401
 *     with the same body.
 *  2. Method: only POST is supported. Anything else returns 405.
 *  3. Content-Length: rejected with 411 if missing, 413 if it exceeds the
 *     1.5 MiB cap. The cap is tighter than the issue's stated 2 MiB; the
 *     PR body documents the tie-break.
 *  4. Content-Type: must be `multipart/form-data` (the form posted from
 *     `ImageUploader`). Anything else returns 415.
 *  5. FormData parse: a single `file` field is required. Bad shape returns
 *     422.
 *  6. File MIME header check + magic-byte sniff: both must agree on a value
 *     in the allowlist (`image/jpeg|png|webp|avif`). Mismatch or any other
 *     value returns 415. Magic-byte sniffing blocks a spoofed Content-Type
 *     header on a script payload renamed `pic.jpg`.
 *  7. AVIF transcode through sharp. A decode failure (corrupt input)
 *     returns 422; an encode failure returns 500.
 *  8. `put()` to Vercel Blob with `addRandomSuffix: true`, `access: 'public'`,
 *     `contentType: 'image/avif'`. The Blob URL is returned as JSON.
 *
 * Runtime invariants:
 *
 *  - `runtime = 'nodejs'`: sharp ships native binaries that the edge
 *    runtime cannot load.
 *  - `dynamic = 'force-dynamic'`: the route reads `auth()` (cookies) and
 *    must not be cached or prerendered.
 *  - `BLOB_READ_WRITE_TOKEN` is read by `@vercel/blob` from `process.env`
 *    automatically. The Vercel Blob marketplace integration injects it on
 *    deploy. The build must not require it (it is only read inside `put()`
 *    at request time), so `pnpm build` stays green in CI.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GENERIC_UNAUTHORISED = { error: 'unauthorised' } as const;
const GENERIC_BAD_REQUEST = { error: 'bad_request' } as const;
const GENERIC_PAYLOAD_TOO_LARGE = { error: 'payload_too_large' } as const;
const GENERIC_LENGTH_REQUIRED = { error: 'length_required' } as const;
const GENERIC_UNSUPPORTED_MEDIA = { error: 'unsupported_media' } as const;
const GENERIC_UNPROCESSABLE = { error: 'unprocessable' } as const;
const GENERIC_INTERNAL = { error: 'internal' } as const;

export async function POST(request: NextRequest): Promise<Response> {
  // 1. Auth + allowlist. Both failure modes share a body so a probe cannot
  // tell from the response whether the cookie existed at all.
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (!isAllowedAdminEmail(email, process.env.ADMIN_EMAIL)) {
    return NextResponse.json(GENERIC_UNAUTHORISED, { status: 401 });
  }

  // 2. Cheap header gates before reading any bytes.
  const contentLength = parseContentLength(request.headers.get('content-length'));
  const sizeVerdict = validateUploadSize(contentLength);
  if (!sizeVerdict.ok) {
    if (sizeVerdict.reason === 'missing') {
      return NextResponse.json(GENERIC_LENGTH_REQUIRED, { status: 411 });
    }
    return NextResponse.json(GENERIC_PAYLOAD_TOO_LARGE, { status: 413 });
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('multipart/form-data')) {
    return NextResponse.json(GENERIC_UNSUPPORTED_MEDIA, { status: 415 });
  }

  // 3. Parse the body. `request.formData()` enforces the multipart envelope.
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(GENERIC_BAD_REQUEST, { status: 400 });
  }

  const fileEntry = formData.get('file');
  if (!(fileEntry instanceof File)) {
    return NextResponse.json(GENERIC_BAD_REQUEST, { status: 400 });
  }

  // 4. Header-level MIME check. Sniff afterwards.
  const headerMime = validateMimeType(fileEntry.type);
  if (!headerMime.ok) {
    return NextResponse.json(GENERIC_UNSUPPORTED_MEDIA, { status: 415 });
  }

  // 5. Re-check the byte length now that the body is parsed; the header was
  // a hint, the actual file size is the binding number.
  if (fileEntry.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(GENERIC_PAYLOAD_TOO_LARGE, { status: 413 });
  }

  // 6. Read the buffer. `arrayBuffer()` returns the full body in memory;
  // safe under the 1.5 MiB cap.
  const arrayBuffer = await fileEntry.arrayBuffer();
  const view = new Uint8Array(arrayBuffer);

  const sniffed = sniffImageMime(view);
  if (sniffed === null || sniffed !== headerMime.mime) {
    return NextResponse.json(GENERIC_UNSUPPORTED_MEDIA, { status: 415 });
  }

  // 7. AVIF transcode.
  const transcode = await transformToAvif(view);
  if (!transcode.ok) {
    if (transcode.reason === 'decode') {
      return NextResponse.json(GENERIC_UNPROCESSABLE, { status: 422 });
    }
    return NextResponse.json(GENERIC_INTERNAL, { status: 500 });
  }

  // 8. Persist. `addRandomSuffix: true` prevents collisions; `access:
  // 'public'` is required because the public portfolio renders the URL
  // directly. The pathname is sanitised so a malicious filename cannot land
  // outside `cms/`.
  const pathname = sanitiseBlobPathname(fileEntry.name);
  let result: { url: string; pathname: string };
  try {
    result = await put(pathname, transcode.avif, {
      access: 'public',
      addRandomSuffix: true,
      contentType: 'image/avif',
    });
  } catch {
    return NextResponse.json(GENERIC_INTERNAL, { status: 500 });
  }

  return NextResponse.json(
    {
      url: result.url,
      pathname: result.pathname,
      size: transcode.avif.byteLength,
      contentType: 'image/avif',
    },
    { status: 200 },
  );
}

// Reject every method other than POST so OPTIONS, GET, etc. do not leak any
// information about the route's existence beyond a 405. Next.js treats
// missing exports as 405 implicitly, but being explicit also pins the
// allowed-methods envelope.
export async function GET(): Promise<Response> {
  return new NextResponse(null, { status: 405, headers: { Allow: 'POST' } });
}

function parseContentLength(value: string | null): number | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return parsed;
}
