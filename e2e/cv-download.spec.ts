import { expect, test } from '@playwright/test';

/**
 * CV link smoke (issue #29).
 *
 * Asserts that the home page exposes a CV download link pointing at the
 * static asset and that a HEAD request to that asset returns 200 with a
 * pdf content-type.
 *
 * webServer is not wired in playwright.config.ts yet (Phase 6 #67).
 * Until that lands, this spec is opt-in via E2E_BASE_URL, e.g.
 *
 *   E2E_BASE_URL=http://localhost:3000 pnpm test:e2e e2e/cv-download.spec.ts
 *
 * with `pnpm dev` running in another terminal. CI skips it cleanly.
 */
const baseUrl = process.env.E2E_BASE_URL;

test.describe('CV download', () => {
  test.skip(!baseUrl, 'E2E_BASE_URL not set; webServer arrives in #67.');

  test('home exposes a CV link that resolves to a PDF', async ({ page, request }) => {
    if (!baseUrl) {
      // Type narrowing for the request below; the skip above covers runtime.
      throw new Error('E2E_BASE_URL must be set when this test runs.');
    }

    await page.goto(baseUrl);

    const link = page.getByRole('link', { name: /download cv/i });
    await expect(link).toBeVisible();

    const href = await link.getAttribute('href');
    expect(href).toBe('/cv/David-Onasanya-CV.pdf');

    const target = new URL(href ?? '', baseUrl).toString();
    const head = await request.head(target);
    expect(head.status()).toBe(200);
    expect(head.headers()['content-type'] ?? '').toMatch(/application\/pdf/);
  });
});
