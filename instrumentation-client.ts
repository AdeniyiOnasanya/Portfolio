/**
 * Sentry client-side init, Phase 10 slice #62.
 *
 * Next.js 15.5+ (we run 16) loads this file automatically on the
 * browser side; it is the modern replacement for the legacy
 * `sentry.client.config.ts` and is the file the Sentry wizard now
 * generates. The SDK no-ops when `NEXT_PUBLIC_SENTRY_DSN` is unset,
 * so local dev stays quiet.
 *
 * `onRouterTransitionStart` instruments App Router client navigations
 * so route transitions become spans in the Sentry trace tree. Session
 * Replay and Feedback are intentionally left off the bundle: Replay
 * adds ~80kB of JS that we do not yet have a Hobby-plan budget for,
 * and the Phase 10 acceptance is "thrown error surfaces in Sentry with
 * source maps", not replay.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
