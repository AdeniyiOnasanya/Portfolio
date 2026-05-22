import sharp from 'sharp';

/**
 * AVIF transcode for uploaded admin images, Phase 7 slice #45.
 *
 * The route handler at `app/api/cms/upload/route.ts` reads the raw upload
 * buffer, validates auth + MIME + byte length, then calls `transformToAvif`
 * before persisting to Vercel Blob. The stored asset is always AVIF; the
 * upload format is JPEG / PNG / WebP / AVIF (existing AVIFs are still
 * round-tripped through sharp so the quality knob stays consistent).
 *
 * Why AVIF? It is the smallest modern format Safari, Chrome, and Firefox
 * all decode natively, and it lets the public site swap one set of `<img
 * src>` URLs for the new asset without a srcset workaround. The quality
 * setting (70) is the sharp default range that keeps photographic content
 * visually clean while halving file size on top of the input.
 *
 * The `.rotate()` call applies the EXIF orientation metadata before
 * transcoding so an iPhone photo uploaded sideways lands the right way up
 * in the Blob store. EXIF data is dropped from the AVIF output, which is
 * the desired behaviour: the stored asset has no GPS coordinates, no
 * camera serial, no timestamp.
 *
 * Sharp ships native binaries; the route handler must run on the
 * `nodejs` runtime, not edge. The `runtime = 'nodejs'` export in the route
 * file is what enforces that.
 */

export const AVIF_QUALITY = 70;

// Cap the decoded pixel count at 16 megapixels (4096 x 4096). The 1.5 MiB
// upload byte cap does not protect against image bombs; a small file can
// declare absurd dimensions and force libvips to allocate gigabytes when it
// decompresses. Sharp's default `limitInputPixels` is ~268 megapixels, which
// is enough to OOM a serverless worker.
const MAX_INPUT_PIXELS = 4096 * 4096;

export type TranscodeFailure = { ok: false; reason: 'decode' } | { ok: false; reason: 'encode' };

export type TranscodeResult = { ok: true; avif: Buffer } | TranscodeFailure;

/**
 * Decode the input buffer with sharp, apply EXIF rotation, encode as AVIF.
 *
 * Returns a discriminated union rather than throwing so the route layer can
 * map a decode failure (corrupt JPEG, truncated PNG) to a 422 without a
 * try/catch around sharp. Encode failures (extremely rare; usually OOM in
 * the libvips worker) get a 500.
 */
export async function transformToAvif(input: Uint8Array | Buffer): Promise<TranscodeResult> {
  // sharp accepts any Uint8Array but its types prefer Buffer. The input is
  // wrapped as a Buffer view of the same underlying memory; no copy.
  const buffer = Buffer.isBuffer(input)
    ? input
    : Buffer.from(input.buffer, input.byteOffset, input.byteLength);

  // Two-stage failure mapping. `metadata()` runs the decoder eagerly: if the
  // bytes are not a recognised image, it throws and we report `decode`. Once
  // metadata is available the encode is the only remaining failure surface.
  // Mapping the two paths separately lets the route handler return 422
  // (client supplied corrupt input) vs 500 (libvips ran out of memory or
  // similar) without guessing.
  let pipeline: sharp.Sharp;
  try {
    pipeline = sharp(buffer, {
      failOn: 'error',
      limitInputPixels: MAX_INPUT_PIXELS,
    }).rotate();
    await pipeline.metadata();
  } catch {
    return { ok: false, reason: 'decode' };
  }

  try {
    // Sharp's AVIF encoder strips EXIF and ICC by default; we deliberately do
    // not call `.withMetadata(...)` so the default (no metadata copy-through)
    // applies. The test in `transform.test.ts` confirms `meta.exif` is
    // undefined on the encoded output, which would regress if a future
    // sharp version changed the default.
    const avif = await pipeline.avif({ quality: AVIF_QUALITY }).toBuffer();
    return { ok: true, avif };
  } catch {
    return { ok: false, reason: 'encode' };
  }
}
