import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';
import { LEGACY_REDIRECTS } from './lib/seo/redirects';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Accept-CH',
            value: 'Sec-CH-Prefers-Color-Scheme',
          },
          {
            key: 'Vary',
            value: 'Sec-CH-Prefers-Color-Scheme',
          },
        ],
      },
    ];
  },
  async redirects() {
    // Slice #55: 308 legacy paths to in-page anchors on the canonical
    // home route. The map itself lives in lib/seo/redirects.ts so a
    // snapshot test can pin every entry without coupling to the build
    // configuration.
    return [...LEGACY_REDIRECTS];
  },
};

// Phase 10 slice #62: wrap the Next.js config with Sentry's build
// plugin so source maps upload on every Vercel build (and any future
// CI build) the moment SENTRY_AUTH_TOKEN is present. When the token is
// missing the wrapper degrades to a no-op build wrapper, so local
// builds and previews without the secret still complete cleanly. Org
// and project slugs are read from env so the values do not land in
// the public history; SENTRY_ORG and SENTRY_PROJECT must exist in the
// Vercel project env before the upload step does anything useful.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
