/**
 * Branch-name generator for the CMS commit pipeline, Phase 8 slices #48 + #50.
 *
 * Slice #48 keyed each publish by unix-ts (`cms/<unix-ts>-<slug>`) so every
 * click opened a fresh branch and a fresh PR. Slice #50 flips the default
 * to a deterministic-per-section shape (`cms/<slug>-<8-hex>`) so a republish
 * collides on `create-ref` and the pipeline can fast-forward the existing
 * branch instead of opening a duplicate PR. The hash is derived from the
 * sectionId only so two clicks separated by an hour still resolve to the
 * same branch.
 *
 * Both functions are kept exported. `buildBranchName` is the legacy
 * shape used by tests pinned to slice #48; the route handler now reaches
 * for `buildDeterministicBranchName`. Both shapes are accepted by their
 * respective patterns so a future operator inspecting the branch list
 * can recognise either form.
 *
 * Pure: callers pass the timestamp or sectionId in. `node:crypto`'s
 * SHA-256 is used because the hash only needs to be a stable, short
 * label for human eyes, not a security primitive; the 32-bit window
 * (`.slice(0, 8)`) keeps the branch name readable while still leaving
 * enough entropy to disambiguate every section id we ship.
 */

import { createHash } from 'node:crypto';

export const BRANCH_NAME_PATTERN = /^cms\/\d+-[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const DETERMINISTIC_BRANCH_NAME_PATTERN = /^cms\/[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{8}$/;

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

export type BuildDeterministicBranchNameInput = {
  slug: string;
  sectionId: string;
};

export function buildDeterministicBranchName({
  slug,
  sectionId,
}: BuildDeterministicBranchNameInput): string {
  const normalisedSlug = normaliseSlug(slug);
  if (normalisedSlug === '') {
    throw new Error(
      'buildDeterministicBranchName: slug must contain at least one alphanumeric character.',
    );
  }
  if (typeof sectionId !== 'string' || sectionId.trim() === '') {
    throw new Error('buildDeterministicBranchName: sectionId must be a non-empty string.');
  }
  const hash = createHash('sha256').update(sectionId).digest('hex').slice(0, 8);
  return `cms/${normalisedSlug}-${hash}`;
}

function normaliseSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
