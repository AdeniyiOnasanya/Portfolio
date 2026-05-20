import { expect, test } from '@playwright/test';

/**
 * Public-smoke spec, Phase 12 slice #69.
 *
 * Visits the home route and two project pages on the preview URL,
 * asserts the H1 lands on each, asserts the OpenGraph meta is wired,
 * and asserts the browser console emits no errors during the visit.
 *
 * Opt-in via `E2E_BASE_URL` (matches the rest of the e2e suite). The
 * spec is skipped locally when `E2E_BASE_URL` is unset, which keeps
 * `pnpm test:e2e` clean against a developer machine that does not
 * have a preview running.
 */

const baseUrl = process.env.E2E_BASE_URL;

const PROJECT_SLUGS = ['foster-care-platform', 'multi-cloud-platform'] as const;

test.describe('Public smoke', () => {
  test.skip(!baseUrl, 'E2E_BASE_URL not set; lighthouse-style preview runs only.');

  test('/ renders the H1 and OG image meta with no console errors', async ({ page }) => {
    if (!baseUrl) throw new Error('E2E_BASE_URL must be set when this test runs.');
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(`${baseUrl}/`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const ogImage = await page.locator('meta[property="og:image"]').first().getAttribute('content');
    expect(ogImage ?? '').toContain('/api/og');
    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  for (const slug of PROJECT_SLUGS) {
    test(`/projects/${slug} renders the H1 and OG meta with no console errors`, async ({ page }) => {
      if (!baseUrl) throw new Error('E2E_BASE_URL must be set when this test runs.');
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(err.message));

      await page.goto(`${baseUrl}/projects/${slug}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const ogImage = await page.locator('meta[property="og:image"]').first().getAttribute('content');
      expect(ogImage ?? '').toContain(`/api/og/${slug}`);
      expect(errors, errors.join('\n')).toHaveLength(0);
    });
  }
});
