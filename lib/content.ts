import 'server-only';
import { readSiteFromDisk } from './content/site-json';
import type { Site } from './schema';

// Module-scoped Promise cache. content/site.json is static at build time, so a
// single read per process lifetime is strictly cheaper than per-request reads
// while still satisfying the slice contract: one fs read per request, shared
// across every component that calls loadSite() during the same render. A
// rejection clears the cache so a transient EAGAIN, a partial deploy, or a
// Zod parse error against a self-healing content blob does not poison every
// subsequent caller for the lifetime of the server instance. The reset hook
// below is for tests only; production code never invalidates this.
let sitePromise: Promise<Site> | null = null;

export function loadSite(): Promise<Site> {
  if (!sitePromise) {
    const inflight = readSiteFromDisk();
    sitePromise = inflight;
    inflight.catch(() => {
      if (sitePromise === inflight) {
        sitePromise = null;
      }
    });
  }
  return sitePromise;
}

export function __resetSiteCache(): void {
  sitePromise = null;
}
