import type { MetadataRoute } from 'next';
import { loadSite } from '../lib/content';

// Hardcoded brand colours mirror tokens.css (--color-neutral-900 canvas in
// dark, --color-brand-500 accent). Web App Manifest fields require literal
// CSS colours, so we ship hex approximations of the oklch tokens here and
// keep the source of truth aligned in tokens.css.
const BACKGROUND_COLOR = '#0a0a0a';
const THEME_COLOR = '#7cd87a';

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
