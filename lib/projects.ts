import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { type Project, ProjectSchema } from './schema';

// Source of truth for the seven case studies. Order matches the index in
// content/site.json so the home-page strip and the case-study pages stay in
// sync until a future slice derives one from the other.
export const PROJECT_SLUGS = [
  'multi-cloud-platform',
  'foster-care-platform',
  'compliance-electron',
  'calendar-tool',
  'microplastics-mobile',
  'endoscope-tracking',
  'elearning-platform',
] as const;

export type ProjectSlug = (typeof PROJECT_SLUGS)[number];

export interface ProjectFile {
  slug: ProjectSlug;
  frontmatter: Project;
  body: string;
}

const PROJECTS_DIR = join(process.cwd(), 'content', 'projects');

async function loadProjectFile(slug: ProjectSlug): Promise<ProjectFile> {
  const path = join(PROJECTS_DIR, `${slug}.mdx`);
  const raw = await readFile(path, 'utf8');
  const parsed = matter(raw);
  const frontmatter = ProjectSchema.parse(parsed.data);
  if (frontmatter.slug !== slug) {
    throw new Error(
      `Frontmatter slug "${frontmatter.slug}" does not match filename "${slug}.mdx".`,
    );
  }
  return { slug, frontmatter, body: parsed.content };
}

export async function loadProjectFiles(): Promise<ProjectFile[]> {
  return Promise.all(PROJECT_SLUGS.map(loadProjectFile));
}
