import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// The `@/` alias mirrors the App Router import convention (tsconfig.json
// `paths`). Vitest does not parse tsconfig paths by default; this resolve
// block keeps the test runner aligned with the production bundler so
// source modules and their tests can share a single import style.
const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: `${resolve(projectRoot)}/$1` },
      // `server-only` throws on import outside a Next.js server build. The
      // shim resolves it to an empty module so tests that load modules
      // marked server-only can still execute under the Node test runner.
      { find: 'server-only', replacement: `${resolve(projectRoot)}/test/server-only-shim.ts` },
    ],
  },
  test: {
    environment: 'happy-dom',
    globals: false,
    setupFiles: ['./vitest.setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.claude/**',
      'e2e/**',
    ],
  },
});
