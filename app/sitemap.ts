import type { MetadataRoute } from 'next';
import { loadSite } from '../lib/content';

// NEXT_PUBLIC_SITE_URL is the canonical origin once DNS aliases land
// (issue #4). Until then this falls back to the production domain so the
// generated sitemap, robots, and OG outputs still resolve in preview builds.
const FALLBACK_ORIGIN = 'https://davidonasanya.com';

function siteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, '');
  }
  return FALLBACK_ORIGIN;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = await loadSite();
  const origin = siteOrigin();
  return [{ url: origin }, ...site.projects.map((slug) => ({ url: `${origin}/projects/${slug}` }))];
}
