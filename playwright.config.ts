import { defineConfig } from '@playwright/test';

/**
 * Phase 1 bootstrap config. Real specs (sign-in, publish-flow, public-smoke)
 * arrive in Phases 6, 8, and 12. This file lights up the harness so those
 * later slices can drop spec files into e2e/ without re-bootstrapping.
 *
 * Note: webServer is intentionally not configured yet. Phase 12 will add
 * webServer.command pointing at the per-PR Vercel preview URL via
 * E2E_BASE_URL. For now, no specs hit the network.
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
