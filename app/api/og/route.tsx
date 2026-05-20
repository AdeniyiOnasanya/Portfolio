import { ImageResponse } from 'next/og';
import { loadSite } from '@/lib/content';
import { loadFont } from '@/lib/seo/og-fonts';
import {
  HomeOgTemplate,
  OG_TEMPLATE_DIMENSIONS,
  OgForbiddenCharacterError,
} from '@/lib/seo/og-template';

/**
 * Home OpenGraph image route, Phase 9 slice #53.
 *
 * GET /api/og returns a 1200x630 PNG composed by Satori from
 * `HomeOgTemplate`. The route is the OpenGraph image that the home
 * page's `metadata.openGraph.images` points at, so Twitter, LinkedIn,
 * Slack, and Google's social card cache fetch this URL when they see a
 * link to the deployment.
 *
 * Runtime: nodejs (default for `next/og` since Next 16; the previous
 * Edge runtime is now deprecated for new code). The fonts loader uses
 * `fetch()` against the Google Fonts CSS2 endpoint, which works in
 * both runtimes; we pin nodejs explicitly so the route does not flip
 * to Edge on a future Next config change.
 *
 * Caching: the route emits `public, immutable, max-age=86400` so the
 * Vercel CDN keeps the PNG warm for a day. The home OG card is
 * intentionally static (name, role, year, brand stripe), so day-long
 * staleness is acceptable. Per-content invalidation would require a
 * cache tag layer; not justified for this surface.
 *
 * The route never reads request headers or query parameters. Adding
 * personalisation here would defeat the social-platform cache.
 */

export const runtime = 'nodejs';
// `force-dynamic` keeps the build pass off this route. Static prerender
// at `next build` time would otherwise need Satori to fully parse the
// variable-axis Fraunces TTF, which fails inside the build worker;
// generating on first request avoids that, and the `Cache-Control`
// header below pins each rendered PNG at Vercel's CDN for 24h so the
// per-region cold start cost amortises to effectively nothing.
export const dynamic = 'force-dynamic';

const OG_CACHE_CONTROL = 'public, immutable, max-age=86400';

export async function GET(): Promise<Response> {
  try {
    const site = await loadSite();
    const name = site.person.name;
    const nameAccent = site.person.nameAccent;
    const role = site.person.role;
    const year = new Date().getFullYear();

    // Self-hosted TTFs under `assets/fonts/` (Satori does not accept
    // WOFF2). Both files ship in the function bundle, so the load is
    // a local disk read with no network dependency at request time.
    const [fraunces, mono] = await Promise.all([
      loadFont({ family: 'Fraunces', weight: 400, style: 'italic' }),
      loadFont({ family: 'JetBrains Mono', weight: 400, style: 'normal' }),
    ]);

    return new ImageResponse(HomeOgTemplate({ name, nameAccent, role, year }), {
      width: OG_TEMPLATE_DIMENSIONS.width,
      height: OG_TEMPLATE_DIMENSIONS.height,
      fonts: [
        { name: fraunces.name, data: fraunces.data, weight: 400, style: 'italic' },
        { name: mono.name, data: mono.data, weight: 400, style: 'normal' },
      ],
      headers: {
        'Cache-Control': OG_CACHE_CONTROL,
      },
    });
  } catch (error) {
    if (error instanceof OgForbiddenCharacterError) {
      // A forbidden character in the site content is a content bug, not
      // an upstream failure. Reply with a structured 422 so a future
      // monitor can detect the regression without scraping logs.
      return new Response(
        JSON.stringify({ ok: false, error: 'forbidden_character', field: error.field }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      );
    }
    // Anything else (Google Fonts CDN hiccup, Satori internal) becomes
    // a generic 500. The social platforms will retry, and the previous
    // (good) cached version stays visible in the meantime.
    return new Response(JSON.stringify({ ok: false, error: 'og_render_failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
