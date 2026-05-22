/**
 * Sentry edge-runtime init, Phase 10 slice #62.
 *
 * Loaded by `instrumentation.ts` when `NEXT_RUNTIME === 'edge'`. The
 * project's middleware runs in the edge runtime, so this init catches
 * any error thrown from `middleware.ts` (auth allowlist check, CMS
 * route guarding) and forwards it to Sentry. As with the server config
 * the SDK no-ops when the DSN is unset.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  sendDefaultPii: false,
});
