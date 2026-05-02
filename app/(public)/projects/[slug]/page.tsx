import { notFound } from 'next/navigation';
import { DeepDive } from '../../../../components/public/DeepDive';
import { ProjectCaseStudy } from '../../../../components/public/ProjectCaseStudy';
import { loadSite } from '../../../../lib/content';
import { loadProjectBySlug } from '../../../../lib/projects';

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
