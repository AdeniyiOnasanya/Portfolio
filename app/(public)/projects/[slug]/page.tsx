import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { DeepDive } from '../../../../components/public/DeepDive';
import { ProjectCaseStudy } from '../../../../components/public/ProjectCaseStudy';
import { loadSite } from '../../../../lib/content';
import { loadProjectBySlug, loadProjectFiles } from '../../../../lib/projects';
import { creativeWorkJsonLd, serializeJsonLd } from '../../../../lib/seo/jsonld';
import { siteOrigin } from '../../../../lib/seo/origin';

// dynamicParams = false makes Next.js return a prerendered 404 directly for
// any slug not declared in generateStaticParams, instead of falling back to
// on-demand SSR. This route is fully static (the seven seed slugs are the
// universe of valid pages) so the immediate 404 is the correct behaviour.
export const dynamicParams = false;

export async function generateStaticParams() {
  const site = await loadSite();
  return site.projects.map((slug) => ({ slug }));
}

/**
 * Per-project OpenGraph + Twitter card metadata, Phase 9 slice #54.
 *
 * The image at `/api/og/<slug>` is generated dynamically by `next/og`
 * (see `app/api/og/[slug]/route.tsx`). Each project page points at
 * the route with its own slug, so a link shared on Twitter/LinkedIn
 * renders the project-specific card rather than the home card.
 *
 * Title and description come from the same MDX frontmatter the case
 * study itself reads, so the social preview text stays in sync with
 * the page content without a parallel source.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const file = await loadProjectBySlug(slug);
  if (!file) {
    return {};
  }
  const { title, subtitle, summary } = file.frontmatter;
  const imageUrl = `/api/og/${slug}`;
  return {
    title: `${title}, ${subtitle}`,
    description: summary,
    openGraph: {
      title: `${title}, ${subtitle}`,
      description: summary,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: `${title}, ${subtitle}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title}, ${subtitle}`,
      description: summary,
      images: [imageUrl],
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [file, site, allFiles] = await Promise.all([
    loadProjectBySlug(slug),
    loadSite(),
    loadProjectFiles(),
  ]);
  if (!file) {
    notFound();
  }
  const projectLd = creativeWorkJsonLd(file.frontmatter, site.person, siteOrigin());
  const all = allFiles.map((f) => f.frontmatter);
  const idx = all.findIndex((p) => p.slug === slug);
  // SiteSchema enforces projects.min(1), so all[] is non-empty.
  const prev = all[(idx - 1 + all.length) % all.length];
  const next = all[(idx + 1) % all.length];
  if (!prev || !next) {
    notFound();
  }
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be inline-rendered as text. Source is the validated project frontmatter from content/projects/<slug>.mdx; serializeJsonLd escapes < > & so a stray substring cannot close the script tag.
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(projectLd) }}
      />
      <ProjectCaseStudy file={file} prev={prev} next={next} total={all.length} />
      {file.frontmatter.deepDive ? (
        <DeepDive data={file.frontmatter.deepDive} n={file.frontmatter.n} />
      ) : null}
    </>
  );
}
