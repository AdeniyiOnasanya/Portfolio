import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import matter from 'gray-matter';
import { loadSite } from './content';
import { type Project, ProjectSchema } from './schema';

export interface ProjectFile {
  slug: string;
  frontmatter: Project;
  body: string;
}

const PROJECTS_DIR = join(process.cwd(), 'content', 'projects');

async function loadProjectFile(slug: string): Promise<ProjectFile> {
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

// Source of order: content/site.json's projects array (validated by
// SiteSchema as a non-empty list of unique kebab-case slugs). The loader
// reads each named MDX file, parses its frontmatter via gray-matter,
// validates it against ProjectSchema, and returns the case-study payload
// in the same order site.json declares.
export async function loadProjectFiles(): Promise<ProjectFile[]> {
  const site = await loadSite();
  return Promise.all(site.projects.map(loadProjectFile));
}

// Returns the case-study payload for a single slug, or null when the slug is
// not declared in site.json's projects[]. The route handler maps null to
// notFound() so unknown URLs render the 404 surface instead of a server error.
export async function loadProjectBySlug(slug: string): Promise<ProjectFile | null> {
  const site = await loadSite();
  if (!site.projects.includes(slug)) {
    return null;
  }
  return loadProjectFile(slug);
}
