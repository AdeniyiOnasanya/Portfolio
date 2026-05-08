/**
 * Branch-name generator for the CMS commit pipeline, Phase 8 slice #48.
 *
 * Every publish opens a fresh branch off the configured base so the
 * reviewer can read a clean diff. The shape is `cms/<unix-ts>-<slug>` with
 * an optional `-<hashSuffix>` for collision recovery (slice #50). Both
 * inputs are validated and the slug is normalised to kebab-case ASCII so a
 * section id that contains whitespace, casing drift, or non-ASCII never
 * lands on a remote ref name. A timestamp prefix keeps branches sortable
 * by wall-clock order in the GitHub branch picker.
 *
 * Pure: the function takes the unix timestamp as an argument rather than
 * reading the clock so unit tests can assert exact equality without
 * time-stubbing. The route handler in `app/api/cms/save/route.ts` reads
 * `Date.now()` once at the call site and passes it in.
 */

export const BRANCH_NAME_PATTERN = /^cms\/\d+-[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type BuildBranchNameInput = {
  unixTs: number;
  slug: string;
  hashSuffix?: string;
};

export function buildBranchName({ unixTs, slug, hashSuffix }: BuildBranchNameInput): string {
  if (!Number.isFinite(unixTs)) {
    throw new Error('buildBranchName: unixTs must be a finite number.');
  }
  const normalisedSlug = normaliseSlug(slug);
  if (normalisedSlug === '') {
    throw new Error('buildBranchName: slug must contain at least one alphanumeric character.');
  }
  const tail = hashSuffix ? `${normalisedSlug}-${normaliseSlug(hashSuffix)}` : normalisedSlug;
  return `cms/${Math.trunc(unixTs)}-${tail}`;
}

function normaliseSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
