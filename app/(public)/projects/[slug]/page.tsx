import { notFound } from 'next/navigation';
import { DeepDive } from '../../../../components/public/DeepDive';
import { ProjectCaseStudy } from '../../../../components/public/ProjectCaseStudy';
import { loadSite } from '../../../../lib/content';
import { loadProjectBySlug } from '../../../../lib/projects';

// dynamicParams = false makes Next.js return a prerendered 404 directly for
// any slug not declared in generateStaticParams, instead of falling back to
// on-demand SSR. This route is fully static (the seven seed slugs are the
// universe of valid pages) so the immediate 404 is the correct behaviour.
export const dynamicParams = false;

export async function generateStaticParams() {
  const site = await loadSite();
  return site.projects.map((slug) => ({ slug }));
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const file = await loadProjectBySlug(slug);
  if (!file) {
    notFound();
  }
  return (
    <>
      <ProjectCaseStudy file={file} />
      {file.frontmatter.deepDive ? <DeepDive data={file.frontmatter.deepDive} /> : null}
    </>
  );
}
