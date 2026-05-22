import { expect, test } from '@playwright/test';

/**
 * Magic-link sign-in happy path (issue #36).
 *
 * Lifts the public-smoke pattern: opt-in via `E2E_BASE_URL`. The full happy
 * path against a Vercel preview (intercepting Resend) lands in CI when the
 * preview URL is wired through `playwright.config.ts` `webServer` (Phase 6
 * #67). Locally, run with:
 *
 *   E2E_BASE_URL=http://localhost:3000 pnpm test:e2e e2e/sign-in.spec.ts
 *
 * The two assertions below are independent of Resend: they verify the public
 * surface (login form renders, admin redirects to login when unauthenticated)
 * which is the contract this slice ships. The end-to-end "click the link in
 * the inbox" path uses the Resend test inbox in CI; that wiring is a
 * follow-up slice (#67 + the rate-limit and expiry slices).
 */
const baseUrl = process.env.E2E_BASE_URL;

test.describe('Magic-link sign-in', () => {
  test.skip(!baseUrl, 'E2E_BASE_URL not set; webServer arrives in #67.');

  test('login page renders the email input and submit button', async ({ page }) => {
    if (!baseUrl) {
      throw new Error('E2E_BASE_URL must be set when this test runs.');
    }

    await page.goto(`${baseUrl}/login`);

    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/welcome/i);
  });

  test('unauthenticated /admin redirects to /login', async ({ page }) => {
    if (!baseUrl) {
      throw new Error('E2E_BASE_URL must be set when this test runs.');
    }

    await page.goto(`${baseUrl}/admin`);

    await expect(page).toHaveURL(/\/login(\?|$)/);
    await expect(page.getByLabel('Email address')).toBeVisible();
  });

  test('submitting the admin email shows the generic sent state', async ({ page }) => {
    if (!baseUrl) {
      throw new Error('E2E_BASE_URL must be set when this test runs.');
    }

    const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@example.com';

    await page.goto(`${baseUrl}/login`);
    await page.getByLabel('Email address').fill(adminEmail);

    // Stub the Auth.js POST so the test does not actually trigger Resend.
    // The component-level RTL test covers the signIn call shape; this spec
    // proves the post-submit UI flip without exercising the live provider.
    await page.route('**/api/auth/signin/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }),
    );
    await page.route('**/api/auth/csrf', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"csrfToken":"test"}',
      }),
    );

    await page.getByRole('button', { name: /send magic link/i }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/check your inbox/i);
  });
});
