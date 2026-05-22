import { Octokit } from 'octokit';
import type { OctokitClient } from './github/commit';

/**
 * Lazy Octokit factory, Phase 8 slice #48.
 *
 * Mirrors the lazy seam in `lib/db/index.ts`: the factory resolves
 * `GITHUB_TOKEN_CMS` only at the first call site so a Next.js build can
 * load route modules in CI (where the token is intentionally absent)
 * without crashing. The cached client is reused across requests within a
 * single server instance; the upstream `octokit` package is stateless
 * with respect to outgoing requests, so sharing one instance is safe.
 *
 * The thrown error never echoes the configured value back to the caller:
 * the message says only that the env var is unset, so a stack trace
 * surfaced through Sentry or a server log cannot leak the token.
 *
 * The exported type `OctokitClient` (defined in `./github/commit`) is the
 * structural subset the commit pipeline depends on. Returning the wider
 * `Octokit` instance from this factory still satisfies `OctokitClient`
 * because TypeScript checks on shape, not nominal identity. That keeps
 * the call sites strictly typed without exposing the full Octokit surface
 * area that the commit pipeline does not use.
 */

let cached: Octokit | null = null;

export function getOctokit(): OctokitClient {
  if (cached) return cached as unknown as OctokitClient;
  const token = process.env.GITHUB_TOKEN_CMS;
  if (typeof token !== 'string' || token.trim() === '') {
    throw new Error('GITHUB_TOKEN_CMS is not configured');
  }
  cached = new Octokit({ auth: token });
  return cached as unknown as OctokitClient;
}

/**
 * Test-only hook to drop the cached client. Production code never calls
 * this; vitest's `vi.resetModules()` between tests already isolates the
 * module graph, so the export is a fail-safe for parallel suites that
 * share env mutations.
 */
export function __resetOctokitCacheForTests(): void {
  cached = null;
}
