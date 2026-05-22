import type { MetadataRoute } from 'next';
import { loadSite } from '../lib/content';
import { BRAND_500_HEX } from '../lib/seo/brand-colors';

// Web App Manifest fields require literal CSS <color> strings; the
// oklch tokens in `tokens.css` would be silently ignored on the Android
// home-screen and iOS Safari status bar. `BRAND_500_HEX` is the
// sRGB-resolved value of `--color-brand-500` (oklch(0.78 0.18 145))
// computed once at module load by `lib/seo/brand-colors.ts`, so a token
// change in tokens.css plus a one-line update there cascades into the
// manifest without a hand-maintained constant here. The neutral 900
// background stays as a literal because there is no token-equivalent
// for the manifest canvas; the visual identity is the brand stripe.
const BACKGROUND_COLOR = '#0a0a0a';
const THEME_COLOR = BRAND_500_HEX;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const site = await loadSite();
  // Web App Manifest spec recommends short_name <= 12 chars (it appears
  // under the home-screen icon and is silently truncated otherwise).
  // Deriving from the first space-separated token keeps full names like
  // "David Onasanya" within budget without a separate schema field.
  const shortName = site.person.name.split(' ')[0] ?? site.person.name;
  return {
    name: site.person.name,
    short_name: shortName,
    start_url: '/',
    display: 'standalone',
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
  };
}
