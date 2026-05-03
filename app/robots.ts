import type { MetadataRoute } from 'next';

// NEXT_PUBLIC_SITE_URL is the canonical origin once DNS aliases land
// (issue #4). Until then this falls back to the production domain so the
// generated sitemap and robots responses still resolve in preview builds.
const FALLBACK_ORIGIN = 'https://davidonasanya.com';

function siteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, '');
  }
  return FALLBACK_ORIGIN;
}

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
