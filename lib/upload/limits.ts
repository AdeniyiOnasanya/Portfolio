/**
 * Upload validation primitives, Phase 7 slice #45.
 *
 * Pure helpers shared by the route handler in `app/api/cms/upload/route.ts`,
 * the client component in `components/admin/ImageUploader.tsx`, and the unit
 * tests under `lib/upload/__tests__/`. Nothing here reads the environment,
 * touches the filesystem, or imports a server-only module, so the same module
 * is safe in both the Node runtime route and the browser bundle.
 *
 * Contract decisions worth pinning down:
 *
 *  - `MAX_UPLOAD_BYTES` is 1.5 MiB. The user-facing issue (#45) says "2 MB
 *    JPEG/PNG"; the implementation plan (Phase 7) says 1.5 MiB hard cap.
 *    The cap is the binding number because (a) it keeps a single upload well
 *    inside Vercel's 4.5 MiB serverless body limit, (b) the AVIF transform
 *    halves storage on top of that, (c) the design files do not show a
 *    larger asset use case. The PR body documents the tie-break.
 *  - `ALLOWED_MIME_TYPES` is the JPEG / PNG / WebP / AVIF allowlist. Other
 *    image types (TIFF, BMP, SVG, HEIC) are rejected because the AVIF
 *    transform path either does not handle them safely (SVG is a script
 *    surface, HEIC requires a different decoder) or has no real use case
 *    here. The route handler also sniffs the first bytes of the body, so a
 *    spoofed `Content-Type` header still gets rejected.
 *  - `sanitiseBlobPathname` is the only function that turns user filenames
 *    into Blob keys. Anything outside `[A-Za-z0-9._-]` collapses to a single
 *    dash; a leading dot or slash is stripped; the result is forced into
 *    `cms/<basename>.avif`. That blocks path-traversal attempts and forces
 *    every uploaded asset into a single namespace under the store root.
 */

export const MAX_UPLOAD_BYTES = Math.floor(1.5 * 1024 * 1024);

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export type SizeValidation =
  | { ok: true }
  | { ok: false; reason: 'missing'; status: 411 }
  | { ok: false; reason: 'oversized'; status: 413 };

/**
 * Cheap pre-flight on the byte length the client claims. Defence in depth on
 * top of the route handler's stream length check; a request without a
 * `Content-Length` header is rejected with 411 so the server never has to
 * buffer an unbounded body to find out it was too large.
 */
export function validateUploadSize(byteLength: number | null | undefined): SizeValidation {
  if (typeof byteLength !== 'number' || !Number.isFinite(byteLength) || byteLength <= 0) {
    return { ok: false, reason: 'missing', status: 411 };
  }
  if (byteLength > MAX_UPLOAD_BYTES) {
    return { ok: false, reason: 'oversized', status: 413 };
  }
  return { ok: true };
}

export type MimeValidation =
  | { ok: true; mime: AllowedMimeType }
  | { ok: false; reason: 'unsupported'; status: 415 };

export function validateMimeType(value: string | null | undefined): MimeValidation {
  if (typeof value !== 'string') {
    return { ok: false, reason: 'unsupported', status: 415 };
  }
  // Strip any `; charset=...` parameter and lowercase before comparison.
  const normalised = value.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!normalised) {
    return { ok: false, reason: 'unsupported', status: 415 };
  }
  for (const allowed of ALLOWED_MIME_TYPES) {
    if (normalised === allowed) {
      return { ok: true, mime: allowed };
    }
  }
  return { ok: false, reason: 'unsupported', status: 415 };
}

/**
 * Sniff the first bytes of an uploaded buffer and return the MIME we infer
 * from the magic numbers. The route handler runs this on the request body
 * after the headers are parsed, so a request with a spoofed `Content-Type`
 * header still gets rejected when the bytes do not match.
 *
 * The list mirrors `ALLOWED_MIME_TYPES` exactly. Anything outside it returns
 * null and the route handler maps that to a 415.
 */
export function sniffImageMime(buffer: Uint8Array): AllowedMimeType | null {
  if (buffer.length < 12) {
    return null;
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  // RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  // AVIF: ISO BMFF box `ftyp` with brand `avif` or `avis` at offset 4.
  // bytes 4..8 == 'ftyp', bytes 8..12 == 'avif' or 'avis'.
  if (
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70 &&
    buffer[8] === 0x61 &&
    buffer[9] === 0x76 &&
    buffer[10] === 0x69 &&
    (buffer[11] === 0x66 || buffer[11] === 0x73)
  ) {
    return 'image/avif';
  }
  return null;
}

/**
 * Turn an arbitrary user filename into a safe Blob key under `cms/`.
 *
 * The output is always:
 *   cms/<basename>.avif
 *
 * where `<basename>` is the original name (without extension) collapsed to
 * `[a-z0-9-]` characters, lowercased, with leading/trailing dashes trimmed,
 * and capped at 64 characters. An empty or unusable input falls back to
 * `image`. The `.avif` extension is forced because the route always
 * transcodes through sharp before persisting, so the extension reflects the
 * stored format, not the upload format.
 */
export function sanitiseBlobPathname(filename: string | null | undefined): string {
  const fallback = 'image';
  const raw = typeof filename === 'string' ? filename : '';
  // Strip directory components, then drop the extension.
  const lastSlash = Math.max(raw.lastIndexOf('/'), raw.lastIndexOf('\\'));
  const tail = lastSlash >= 0 ? raw.slice(lastSlash + 1) : raw;
  const dotIndex = tail.lastIndexOf('.');
  const base = dotIndex > 0 ? tail.slice(0, dotIndex) : tail;
  const collapsed = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  const safe = collapsed || fallback;
  return `cms/${safe}.avif`;
}
