import type { MetadataRoute } from 'next';
import { loadSite } from '../lib/content';
import { siteOrigin } from '../lib/seo/origin';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = await loadSite();
  const origin = siteOrigin();
  return [{ url: origin }, ...site.projects.map((slug) => ({ url: `${origin}/projects/${slug}` }))];
}
