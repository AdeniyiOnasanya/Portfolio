/**
 * Cloudflare Turnstile sitekey resolution, Phase 10 slice #58.
 *
 * The public sitekey is rendered in the client bundle, so it can ship
 * over `NEXT_PUBLIC_*`. The repo intentionally falls back to the
 * Cloudflare always-passes test sitekey
 * (`1x00000000000000000000AA`) so local dev, Vitest runs, and
 * preview deployments without the production sitekey still mount a
 * working widget. The server-side verifier (slice #60) treats the
 * matching test secret as a no-op so the local pipeline stays clean.
 *
 * Docs:
 *   /websites/developers_cloudflare_turnstile
 *   ("Test your Turnstile implementation").
 */
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';

export function resolveTurnstileSiteKey(): string {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? TURNSTILE_TEST_SITE_KEY;
}
