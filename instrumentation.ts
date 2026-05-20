/**
 * Next.js instrumentation hook, Phase 10 slice #62.
 *
 * `register()` runs once per server process and conditionally imports
 * the runtime-specific Sentry init. `onRequestError` is the Next.js 15+
 * server hook that captures errors thrown from Server Components,
 * middleware, and proxies; without this export, Sentry only sees
 * client-side and explicitly captured server errors.
 *
 * Docs: /websites/sentry_io_platforms_javascript_guides_nextjs
 * (manual setup, "Register Server-Side SDK with Instrumentation").
 */
import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
