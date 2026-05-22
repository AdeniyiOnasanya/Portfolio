import { describe, expect, it } from 'vitest';
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  sanitiseBlobPathname,
  sniffImageMime,
  validateMimeType,
  validateUploadSize,
} from '../limits';

/*
 * Upload validation primitives, slice #45.
 *
 * The route handler at `app/api/cms/upload/route.ts` is the single caller of
 * everything tested here. The unit tests pin the contract (size cap, MIME
 * allowlist, magic-byte sniff, pathname sanitisation) so a future refactor of
 * the route does not silently widen the surface.
 */

describe('MAX_UPLOAD_BYTES', () => {
  it('is 1.5 MiB exactly (the implementation-plan cap, tighter than the issue text)', () => {
    expect(MAX_UPLOAD_BYTES).toBe(1572864);
  });
});

describe('validateUploadSize', () => {
  it('rejects null with reason=missing, status=411', () => {
    expect(validateUploadSize(null)).toEqual({
      ok: false,
      reason: 'missing',
      status: 411,
    });
  });

  it('rejects undefined with reason=missing', () => {
    expect(validateUploadSize(undefined)).toMatchObject({ ok: false, reason: 'missing' });
  });

  it('rejects zero and negatives', () => {
    expect(validateUploadSize(0)).toMatchObject({ ok: false, reason: 'missing' });
    expect(validateUploadSize(-1)).toMatchObject({ ok: false, reason: 'missing' });
  });

  it('accepts a 2 MB JPEG up to the cap', () => {
    expect(validateUploadSize(MAX_UPLOAD_BYTES)).toEqual({ ok: true });
  });

  it('rejects one byte over the cap with status=413', () => {
    expect(validateUploadSize(MAX_UPLOAD_BYTES + 1)).toEqual({
      ok: false,
      reason: 'oversized',
      status: 413,
    });
  });

  it('rejects NaN', () => {
    expect(validateUploadSize(Number.NaN)).toMatchObject({ ok: false, reason: 'missing' });
  });
});

describe('validateMimeType', () => {
  for (const mime of ALLOWED_MIME_TYPES) {
    it(`accepts ${mime}`, () => {
      expect(validateMimeType(mime)).toEqual({ ok: true, mime });
    });
  }

  it('strips charset parameters before matching', () => {
    expect(validateMimeType('image/jpeg; charset=binary')).toEqual({
      ok: true,
      mime: 'image/jpeg',
    });
  });

  it('matches case-insensitively', () => {
    expect(validateMimeType('IMAGE/PNG')).toEqual({ ok: true, mime: 'image/png' });
  });

  it('rejects empty, null, or non-string inputs', () => {
    expect(validateMimeType('')).toMatchObject({ ok: false, status: 415 });
    expect(validateMimeType(null)).toMatchObject({ ok: false, status: 415 });
    expect(validateMimeType(undefined)).toMatchObject({ ok: false, status: 415 });
  });

  it('rejects SVG (script surface) and HEIC (no AVIF transcode path)', () => {
    expect(validateMimeType('image/svg+xml')).toMatchObject({ ok: false });
    expect(validateMimeType('image/heic')).toMatchObject({ ok: false });
  });

  it('rejects non-image media types', () => {
    expect(validateMimeType('application/javascript')).toMatchObject({ ok: false });
    expect(validateMimeType('text/html')).toMatchObject({ ok: false });
    expect(validateMimeType('application/octet-stream')).toMatchObject({ ok: false });
  });
});

describe('sniffImageMime', () => {
  it('returns null for buffers shorter than 12 bytes', () => {
    expect(sniffImageMime(new Uint8Array(5))).toBeNull();
  });

  it('detects JPEG by FF D8 FF', () => {
    const buf = new Uint8Array(16);
    buf.set([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(sniffImageMime(buf)).toBe('image/jpeg');
  });

  it('detects PNG by 89 50 4E 47 0D 0A 1A 0A', () => {
    const buf = new Uint8Array(16);
    buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(sniffImageMime(buf)).toBe('image/png');
  });

  it('detects WebP by RIFF....WEBP', () => {
    const buf = new Uint8Array(16);
    buf.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(sniffImageMime(buf)).toBe('image/webp');
  });

  it('detects AVIF by ftypavif at offset 4', () => {
    const buf = new Uint8Array(16);
    buf.set([0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66]);
    expect(sniffImageMime(buf)).toBe('image/avif');
  });

  it('rejects an HTML payload renamed pic.jpg', () => {
    const buf = new TextEncoder().encode('<html><body>hi</body></html>');
    expect(sniffImageMime(buf)).toBeNull();
  });

  it('rejects an SVG even though SVG is technically an image', () => {
    const buf = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    expect(sniffImageMime(buf)).toBeNull();
  });
});

describe('sanitiseBlobPathname', () => {
  it('lowercases, collapses non-alphanumerics, and forces .avif', () => {
    expect(sanitiseBlobPathname('My Photo.JPG')).toBe('cms/my-photo.avif');
  });

  it('strips leading directory components', () => {
    expect(sanitiseBlobPathname('../../etc/passwd')).toBe('cms/passwd.avif');
  });

  it('strips Windows-style backslash directory components', () => {
    expect(sanitiseBlobPathname('C:\\Users\\evil\\shell.png')).toBe('cms/shell.avif');
  });

  it('falls back to "image" on empty input', () => {
    expect(sanitiseBlobPathname('')).toBe('cms/image.avif');
    expect(sanitiseBlobPathname(null)).toBe('cms/image.avif');
    expect(sanitiseBlobPathname(undefined)).toBe('cms/image.avif');
  });

  it('falls back when the basename is all separators', () => {
    expect(sanitiseBlobPathname('!!!.png')).toBe('cms/image.avif');
  });

  it('caps the basename at 64 characters', () => {
    const long = 'a'.repeat(200);
    const result = sanitiseBlobPathname(`${long}.png`);
    // 4 chars 'cms/' + 64 chars + '.avif' (5 chars) = 73
    expect(result.length).toBe(73);
    expect(result.startsWith('cms/')).toBe(true);
    expect(result.endsWith('.avif')).toBe(true);
  });

  it('produces only safe characters in the output', () => {
    const result = sanitiseBlobPathname(' \t!!Hero / Banner ?? .png');
    expect(result).toMatch(/^cms\/[a-z0-9-]+\.avif$/);
  });
});
