# USER_TODO.md

Items only the human can complete. Every entry below sits outside what a coding agent can reach: it needs a real account, a real device, a domain registrar, a screen reader, or a billing cycle. Work down the list in roughly the order shown.

Each section ends with a "Done when" line so the criterion is unambiguous; tick the box, the section is complete.

---

## 1. Re-enable GitHub Actions (unblocks every CI gate)

Reason: workflows are currently disabled by file extension (`.yml.disabled`) because the repo hit the free-tier 2000-min/month cap. CI, CodeQL, branch-flow-guard, project-automation, auto-close-on-develop, the new Lighthouse gate (Phase 11), and the new e2e suite (Phase 12) all sit dormant until this clears.

Steps:

1. Go to https://github.com/settings/billing/spending_limit and either raise the spending limit or wait for the monthly reset.
2. Rename every workflow file back from `.yml.disabled` to `.yml`. The full list:
   - `.github/workflows/ci.yml.disabled`
   - `.github/workflows/codeql.yml.disabled`
   - `.github/workflows/branch-flow-guard.yml.disabled`
   - `.github/workflows/project-automation.yml.disabled`
   - `.github/workflows/auto-close-on-develop.yml.disabled`
   - `.github/workflows/lighthouse.yml.disabled` (Phase 11)
   - `.github/workflows/e2e.yml.disabled` (Phase 12)
3. Commit the rename as a single PR titled `chore(ci): re-enable workflows after billing clear`.

Done when: a fresh PR to `develop` shows the seven workflows running.

---

## 2. Rotate the leaked Resend API key

Reason: the `RESEND_API_KEY` (the `re_e2k...` value pasted earlier in chat) is compromised. The Phase 10 contact form (and the existing auth magic-link flow) both depend on a working key.

Steps:

1. Sign in to Resend (https://resend.com).
2. Revoke the leaked key.
3. Generate a new key scoped to `emails:send`.
4. Update `RESEND_API_KEY` in:
   - Vercel project env (Production + Preview tabs).
   - Local `.env.local`.
5. Redeploy `develop` so the new value is picked up.

Done when: a fresh sign-in attempt receives a magic-link email at the admin address, and a contact-form submission lands at `ADMIN_EMAIL`.

---

## 3. Provision Phase 10 env vars in Vercel

These three Phase 10 PRs land code that no-ops without the matching env. Add to **Production** and **Preview** both.

| Var | Slice | Source |
| --- | --- | --- |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | #58 | Cloudflare Turnstile dashboard. |
| `TURNSTILE_SECRET` | #60 | Same Turnstile widget; "Secret key" tab. |
| `NEXT_PUBLIC_SENTRY_DSN` | #62 | Sentry project > Settings > Client Keys (DSN). |
| `SENTRY_ORG` | #62 | Sentry org slug. |
| `SENTRY_PROJECT` | #62 | Sentry project slug. |
| `SENTRY_AUTH_TOKEN` | #62 | Sentry > User Settings > Auth Tokens. Scope: `project:releases`, `org:read`. **Secret.** |

Done when:
- a deliberate `throw new Error('test')` from a Route Handler shows in Sentry with a TypeScript source map (not bundled output);
- the contact form refuses an empty Turnstile token and accepts a real one.

---

## 4. Promote `develop` -> `staging` -> `main`

Phase 9, 10, 11, 12 all merged to `develop` without promotion. Time to flush.

Steps:

1. Open a PR from `develop` to `staging` titled `release: develop -> staging (Phase 9, 10, 11, 12)`.
2. Verify the staging preview manually (see Section 5 below).
3. Merge.
4. Open a PR from `staging` to `main` titled `release: staging -> main (Phase 9, 10, 11, 12)`.
5. Merge after a deep `security-reviewer` pass (escalated to `model: 'opus'` per CLAUDE.md).

Done when: production deploy carries the Phase 12-era HEAD.

---

## 5. Manual smoke against the staging preview

Do this before the staging -> main promotion in Section 4.

- [ ] Open the staging preview URL.
- [ ] Hit `/` and confirm:
  - Cinematic intro plays once, skips on second visit (session storage).
  - Custom cursor + magnetic buttons honour `prefers-reduced-motion` (toggle in DevTools rendering tab).
  - The footer shows the "Show contact form" pill.
- [ ] Click "Show contact form", complete the Turnstile widget, submit.
  - Confirm an email lands at `ADMIN_EMAIL`.
  - Confirm reply-to is the visitor's address.
  - Refresh, submit again without re-doing the challenge; expect a 403 `turnstile_failed` toast (rapid-resubmit block).
- [ ] Visit `/projects/foster-care-platform` and `/projects/multi-cloud-platform`.
  - View source; confirm `og:image` + `twitter:image` point at `/api/og/<slug>`.
  - Confirm the JSON-LD `<script type="application/ld+json">` block includes `image` and `genre`.
- [ ] Hit `/api/og` and `/api/og/foster-care-platform` directly; confirm the PNG renders (1200x630) with Fraunces italic name + brand stripe.
- [ ] Open `/login`, sign in with the admin email, edit the hero headline, click Publish.
  - Confirm a real GitHub PR is created on the deployment's GitHub repo, branch name `cms/hero/<sha>`.
- [ ] Hit `/sitemap.xml` and `/robots.txt`; confirm both load.
- [ ] DevTools network tab: confirm `/_vercel/insights/*` beacon fires on first navigation (Vercel Analytics).
- [ ] Throw a deliberate error: visit `/api/og/<bogus-slug>` (returns 404 by design; the same path used by the case study) or trigger any 500 path; confirm the error appears in Sentry within ~30 seconds.

Done when: every checkbox above ticks.

---

## 6. Run the deliberately-unoptimised-PNG demo (Phase 11 slice #65)

Reason: slice #65 is a CI exercise rather than a code change. It proves the Lighthouse gate catches regressions before merge.

Steps:

1. From a fresh `feature/lh-demo-fail` branch, replace any homepage hero image (e.g. `public/og.png`) with a 2 MB uncompressed PNG.
2. Push and open a PR to `develop`.
3. Wait for the Vercel preview + Lighthouse run.
4. Confirm the Lighthouse job fails on `categories:performance < 0.95`.
5. Revert the image (`git revert HEAD`), push.
6. Confirm the Lighthouse job goes green on the same PR.
7. Close the PR without merging.

Done when: the PR has one red Lighthouse run and one green Lighthouse run on the same branch, demonstrating that the gate actually blocks regressions.

---

## 7. Set the production domain (Phase 13 slice #73)

Steps:

1. In Vercel project Settings -> Domains, add `davidonasanya.com` and `www.davidonasanya.com`. Map the apex to the production environment.
2. At the domain registrar, set the records Vercel prompts for (typically an ALIAS or A record to Vercel's anycast IP, plus the CNAME for `www`).
3. Wait for the cert (Vercel issues automatically; usually under 5 minutes).
4. In Vercel project env, set `AUTH_URL=https://davidonasanya.com` for **Production** only.
5. Set `AUTH_URL=https://staging.davidonasanya.com` for **Preview** if you point a staging subdomain.
6. Trigger a fresh production deploy so Auth.js v5 picks the new value.

Done when:
- `dig davidonasanya.com +short` returns Vercel's IP.
- `curl -I https://davidonasanya.com` returns 200 from Vercel's edge.
- Magic-link sign-in works against the production domain (the link should reference `davidonasanya.com`, not the preview URL).

---

## 8. Production Lighthouse 95+ (Phase 13 slice #74)

After Section 7 is done:

1. Open https://pagespeed.web.dev/.
2. Enter `https://davidonasanya.com/`.
3. Confirm all four categories (Performance, Accessibility, Best Practices, SEO) score 95 or higher on the **mobile** report.
4. Repeat for `https://davidonasanya.com/projects/foster-care-platform` and `https://davidonasanya.com/projects/multi-cloud-platform`.
5. If any score lands under 95, file a tracker issue with the LH report link, then iterate.

Done when: all three pages score 95+ on Performance, Accessibility, Best Practices, SEO on a fresh PageSpeed run.

---

## 9. NVDA + VoiceOver audit (Phase 13 slice #71)

Manual screen-reader audit. The agent cannot drive a real screen reader.

Steps:

1. **NVDA on Windows** (free, https://www.nvaccess.org/download/). Or **VoiceOver on macOS** (Cmd+F5 to enable).
2. With the screen reader on, navigate the home page using landmarks only (NVDA: D for landmark, H for heading; VoiceOver: VO+U for rotor -> Landmarks).
3. Confirm the page announces:
   - `banner` (Nav)
   - `main` (the content area)
   - `contentinfo` (Footer)
4. Tab through Cmd+K command palette; confirm focus moves into the palette and arrows navigate the option list.
5. Visit `/projects/<slug>` and confirm the case-study scaffold announces `h1` correctly (title + subtitle).
6. Open the contact form via "Show contact form" pill; confirm the form fields announce labels (Name, Email, Message) and the Turnstile widget either announces or is announced as an `iframe` with sensible content.
7. Note any failures in a fresh `a11y-audit-2026-05.md` file under `docs/` (create if needed).
8. File one issue per failure; fix inline if trivial, defer to a follow-up slice otherwise.

Done when: the home + a case study + a deep dive all navigate cleanly via landmarks on both NVDA and VoiceOver.

---

## 10. Real-device matrix (Phase 13 slice #72)

Manual cross-browser + cross-device test. Borrow a phone, laptop, tablet.

Pass criteria per device: load `/`, scroll the page, click a project row, scroll the case study, open the contact form, complete the Turnstile widget, type into all three inputs. No layout breakage, no console errors, no overflow.

Device matrix:

- [ ] Safari macOS (latest)
- [ ] Safari iOS (iPhone, latest iOS)
- [ ] Chrome Android (Pixel or similar)
- [ ] Firefox desktop (latest)
- [ ] Edge desktop (latest)

Done when: every row ticks.

---

## 11. Phone-to-live edit round-trip under 5 minutes (Phase 13 slice #75)

The success criterion for the whole project. Stopwatch literally.

Steps:

1. Open the phone's browser, navigate to `https://davidonasanya.com/login`.
2. Enter the admin email, tap "Send magic link".
3. Wait for the email, tap the link.
4. Navigate to `/admin/hero`, change the headline to something traceable like `Live edit 2026-05-20T18:30Z`.
5. Tap Publish.
6. Open the PR URL from the toast; tap Merge.
7. Wait for Vercel to redeploy `main`.
8. Refresh `https://davidonasanya.com/`; confirm the new headline.
9. Stop the clock.

Done when: total elapsed time under 5 minutes.

---

## 12. Final branch protection (if going Pro)

Reason: the rule "no auto-merge, no force-push, no direct push to develop/staging/main" lives in the developer's hand because server-side branch protection on **private** repos needs GitHub Pro. Issues #3 and #76 are closed because the decision is "no upgrade". If that decision flips, re-run the seed script:

```
REQUIRE_CHEAP_CHECKS=1 REQUIRE_HEAVY_CHECKS=1 \
bash scripts/github/seed-branch-protection.sh
```

Done when: `gh api repos/AdeniyiOnasanya/Portfolio/branches/main/protection` returns the expected required_status_checks contexts and `enforce_admins: true`.

If staying on the free tier: tick this section as "n/a" and rely on the soft `branch-flow-guard` workflow once Section 1 is done.

---

## 13. Document the launch

Once Sections 1 through 11 are done:

1. Open a final PR titled `chore(launch): close Phase 13` that:
   - Renames the workflows in Section 1.
   - Updates `.github/phase-log.md` Phase 13 row from "deferred" to "merged + USER_TODO ticked".
2. Add a paragraph at the top of `guide.md` recording the launch date and the production URL.

Done when: `main` reflects a launched site, `phase-log.md` shows all 13 phases closed, and the deferred Phase 13 issues are closed with a comment linking to this file.

---

## Quick reference: env vars by environment

| Var | Local `.env.local` | Vercel Preview | Vercel Production |
| --- | --- | --- | --- |
| `RESEND_API_KEY` | yes | yes | yes |
| `RESEND_FROM` | optional | optional | optional |
| `ADMIN_EMAIL` | yes | yes | yes |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | optional (test key falls back) | yes | yes |
| `TURNSTILE_SECRET` | optional (test secret falls back) | yes | yes |
| `NEXT_PUBLIC_SENTRY_DSN` | optional | yes | yes |
| `SENTRY_ORG` | n/a | yes | yes |
| `SENTRY_PROJECT` | n/a | yes | yes |
| `SENTRY_AUTH_TOKEN` | n/a | yes | yes |
| `AUTH_URL` | yes (`http://localhost:3000`) | yes (preview URL) | yes (`https://davidonasanya.com`) |
| `AUTH_SECRET` | yes | yes | yes |
| `DATABASE_URL` | yes (Neon dev branch) | yes | yes |
| `GITHUB_TOKEN_CMS` | yes (PAT with repo scope) | yes | yes |
| `BLOB_READ_WRITE_TOKEN` | yes | yes | yes |
| `E2E_ADMIN_EMAIL` | n/a | n/a | n/a (GitHub Actions secret only) |
| `E2E_AUTH_COOKIE` | n/a | n/a | n/a (GitHub Actions secret only) |
