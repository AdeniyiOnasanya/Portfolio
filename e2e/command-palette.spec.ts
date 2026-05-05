import { expect, test } from '@playwright/test';

/**
 * Command palette keyboard flow (issue #34).
 *
 * Asserts that Cmd/Ctrl+K opens the palette, that selecting a navigation item
 * scrolls to the matching anchor, and that Escape closes the palette and
 * returns focus to the element that held it before opening.
 *
 * webServer is not wired in playwright.config.ts yet (Phase 6 #67).
 * Until that lands, this spec is opt-in via E2E_BASE_URL, e.g.
 *
 *   E2E_BASE_URL=http://localhost:3000 pnpm test:e2e e2e/command-palette.spec.ts
 *
 * with `pnpm dev` running in another terminal. CI skips it cleanly.
 */
const baseUrl = process.env.E2E_BASE_URL;

test.describe('Command palette keyboard flow', () => {
  test.skip(!baseUrl, 'E2E_BASE_URL not set; webServer arrives in #67.');

  test('opens with Cmd+K, navigates to About, then closes on Escape', async ({ page }, testInfo) => {
    if (!baseUrl) {
      throw new Error('E2E_BASE_URL must be set when this test runs.');
    }

    await page.goto(baseUrl);

    // Move focus to a known element (the CV download link in the hero) so we
    // can assert focus restoration on Escape.
    const cvLink = page.getByRole('link', { name: /download cv/i });
    await cvLink.focus();

    const isMac = testInfo.project.use.userAgent?.includes('Mac') || process.platform === 'darwin';
    const meta = isMac ? 'Meta' : 'Control';
    await page.keyboard.press(`${meta}+KeyK`);

    const input = page.getByPlaceholder(/type a command/i);
    await expect(input).toBeVisible();

    await input.fill('About');
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/#about$/);

    // Reopen and close to confirm Escape restores focus.
    await cvLink.focus();
    await page.keyboard.press(`${meta}+KeyK`);
    await expect(page.getByPlaceholder(/type a command/i)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByPlaceholder(/type a command/i)).toHaveCount(0);

    const focused = await page.evaluate(() => document.activeElement?.textContent ?? '');
    expect(focused.toLowerCase()).toContain('download cv');
  });

  test('opens with the bare slash key', async ({ page }) => {
    if (!baseUrl) {
      throw new Error('E2E_BASE_URL must be set when this test runs.');
    }

    await page.goto(baseUrl);
    await page.keyboard.press('/');
    await expect(page.getByPlaceholder(/type a command/i)).toBeVisible();
  });
});
