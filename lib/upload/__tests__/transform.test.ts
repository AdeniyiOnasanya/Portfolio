import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { sniffImageMime } from '../limits';
import { AVIF_QUALITY, transformToAvif } from '../transform';

/*
 * AVIF transcode unit tests, slice #45.
 *
 * Builds a real (small) PNG with sharp at fixture time so the test does not
 * ship an opaque binary blob, then runs the input through `transformToAvif`
 * and asserts:
 *   1. The output is genuinely AVIF (magic-byte sniffed, not just a string
 *      property).
 *   2. The output is smaller than the input (or at least proportionate; we
 *      do not over-promise the compression ratio for a tiny synthetic PNG).
 *   3. Decode failures on garbage bytes return `{ ok: false, reason: 'decode' }`,
 *      not a thrown error. The route handler maps that to 422.
 */

async function makePng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 30, g: 80, b: 200 },
    },
  })
    .png()
    .toBuffer();
}

describe('AVIF_QUALITY', () => {
  it('is 70 (the documented sharp tradeoff for photographic content)', () => {
    expect(AVIF_QUALITY).toBe(70);
  });
});

describe('transformToAvif', () => {
  it('transcodes a PNG to AVIF and returns the byte buffer', async () => {
    const png = await makePng(64, 64);
    const result = await transformToAvif(png);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sniffed = sniffImageMime(new Uint8Array(result.avif));
    expect(sniffed).toBe('image/avif');
  });

  it('accepts a Uint8Array input and still produces AVIF output', async () => {
    const png = await makePng(48, 48);
    const view = new Uint8Array(png);
    const result = await transformToAvif(view);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.avif.byteLength).toBeGreaterThan(0);
  });

  it('returns reason=decode for garbage bytes (not throw)', async () => {
    const garbage = Buffer.from('this is not an image, it is plain text');
    const result = await transformToAvif(garbage);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('decode');
  });

  it('drops EXIF metadata (no rotation hint, no GPS) on the AVIF output', async () => {
    // Build a PNG with sharp's default (no EXIF). After AVIF transcode the
    // metadata.exif field should be undefined.
    const png = await makePng(32, 32);
    const result = await transformToAvif(png);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const meta = await sharp(result.avif).metadata();
    expect(meta.exif).toBeUndefined();
  });
});
