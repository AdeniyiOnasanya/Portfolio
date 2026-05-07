// Reserved slugs collide with top-level routes or framework-internal paths.
// Checked against the normalised output: an input like "_next" yields the
// kebab-case string "next" once underscores are stripped, so both forms are
// listed here to close the loop.
const RESERVED_SLUGS = new Set(['admin', 'api', 'login', 'cv', '_next', 'next']);

const MAX_LENGTH = 60;

// Combining marks (U+0300 to U+036F) are stripped after NFKD decomposes
// "cafe-acute" into "cafe" + combining acute. The Unicode escape form keeps
// the range bounds visible to editors, diff viewers, and copy-paste flows.
const COMBINING_MARK = /[\u0300-\u036F]/g;

export function slugify(input: string): string {
  const normalised = input
    .normalize('NFKD')
    .replace(COMBINING_MARK, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH)
    .replace(/-+$/, '');

  if (normalised.length === 0) {
    throw new Error(`Cannot slugify "${input}": result is empty.`);
  }

  if (RESERVED_SLUGS.has(normalised)) {
    throw new Error(`Cannot slugify "${input}": "${normalised}" is a reserved slug.`);
  }

  return normalised;
}
