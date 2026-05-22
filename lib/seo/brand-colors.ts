/**
 * Brand colour resolver for surfaces that cannot consume the oklch tokens
 * directly, Phase 9 slice #56.
 *
 * The design tokens in `tokens.css` are authored in oklch (perceptually
 * uniform; future-proof against the wider gamut Safari and Chrome both
 * ship). Two surfaces in this project cannot consume oklch literally:
 *
 *   1. `app/manifest.ts` (Web App Manifest). The MDN spec for
 *      `theme_color` requires a CSS <color> string, but `oklch()` is not
 *      listed as a recognised value in the manifest schema and several
 *      OS chrome surfaces (Chrome's Android home-screen icon, iOS
 *      Safari's status bar) currently ignore oklch and fall back to
 *      transparent. Hex stays universally honoured.
 *   2. `next/og`'s `ImageResponse` JSX runtime. The Satori renderer it
 *      uses for OG images supports a subset of CSS that includes named
 *      colours, hex, rgb, and hsl, but not oklch.
 *
 * Rather than letting these surfaces drift from the source of truth, we
 * convert the brand token's oklch triple to sRGB hex once, here, and
 * import the constant where it is needed. The conversion is exposed as
 * a pure function as well so a future brand re-tune can compute new
 * hexes without manual ColorJS round-trips.
 *
 * Algorithm: OKLab to linear sRGB matrix (Björn Ottosson, 2020), then
 * linear sRGB to gamma sRGB via the standard transfer function. Out of
 * gamut components are clamped to [0, 1] because the manifest needs a
 * concrete colour even when the oklch triple sits slightly outside the
 * sRGB triangle; the perceptual error is tiny for the brand 500 we ship
 * (delta E < 1).
 */

export type Oklch = {
  /** Perceptual lightness, 0 (black) to 1 (white). */
  L: number;
  /** Chroma, 0 (grey) to ~0.4 for the most saturated sRGB hues. */
  C: number;
  /** Hue angle in degrees, 0 to 360. */
  h: number;
};

/**
 * Brand 500 in oklch. Mirrors `--color-brand-500` in `tokens.css`. Any
 * change to the token must be reflected here; the snapshot test on the
 * resolved manifest body catches the divergence at PR time.
 */
export const BRAND_500_OKLCH: Oklch = { L: 0.78, C: 0.18, h: 145 };

/**
 * Resolved sRGB hex of `BRAND_500_OKLCH`. Computed at module load so the
 * manifest, OG template, and any other consumer share a single string
 * rather than each round-tripping through the converter.
 */
export const BRAND_500_HEX: string = oklchToHex(BRAND_500_OKLCH);

export function oklchToHex({ L, C, h }: Oklch): string {
  const hRad = (h * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // OKLab to linear sRGB. The matrix is the published OKLab inverse
  // multiplied by the linear sRGB primaries; constants are exact to ten
  // decimals.
  const lPrime = L + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = L - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = L - 0.0894841775 * a - 1.291485548 * b;

  const lLin = lPrime ** 3;
  const mLin = mPrime ** 3;
  const sLin = sPrime ** 3;

  const rLin = 4.0767416621 * lLin - 3.3077115913 * mLin + 0.2309699292 * sLin;
  const gLin = -1.2684380046 * lLin + 2.6097574011 * mLin - 0.3413193965 * sLin;
  const bLin = -0.0041960863 * lLin - 0.7034186147 * mLin + 1.707614701 * sLin;

  const r = linearToSrgb(rLin);
  const g = linearToSrgb(gLin);
  const blue = linearToSrgb(bLin);

  return `#${toHexByte(r)}${toHexByte(g)}${toHexByte(blue)}`;
}

function linearToSrgb(value: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  if (clamped <= 0.0031308) {
    return 12.92 * clamped;
  }
  return 1.055 * clamped ** (1 / 2.4) - 0.055;
}

function toHexByte(value: number): string {
  return Math.round(value * 255)
    .toString(16)
    .padStart(2, '0');
}
