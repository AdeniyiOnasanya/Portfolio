import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SiteSchema } from '../lib/schema';

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

const SITE_JSON_PATH = join(process.cwd(), 'content', 'site.json');

function isDirectInvocation(): boolean {
  const entry = process.argv[1];
  if (entry === undefined) {
    return false;
  }
  return import.meta.url === pathToFileURL(entry).href;
}

if (isDirectInvocation()) {
  // Exit code 0: content valid. 1: known content error (missing file, invalid
  // JSON, schema violation). 2: unexpected crash inside the validator itself.
  // Matches the contract used by scripts/check-forbidden-chars.ts.
  try {
    const result = validateSiteJsonFile(SITE_JSON_PATH);
    if (result.ok) {
      process.stdout.write('content/site.json valid\n');
      process.exit(0);
    }
    process.stderr.write(`${result.message}\n`);
    process.exit(1);
  } catch (err) {
    process.stderr.write(`validate-content failed: ${(err as Error).message}\n`);
    process.exit(2);
  }
}
