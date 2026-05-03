import type { MetadataRoute } from 'next';
import { siteOrigin } from '../lib/seo/origin';

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
