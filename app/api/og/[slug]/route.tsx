import { ImageResponse } from 'next/og';
import { loadProjectBySlug } from '@/lib/projects';
import { loadFont } from '@/lib/seo/og-fonts';
import {
  OG_TEMPLATE_DIMENSIONS,
  OgForbiddenCharacterError,
  ProjectOgTemplate,
} from '@/lib/seo/og-template';

/**
 * Per-project OpenGraph image route, Phase 9 slice #54.
 *
 * GET /api/og/<slug> returns a 1200x630 PNG composed by Satori from
 * `ProjectOgTemplate`. Each project page's
 * `metadata.openGraph.images` (and `metadata.twitter.images`) points
 * at this route with the project's slug, so a link to a case study on
 * Twitter, LinkedIn, or Slack renders a card showing the project's
 * display number, title, subtitle, and kind.
 *
 * Runtime + caching match the home OG route (slice #53):
 *  - `runtime = 'nodejs'`
 *  - `dynamic = 'force-dynamic'` (Satori's variable-font parsing
 *    fails in the build worker; per-request generation amortises to
 *    one render per region per day under the 24h CDN cache)
 *  - `Cache-Control: public, immutable, max-age=86400` so the social
 *    platforms see a stable image across their crawl windows.
 *
 * Unknown slugs return 404 to match the public route's behaviour
 * (`dynamicParams = false` on the case-study page). The MDX
 * frontmatter is validated by `loadProjectBySlug` -> `ProjectSchema`
 * before reaching the template, so an attacker cannot smuggle a
 * forbidden character past the slug guard.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OG_CACHE_CONTROL = 'public, immutable, max-age=86400';

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, ctx: RouteContext): Promise<Response> {
  const { slug } = await ctx.params;
  try {
    const file = await loadProjectBySlug(slug);
    if (!file) {
      // Unknown slug. 404 matches the case-study page's 404 surface
      // and stops social platforms from caching a confusing image
      // against a URL that will never exist.
      return new Response(JSON.stringify({ ok: false, error: 'not_found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const [fraunces, mono] = await Promise.all([
      loadFont({ family: 'Fraunces', weight: 400, style: 'italic' }),
      loadFont({ family: 'JetBrains Mono', weight: 400, style: 'normal' }),
    ]);

    return new ImageResponse(
      ProjectOgTemplate({
        n: file.frontmatter.n,
        title: file.frontmatter.title,
        subtitle: file.frontmatter.subtitle,
        kind: file.frontmatter.kind,
        year: file.frontmatter.year,
      }),
      {
        width: OG_TEMPLATE_DIMENSIONS.width,
        height: OG_TEMPLATE_DIMENSIONS.height,
        fonts: [
          { name: fraunces.name, data: fraunces.data, weight: 400, style: 'italic' },
          { name: mono.name, data: mono.data, weight: 400, style: 'normal' },
        ],
        headers: {
          'Cache-Control': OG_CACHE_CONTROL,
        },
      },
    );
  } catch (error) {
    if (error instanceof OgForbiddenCharacterError) {
      return new Response(
        JSON.stringify({ ok: false, error: 'forbidden_character', field: error.field }),
        { status: 422, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ ok: false, error: 'og_render_failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
