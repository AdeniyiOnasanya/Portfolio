import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Font loader for `next/og`'s Satori runtime, Phase 9 slice #53.
 *
 * Satori (the SVG renderer behind `next/og`'s ImageResponse) requires
 * TTF or OTF bytes; it does not support WOFF/WOFF2 (rejects with
 * "Unsupported OpenType signature wOF2"). The Google Fonts CSS2
 * endpoint only emits WOFF2 today, so fetching at request time would
 * work for the route but break the static build pass.
 *
 * Self-hosting under `assets/fonts/` is the official Vercel-documented
 * pattern (see https://nextjs.org/docs/app/api-reference/functions/
 * image-response#configure-custom-fonts). The two TTFs we ship are:
 *
 *  - Fraunces Italic (variable axes inlined): used for the editorial
 *    name display on the home OG card.
 *  - JetBrains Mono (variable weight inlined): used for the mono
 *    caption ("Portfolio / 2026") and the role line.
 *
 * Both files sit outside `public/` so they are not served as static
 * assets at /fonts/* (the build pipeline reads them from disk at
 * request time only). Total weight is ~500 KB, acceptable for a
 * function bundle that ships once per deployment.
 *
 * `process.cwd()` is the Next.js project root at request time (the
 * function runtime resolves it identically to the dev server), so the
 * paths here are stable across `next dev`, `next build`, and the
 * Vercel function runtime.
 */

export type LoadedFont = {
  name: string;
  data: ArrayBuffer;
  weight: number;
  style: 'normal' | 'italic';
};

const FONT_DIR = 'assets/fonts';

const FONT_FILES = {
  Fraunces: 'Fraunces-Italic.ttf',
  'JetBrains Mono': 'JetBrainsMono.ttf',
} as const;

export type LoadFontInput = {
  family: keyof typeof FONT_FILES;
  weight: number;
  style: 'normal' | 'italic';
};

export async function loadFont(input: LoadFontInput): Promise<LoadedFont> {
  const filename = FONT_FILES[input.family];
  const path = join(process.cwd(), FONT_DIR, filename);
  const buffer = await readFile(path);
  // Satori expects an ArrayBuffer. `Buffer` is a Uint8Array view, so
  // copy the relevant byte range into a fresh ArrayBuffer.
  const ab = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
  return {
    name: input.family,
    data: ab,
    weight: input.weight,
    style: input.style,
  };
}
