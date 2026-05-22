import { describe, expect, it } from 'vitest';
import { LEGACY_REDIRECTS } from '../redirects';

/*
 * Legacy redirect map tests, Phase 9 slice #55.
 *
 * The snapshot pins every entry by source, destination, and permanence
 * flag so a casual edit cannot drop or quietly retarget a redirect.
 * Three structural invariants are also asserted: sources must start
 * with a slash and not carry a hash (the hash is appended by the
 * destination, not the matcher), destinations must point at the
 * canonical home anchor or another absolute path on this origin, and
 * every entry must be permanent (308) since these are dead routes, not
 * temporary states.
 */

describe('LEGACY_REDIRECTS', () => {
  it('pins the full redirect map so a future diff is reviewable', () => {
    expect(LEGACY_REDIRECTS).toEqual([
      { source: '/about', destination: '/#about', permanent: true },
      { source: '/ai', destination: '/#ai', permanent: true },
      { source: '/case-studies', destination: '/#work', permanent: true },
      { source: '/contact', destination: '/#contact', permanent: true },
      { source: '/experience', destination: '/#work', permanent: true },
      { source: '/portfolio', destination: '/#work', permanent: true },
      { source: '/projects', destination: '/#work', permanent: true },
      { source: '/skills', destination: '/#skills', permanent: true },
      { source: '/work', destination: '/#work', permanent: true },
    ]);
  });

  it('every source is an absolute path with no hash, query, or trailing slash', () => {
    for (const { source } of LEGACY_REDIRECTS) {
      expect(source.startsWith('/')).toBe(true);
      expect(source).not.toContain('#');
      expect(source).not.toContain('?');
      if (source !== '/') {
        expect(source.endsWith('/')).toBe(false);
      }
    }
  });

  it('every destination is same-origin and anchored on the home page', () => {
    for (const { destination } of LEGACY_REDIRECTS) {
      expect(destination.startsWith('/')).toBe(true);
      // Each legacy route maps to an in-page section, so the destination
      // must include a hash. A redirect to a bare path would defeat the
      // purpose of the slice (operators can configure those via the
      // route handler if a separate page lands later).
      expect(destination).toContain('#');
    }
  });

  it('every entry is permanent (308) because legacy routes are dead', () => {
    for (const { permanent } of LEGACY_REDIRECTS) {
      expect(permanent).toBe(true);
    }
  });

  it('no source collides with the canonical project route', () => {
    // `/projects/<slug>` is the live case-study route; the legacy
    // matcher must not shadow it. The catch-all here is that `source`
    // does not start with `/projects/`, only the bare `/projects` is
    // allowed (and that 308s to the home anchor before any deeper
    // routing happens).
    for (const { source } of LEGACY_REDIRECTS) {
      expect(source.startsWith('/projects/')).toBe(false);
    }
  });

  it('sources are unique', () => {
    const sources = LEGACY_REDIRECTS.map((r) => r.source);
    const unique = new Set(sources);
    expect(unique.size).toBe(sources.length);
  });
});
