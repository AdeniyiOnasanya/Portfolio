/**
 * Sentry server-side init, Phase 10 slice #62.
 *
 * Loaded by `instrumentation.ts` when `NEXT_RUNTIME === 'nodejs'`. The
 * SDK no-ops when `NEXT_PUBLIC_SENTRY_DSN` is unset, which means local
 * dev and CI checks without the env var stay quiet; previews and
 * production on Vercel pick up the DSN automatically.
 *
 * `tracesSampleRate` is 1.0 in development and 0.1 in production so the
 * Hobby plan's traces quota stays well under the monthly cap; session
 * replay and user feedback integrations are deliberately omitted from
 * the server side (they are browser-only features).
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  sendDefaultPii: false,
});
