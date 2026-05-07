import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import { ProjectSchema, SiteSchema } from '../lib/schema';

interface Ok {
  ok: true;
}

interface Err {
  ok: false;
  message: string;
}

export type ValidationResult = Ok | Err;

export function validateSiteJsonFile(absolutePath: string): ValidationResult {
  let raw: string;
  try {
    raw = readFileSync(absolutePath, 'utf8');
  } catch (err) {
    return {
      ok: false,
      message: `Could not read ${absolutePath}: ${(err as Error).message}`,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      ok: false,
      message: `Invalid JSON in ${absolutePath}: ${(err as Error).message}`,
    };
  }

  const result = SiteSchema.safeParse(parsed);
  if (result.success) {
    return { ok: true };
  }

  const lines = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '<root>';
    return `  ${path}: ${issue.message}`;
  });

  return {
    ok: false,
    message: `Schema validation failed for ${absolutePath}:\n${lines.join('\n')}`,
  };
}

export function validateProjectMdxFile(
  absolutePath: string,
  expectedSlug: string,
): ValidationResult {
  let raw: string;
  try {
    raw = readFileSync(absolutePath, 'utf8');
  } catch (err) {
    return {
      ok: false,
      message: `Could not read ${absolutePath}: ${(err as Error).message}`,
    };
  }

  const parsed = matter(raw);
  const result = ProjectSchema.safeParse(parsed.data);
  if (!result.success) {
    const lines = result.error.issues.map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : '<root>';
      return `  ${path}: ${issue.message}`;
    });
    return {
      ok: false,
      message: `Frontmatter validation failed for ${absolutePath}:\n${lines.join('\n')}`,
    };
  }

  if (result.data.slug !== expectedSlug) {
    return {
      ok: false,
      message: `Frontmatter slug "${result.data.slug}" does not match filename in ${absolutePath}.`,
    };
  }

  if (parsed.content.trim().length === 0) {
    return {
      ok: false,
      message: `Empty markdown body in ${absolutePath}.`,
    };
  }

  return { ok: true };
}

const SITE_JSON_PATH = join(process.cwd(), 'content', 'site.json');
const PROJECTS_DIR = join(process.cwd(), 'content', 'projects');

function isDirectInvocation(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) {
    return false;
  }
  return import.meta.url === pathToFileURL(entry).href;
}

if (isDirectInvocation()) {
  // Exit code 0: all content valid. 1: known content error (missing file,
  // invalid JSON, schema violation). 2: unexpected crash inside the
  // validator itself. Matches scripts/check-forbidden-chars.ts.
  try {
    const siteResult = validateSiteJsonFile(SITE_JSON_PATH);
    if (!siteResult.ok) {
      process.stderr.write(`${siteResult.message}\n`);
      process.exit(1);
    }

    const siteRaw = JSON.parse(readFileSync(SITE_JSON_PATH, 'utf8')) as { projects: string[] };
    for (const slug of siteRaw.projects) {
      const path = join(PROJECTS_DIR, `${slug}.mdx`);
      const mdxResult = validateProjectMdxFile(path, slug);
      if (!mdxResult.ok) {
        process.stderr.write(`${mdxResult.message}\n`);
        process.exit(1);
      }
    }

    process.stdout.write(
      `content/site.json valid; ${siteRaw.projects.length} project mdx files valid\n`,
    );
    process.exit(0);
  } catch (err) {
    process.stderr.write(`validate-content failed: ${(err as Error).message}\n`);
    process.exit(2);
  }
}
