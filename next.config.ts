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

export default nextConfig;
