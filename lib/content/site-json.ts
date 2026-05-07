import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type Site, SiteSchema } from '../schema';

const SITE_JSON_PATH = join(process.cwd(), 'content', 'site.json');

export async function readSiteFromDisk(): Promise<Site> {
  const raw = await readFile(SITE_JSON_PATH, 'utf8');
  return SiteSchema.parse(JSON.parse(raw) as unknown);
}
