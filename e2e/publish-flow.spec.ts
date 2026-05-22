import { expect, test } from '@playwright/test';

/**
 * Publish-flow spec, Phase 12 slice #68.
 *
 * Drives the success criterion end-to-end: sign in, edit a hero
 * draft, click "Publish", and assert the response carries a real
 * GitHub PR URL plus the deterministic branch name (slice #50).
 *
 * Real-credential prerequisites in CI:
 *   - E2E_BASE_URL       The Vercel preview URL.
 *   - E2E_ADMIN_EMAIL    A magic-link recipient on the allowlist.
 *   - E2E_AUTH_COOKIE    Pre-warmed session cookie for the admin
 *                        (avoids hitting Resend on every CI run).
 *                        See USER_TODO.md: "Provision e2e CI secrets".
 *   - GITHUB_TOKEN_CMS   Already required by /api/cms/save; the
 *                        publish step uses the deployment env value.
 *
 * The spec is skipped when E2E_BASE_URL or E2E_AUTH_COOKIE is unset.
 * Locally, the developer can run:
 *
 *   E2E_BASE_URL=https://<preview>.vercel.app \
 *   E2E_AUTH_COOKIE=<auth-cookie-value> \
 *     pnpm test:e2e e2e/publish-flow.spec.ts
 */

const baseUrl = process.env.E2E_BASE_URL;
const authCookie = process.env.E2E_AUTH_COOKIE;

test.describe('Admin publish flow', () => {
  test.skip(
    !baseUrl || !authCookie,
    'E2E_BASE_URL or E2E_AUTH_COOKIE not set; publish-flow runs only in CI with a pre-warmed session.',
  );

  test('editing the hero and publishing opens a real GitHub PR', async ({ page, context }) => {
    if (!baseUrl || !authCookie) {
      throw new Error('E2E_BASE_URL and E2E_AUTH_COOKIE must both be set for this test.');
    }

    // Inject the session cookie before any navigation so the admin
    // shell renders on the first request. The cookie's name matches
    // Auth.js v5's `__Secure-authjs.session-token` by default; tests
    // that target a non-https local preview should use the
    // unprefixed `authjs.session-token` instead.
    const cookieName = baseUrl.startsWith('https://')
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token';
    await context.addCookies([
      {
        name: cookieName,
        value: authCookie,
        url: baseUrl,
        httpOnly: true,
        secure: baseUrl.startsWith('https://'),
        sameSite: 'Lax',
      },
    ]);

    await page.goto(`${baseUrl}/admin/hero`);

    const headlineInput = page.getByLabel(/Hero headline/i);
    await expect(headlineInput).toBeVisible();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    await headlineInput.fill(`Smoke test ${stamp}`);

    // Wait for the publish endpoint and assert the response shape.
    const publishResponse = page.waitForResponse(
      (res) => res.url().endsWith('/api/cms/save') && res.status() === 200,
    );
    await page.getByRole('button', { name: /publish/i }).click();
    const response = await publishResponse;
    const body = (await response.json()) as { ok: boolean; prUrl?: string; branch?: string };
    expect(body.ok).toBe(true);
    expect(body.prUrl ?? '').toMatch(/^https:\/\/github\.com\/.+\/pull\/\d+$/);
    expect(body.branch ?? '').toMatch(/^cms\/hero\/[a-f0-9]+$/);

    // The UI also surfaces the PR link; assert the visible state
    // matches the API response so the operator sees what landed.
    await expect(page.getByRole('link', { name: /view pull request/i })).toHaveAttribute(
      'href',
      body.prUrl ?? '',
    );
  });
});
