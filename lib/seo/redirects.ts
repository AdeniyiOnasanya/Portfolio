/**
 * Legacy path redirect map, Phase 9 slice #55.
 *
 * The site is a single page with deep links to in-page sections; users
 * who bookmarked older drafts may still hit standalone paths that no
 * longer resolve (`/about`, `/work`, `/skills`, etc.). Rather than let
 * those return 404, this slice 308s each one to the equivalent anchored
 * URL on the home page. 308 (Permanent Redirect, RFC 7538) preserves
 * the request method and is search-engine friendly: Google treats it as
 * a strong signal that the destination is canonical, consolidating any
 * residual page-rank from the legacy URL.
 *
 * The map is kept here rather than inline in `next.config.ts` so the
 * snapshot test can pin every entry, and so a future redirect added by
 * the operator does not require touching the build configuration. The
 * destination anchors mirror the live section ids in the public
 * components (`#about`, `#work`, `#skills`, `#ai`, `#contact`) rather
 * than the design-handoff ids; the live components are the surface a
 * deep link lands on.
 *
 * Browser anchor scrolling is preserved: Next.js forwards the hash on
 * the client side after the server-side 308 lands, so `/about` ->
 * `/#about` triggers the About-section scroll exactly as a direct
 * navigation from the home page would.
 */

export type LegacyRedirect = {
  /** Path on this origin, with leading slash, no query or hash. */
  source: string;
  /**
   * Target URL or path. `/#anchor` keeps the request same-origin so the
   * browser performs the in-page scroll without a second hop.
   */
  destination: string;
  /**
   * `true` emits HTTP 308 (Permanent Redirect). Every entry in this
   * file is permanent because the legacy paths are dead routes, not
   * temporary states.
   */
  permanent: true;
};

/**
 * The redirect map. Order is not significant for Next.js's matcher
 * (longer / more specific patterns are not used here), but the array
 * is sorted lexically by source so a future diff is easy to read.
 */
export const LEGACY_REDIRECTS: readonly LegacyRedirect[] = [
  { source: '/about', destination: '/#about', permanent: true },
  { source: '/ai', destination: '/#ai', permanent: true },
  { source: '/case-studies', destination: '/#work', permanent: true },
  { source: '/contact', destination: '/#contact', permanent: true },
  { source: '/experience', destination: '/#work', permanent: true },
  { source: '/portfolio', destination: '/#work', permanent: true },
  { source: '/projects', destination: '/#work', permanent: true },
  { source: '/skills', destination: '/#skills', permanent: true },
  { source: '/work', destination: '/#work', permanent: true },
];
