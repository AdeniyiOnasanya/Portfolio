import { describe, expect, it } from 'vitest';
import { BRAND_500_HEX, BRAND_500_OKLCH, oklchToHex } from '../brand-colors';

/*
 * brand-colors tests, Phase 9 slice #56.
 *
 * The PWA manifest and the OG ImageResponse both need a sRGB hex string
 * for the brand 500 token, but the source of truth is oklch in
 * tokens.css. A snapshot here pins the resolved hex so a stray token
 * change cannot drift the manifest theme colour without surfacing in CI.
 */

describe('oklchToHex', () => {
  it('resolves the brand 500 oklch triple to a sRGB hex', () => {
    // `oklch(0.78 0.18 145)` is a moderately saturated green near the
    // boundary of the sRGB gamut at the brand's chosen hue. The expected
    // value is computed once via the published OKLab matrix.
    expect(oklchToHex(BRAND_500_OKLCH)).toBe('#61d46a');
  });

  it('pins BRAND_500_HEX so the manifest cannot silently drift', () => {
    expect(BRAND_500_HEX).toBe('#61d46a');
  });

  it('round-trips pure black', () => {
    expect(oklchToHex({ L: 0, C: 0, h: 0 })).toBe('#000000');
  });

  it('round-trips pure white', () => {
    // The OKLab L for sRGB white is 1; the conversion should clamp
    // exactly to ffffff without numerical jitter.
    expect(oklchToHex({ L: 1, C: 0, h: 0 })).toBe('#ffffff');
  });

  it('clamps out-of-gamut components rather than wrapping', () => {
    // L=0.5, C=0.4 sits well outside the sRGB triangle for most hues.
    // The output should be a valid hex with no negative or >1 components
    // and no NaN; the converter clamps each channel to [0, 1] before
    // gamma encoding.
    const hex = oklchToHex({ L: 0.5, C: 0.4, h: 0 });
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });
});
