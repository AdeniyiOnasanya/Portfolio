# Tracer-bullet slices for all 14 phases

This is the source list that becomes GitHub Issues. Each slice is one closeable PR with a user-visible outcome, mapped to the phase it sits in. Review and trim before issues are opened.

Conventions:

- Title prefix `task: `, `bug: `, or `content: `.
- Every slice has Outcome (what is observable when the PR merges), Adds (the new code or config), Tests (the test layer per `implementation-plan.md`), Priority (P0 to P3), and Depends on where relevant.
- No em-dash, no emoji anywhere (per `project-scope.md`).
- Phase number lives in the milestone, not the branch. Branches are `feature/<issue-number>_<slug>`.

Counts: 77 slices across 14 phases.

---

## Phase 0: Repo bootstrap and protection (6 slices)

1. `task: cloning the repo and running pnpm install yields a green typecheck and build (Phase 0)`
   - Priority: P1
   - Outcome: fresh clone, `pnpm install && pnpm typecheck && pnpm build` passes; placeholder page renders at `/`.
   - Adds: `package.json`, `tsconfig.json` (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), `next.config.ts`, `biome.json`, `app/layout.tsx`, `app/page.tsx` (placeholder), `app/globals.css` imports `tokens.css`.
   - Tests: none; manual run.

2. `task: pushing a PR triggers CI that typechecks, lints, and builds (Phase 0)`
   - Priority: P1, depends on #1.
   - Outcome: open a PR, see green checks for `typecheck`, `lint`, `build`.
   - Adds: `.github/workflows/ci.yml` skeleton with the three jobs and a pnpm cache.
   - Tests: CI run on the PR itself.

3. `task: branch protection on main, staging, and develop rejects direct pushes and requires CI green (Phase 0)`
   - Priority: P1, depends on #2.
   - Outcome: `git push origin main`, `git push origin staging`, `git push origin develop` all rejected; PRs require CI green; `enforce_admins=true` so I cannot bypass.
   - Adds: `scripts/github/seed-branch-protection.sh` applies the relaxed seed to all three branches via `gh api`. Required-status-checks list ratchets up as Phases 1, 11, 12 land.
   - Tests: manual push attempt against each branch; verify rejection messages.

4. `task: Vercel preview deploys for every PR and the staging branch alias serves staging.davidonasanya.com (Phase 0)`
   - Priority: P1, depends on #1.
   - Outcome: feature PRs get auto preview URLs; merges to `staging` deploy to `staging.davidonasanya.com`; production branch `main` is configured (DNS for `davidonasanya.com` may be deferred to Phase 13).
   - Adds: link Vercel project; production branch = `main`; staging branch alias = `staging.davidonasanya.com`; env vars per environment.
   - Tests: manual visit to a preview URL; manual visit to `staging.davidonasanya.com` after a develop -> staging merge (or to the auto staging preview URL until DNS lands).

5. `task: pull request and issue templates render on github.com (Phase 0)`
   - Priority: P2.
   - Outcome: opening a new issue or PR shows the project's templates; the PR template surfaces the target-branch checklist.
   - Adds: `.github/PULL_REQUEST_TEMPLATE.md`, `.github/ISSUE_TEMPLATE/*.yml`, `.github/CONTRIBUTING.md`, `.env.example`, `CLAUDE.md`.
   - Tests: manual.

6. `task: branch flow guard rejects PRs that skip the develop -> staging -> main chain (Phase 0)`
   - Priority: P1.
   - Outcome: a PR `feature/X -> staging` or `develop -> main` fails the `branch-flow-guard` status check with a clear message; valid pairs (`feature/* -> develop`, `develop -> staging`, `staging -> main`) pass.
   - Adds: `.github/workflows/branch-flow-guard.yml`. Required as a status check on all three protected branches.
   - Tests: deliberate `feature/test -> staging` PR fails; same head opened against `develop` passes.

---

## Phase 1: Quality gates and forbidden-chars guard (6 slices)

1. `task: pnpm test runs Vitest and reports zero suites green (Phase 1)`
   - Priority: P1.
   - Outcome: empty test run is green; foundation for TDD.
   - Adds: `vitest.config.ts`, one passing sample test, `pnpm test` script.
   - Tests: the run itself.

2. `task: forbidden-chars meta-test fails on a file containing an em-dash (Phase 1)`
   - Priority: P1.
   - Outcome: deliberate em-dash in a markdown file fails the `forbidden-chars` CI job; remove, green.
   - Adds: `lib/text/forbidden.ts` (U+2014 + `\p{Extended_Pictographic}`), `scripts/check-forbidden-chars.ts`, CI job that scans `**/*.{ts,tsx,md,mdx,json,css}`.
   - Tests: Vitest on the scanner; CI exercise.

3. `task: lint and typecheck reject a deliberate any (Phase 1)`
   - Priority: P1.
   - Outcome: `pnpm lint` and `pnpm typecheck` break the build on a deliberate violation.
   - Adds: Biome config tightened, `lint` CI job.
   - Tests: deliberate violation in a throwaway PR.

4. `task: dependabot weekly PRs land for npm and actions (Phase 1)`
   - Priority: P2.
   - Adds: `.github/dependabot.yml`.
   - Tests: manual (wait for the first weekly run).

5. `task: codeql runs on PR and weekly on main (Phase 1)`
   - Priority: P2.
   - Adds: `.github/workflows/codeql.yml`.
   - Tests: CI run on the seeding PR.

6. `task: playwright config exists and an empty e2e suite passes (Phase 1)`
   - Priority: P2.
   - Outcome: `pnpm test:e2e` runs, no specs yet, green.
   - Adds: `playwright.config.ts`, browser cache config.
   - Tests: the empty run.

---

## Phase 2: Tokens, fonts, theme, base layout (5 slices)

1. `task: opening / in dark mode shows token-driven colours and self-hosted fonts (Phase 2)`
   - Priority: P1.
   - Outcome: `/` paints with dark tokens, Fraunces, Geist, JetBrains Mono.
   - Adds: `app/globals.css` imports `tokens.css`; `next/font` self-hosts the three families with Latin subset; layout consumes them.
   - Tests: visual; unit on font setup.

2. `task: clicking the theme toggle cycles system->dark->light without FOUC and persists across reload (Phase 2)`
   - Priority: P1.
   - Outcome: visible toggle cycles; cookie persists; SSR reads cookie + `Sec-CH-Prefers-Color-Scheme`.
   - Adds: `components/shared/{ThemeProvider,ThemeToggle}.tsx`, `lib/theme/resolve.ts`.
   - Tests: RTL on toggle; unit on resolver.

3. `task: enabling prefers-reduced-motion in DevTools zeros all token durations (Phase 2)`
   - Priority: P1.
   - Outcome: durations cascade to 0 via existing tokens.
   - Adds: documentation in `globals.css`; verification step in PR template.
   - Tests: visual; RTL on `Reveal` (no observer when reduced-motion).

4. `task: scroll reveal animates content in on first viewport entry (Phase 2)`
   - Priority: P2.
   - Adds: `components/shared/Reveal.tsx`.
   - Tests: RTL (no observer when reduced-motion); manual scroll smoke.

5. `task: subtle film grain overlay renders behind content (Phase 2)`
   - Priority: P3.
   - Adds: `components/shared/Grain.tsx`.
   - Tests: visual.

---

## Phase 3: Content schema, loaders, seed content (6 slices)

1. `task: parsing content/site.json with the canonical schema returns typed Site (Phase 3)`
   - Priority: P1.
   - Outcome: loader parses, types flow end-to-end.
   - Adds: `lib/schema.ts`, `lib/content.ts`, `content/site.json` ported from `design_handoff_portfolio/design/data.js` (preserve `<em>` semantics in `headline`).
   - Tests: Zod parsers per section; round-trip parse for valid + invalid; pinned issue-path snapshots.

2. `task: the build fails if content/site.json is malformed (Phase 3)`
   - Priority: P1, depends on #1.
   - Outcome: corrupt the file, `pnpm build` exits non-zero with a clear path-aware error.
   - Adds: `scripts/validate-content.ts`, `prebuild` npm script.
   - Tests: unit on the script (exit code, message).

3. `task: each project mdx file (stratus, hearth, vessel, quorum, plumb, trace, atrium) parses against the schema (Phase 3)`
   - Priority: P1, depends on #1.
   - Outcome: seven mdx files exist with frontmatter; all parse.
   - Adds: `content/projects/*.mdx` for the seven slugs.
   - Tests: parameterised parser test over all seven.

4. `task: the slug normaliser produces kebab-case, strips diacritics, caps at 60, rejects reserved words (Phase 3)`
   - Priority: P1.
   - Outcome: `slugify('Cafe & Sons!')` -> `cafe-and-sons`; `slugify('admin')` throws.
   - Adds: `lib/slug.ts`.
   - Tests: Vitest cases including `admin/api/login/cv/_next`.

5. `task: any string field containing U+2014 or an emoji is rejected by the schema (Phase 3)`
   - Priority: P1, depends on #1.
   - Outcome: defence in depth at the schema layer.
   - Adds: `lib/text/safeText.ts` Zod refinement composed into every long-string field.
   - Tests: positive + negative for em-dash and a sample emoji.

6. `task: the typed loader memoises reads across the same request (Phase 3)`
   - Priority: P2, depends on #1.
   - Adds: memoisation in `lib/content.ts`.
   - Tests: unit asserting one fs read per request.

---

## Phase 4: Public site shell (7 slices)

1. `task: visiting / shows hero, about, skills, experience, AI practice, projects, footer, all from content (Phase 4)`
   - Priority: P1.
   - Outcome: server-rendered `/` with all sections, single h1, focus visible.
   - Adds: `app/(public)/{layout,page}.tsx`, sections under `components/public/`.
   - Tests: RTL per section (visibility flags, semantic landmarks, single h1).

2. `task: visiting /projects/<slug> shows the case study for any seed project (Phase 4)`
   - Priority: P1, depends on #1.
   - Outcome: each of the seven projects renders.
   - Adds: `app/(public)/projects/[slug]/{page,not-found}.tsx`, `ProjectCaseStudy`, `DeepDive`.
   - Tests: RTL with parameterised slugs; not-found state.

3. `task: sitemap.xml lists every project page and robots.txt allows indexing (Phase 4)`
   - Priority: P1.
   - Outcome: `/sitemap.xml` valid, `/robots.txt` correct.
   - Adds: `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts`.
   - Tests: snapshot.

4. `task: the page source contains all section text without JS (Phase 4)`
   - Priority: P1, depends on #1.
   - Outcome: view-source includes every body string.
   - Adds: nothing structural; verify Server Components only.
   - Tests: Playwright with JS disabled, assert text presence.

5. `task: JSON-LD Person and CreativeWork render in head on / and on a project page (Phase 4)`
   - Priority: P1, depends on #1, #2.
   - Adds: `lib/seo/jsonld.ts`, metadata helpers.
   - Tests: snapshot of generated JSON-LD.

6. `task: a brand-on 404 page renders for unknown routes (Phase 4)`
   - Priority: P2.
   - Adds: `app/not-found.tsx`.
   - Tests: RTL.

7. `task: clicking the cv link downloads the pdf at /cv/David-Onasanya-CV.pdf (Phase 4)`
   - Priority: P1.
   - Outcome: link points at the static file; HEAD returns 200.
   - Adds: link rendering; the file already exists at `cv/David-Onasanya-CV.pdf`; ensure `/public/cv/` placement.
   - Tests: e2e link smoke.

---

## Phase 5: Cinema layer (6 slices)

1. `task: first visit shows the cinematic intro, second visit skips it (Phase 5)`
   - Priority: P1.
   - Outcome: localStorage flag prevents replay; reduced-motion skips entirely.
   - Adds: `components/public/CinematicIntro.tsx` via `react-view-transitions`, `lib/intro/seenStorage.ts`, `lib/motion/preferences.ts`.
   - Tests: SSR-safe seenStorage gate; `usePrefersReducedMotion()` SSR default false.

2. `task: a custom cursor follows the pointer on desktop only (Phase 5)`
   - Priority: P2.
   - Outcome: present on `pointer:fine`, absent on touch and reduced-motion.
   - Adds: `components/shared/CustomCursor.tsx`.
   - Tests: hook unit (refs + raf, no per-frame React state); manual.

3. `task: hovering primary buttons triggers a magnetic pull, disabled on touch and reduced-motion (Phase 5)`
   - Priority: P2.
   - Adds: `components/shared/MagneticButton.tsx`.
   - Tests: manual.

4. `task: skill pills marquee scrolls horizontally and freezes on reduced-motion (Phase 5)`
   - Priority: P2.
   - Adds: `components/public/Marquee.tsx`.
   - Tests: manual; RTL for the freeze.

5. `task: pressing Cmd or Ctrl+K (or /) opens a command palette with navigation, contact, theme actions (Phase 5)`
   - Priority: P1.
   - Outcome: keyboard-only flow, escape returns focus.
   - Adds: `components/shared/CommandPalette.tsx` via `cmdk`, `lib/palette/items.ts`.
   - Tests: deterministic palette items unit; e2e keyboard flow.

6. `task: clicking a project row morphs into the case study via view transitions (Phase 5)`
   - Priority: P2.
   - Adds: view-transition wiring on the index and project pages; `react-view-transitions` named transitions.
   - Tests: manual; RTL for the reduced-motion bypass.

---

## Phase 6: Auth.js v5 magic-link sign-in (5 slices)

1. `task: signing in with the admin email lands me on /admin (happy path) (Phase 6)`
   - Priority: P1.
   - Outcome: open `/login`, enter `ADMIN_EMAIL`, receive a magic link via Resend, click it, see `/admin`.
   - Adds: minimal `lib/auth.ts`, Drizzle adapter, `users`/`sessions`/`verification_tokens` tables, login page, `[...nextauth]` route, middleware.
   - Tests: unit on token shape; Playwright `e2e/sign-in.spec.ts` happy path against preview, intercepting Resend.

2. `task: signing in with a non-admin email shows generic copy and never sends mail (Phase 6)`
   - Priority: P1, depends on #1.
   - Outcome: any non-admin email returns "if that email is registered, we sent a link"; Resend never called.
   - Adds: `lib/auth/allowlist.ts` with case-insensitive trim, boot-time empty check.
   - Tests: unit (case, trim, empty boot); Playwright assertion that Resend stub records zero sends.

3. `task: sixth sign-in attempt from one IP within fifteen minutes returns 429 (Phase 6)`
   - Priority: P1, depends on #1.
   - Outcome: rate-limit shows generic copy; Sentry breadcrumb on 429.
   - Adds: `lib/auth/rate-limit.ts` against Upstash, sliding window 5/15min/IP, fail-closed.
   - Tests: unit (window arithmetic, fail-closed); Playwright burst test.

4. `task: an expired or already-used magic link shows a clear error (Phase 6)`
   - Priority: P2, depends on #1.
   - Adds: token expiry + single-use enforcement, constant-time compare, `/login?error=expired` state.
   - Tests: unit on token verifier; RTL on error state.

5. `task: sign-in emails contain no em-dash and no emoji (Phase 6)`
   - Priority: P1, depends on #1.
   - Adds: `lib/auth/email.ts` with Zod payload schema rejecting U+2014 and `\p{Extended_Pictographic}`.
   - Tests: unit (positive + negative including a literal em-dash and a sample emoji).

---

## Phase 7: Admin shell, editors, draft persistence (7 slices)

1. `task: signing in lands me on /admin where I see editor sections for every site area (Phase 7)`
   - Priority: P1.
   - Outcome: nav lists Hero, About, Skills, Experience, AI, Projects, Footer, Settings.
   - Adds: `app/(admin)/admin/{page,[section]/page}.tsx`, layout.
   - Tests: RTL nav.

2. `task: editing the hero headline auto-saves a draft within 350ms (Phase 7)`
   - Priority: P1, depends on #1.
   - Outcome: type, blur, draft persisted in Neon.
   - Adds: `lib/draft/store.ts`, debounced save, server action.
   - Tests: unit on debounce; integration with test DB.

3. `task: the live preview pane reflects unsaved draft changes (Phase 7)`
   - Priority: P1, depends on #2.
   - Outcome: edit on left, preview pane updates without full rehydration.
   - Adds: `app/admin/preview/page.tsx`.
   - Tests: manual + RTL.

4. `task: drag-reorder of the project list persists, n renumbered on save (Phase 7)`
   - Priority: P1, depends on #1.
   - Adds: `components/admin/DragList.tsx` via `dnd-kit`, projects editor, server action.
   - Tests: RTL drag; server-side renumber unit.

5. `task: uploading a 2MB image returns a Blob URL written into the draft (Phase 7)`
   - Priority: P1, depends on #1.
   - Adds: `app/api/cms/upload/route.ts`, signed Vercel Blob upload, `ImageUploader`, AVIF transform via sharp, 1.5MB cap.
   - Tests: integration with mocked Blob; size cap unit; AVIF unit.

6. `task: every editor field shows inline Zod validation errors (Phase 7)`
   - Priority: P1, depends on #1.
   - Adds: shared `MarkdownField`, `VisibilityToggle`, `Modal`, `Toast` primitives composed into every editor.
   - Tests: RTL field validation per editor.

7. `task: hiding a section via VisibilityToggle removes it from the public preview but keeps content (Phase 7)`
   - Priority: P2, depends on #1, #6.
   - Adds: visibility flag in schema (Phase 3) consumed in section components.
   - Tests: RTL + e2e.

---

## Phase 8: GitHub commit pipeline (5 slices)

1. `task: pressing publish on a hero edit opens a PR on GitHub with the right diff (Phase 8)`
   - Priority: P1.
   - Outcome: end-to-end happy path; modal returns a real PR URL.
   - Adds: `lib/github.ts`, `lib/github/{branch,commit,pr}.ts`, `app/api/cms/save/route.ts`, `PublishButton`, `PublishResultModal`.
   - Tests: unit on tree builder; unit on branch shape; integration with Octokit mocks asserting create-ref / blob / tree / commit / update-ref / create-pr.

2. `task: publishing content with a forbidden character refuses to commit (Phase 8)`
   - Priority: P1, depends on #1.
   - Outcome: paste an em-dash, press publish, inline error names the field; no branch, no PR.
   - Adds: defence-in-depth scan in `lib/github/commit.ts` using `lib/text/forbidden.ts` from Phase 1.
   - Tests: unit; RTL on the publish modal error state.

3. `task: publishing the same draft twice updates the existing PR rather than opening a second (Phase 8)`
   - Priority: P2, depends on #1.
   - Outcome: second publish force-updates the branch and posts "draft updated"; PR URL unchanged.
   - Adds: collision detection on branch name, refs PATCH path, 422 mapping.
   - Tests: unit on 422 reuse; integration mock asserting PATCH on existing ref.

4. `task: a stale or wrong GitHub token surfaces a clear configuration error in the admin UI (Phase 8)`
   - Priority: P2, depends on #1.
   - Adds: error mapping in `lib/github/commit.ts` (401, 403, 404, 422).
   - Tests: unit on each mapping branch.

5. `task: the PR body lists what changed in plain language, no em-dash, no emoji (Phase 8)`
   - Priority: P2, depends on #1.
   - Adds: `lib/github/diff.ts` summariser.
   - Tests: unit (snapshot for a fixture diff; assertion the snapshot is forbidden-char clean).

---

## Phase 9: SEO surface (5 slices)

1. `task: requesting /api/og returns a generated OpenGraph image for the home page (Phase 9)`
   - Priority: P1.
   - Outcome: 200 response, png, brand stripe + Fraunces title.
   - Adds: `app/api/og/route.tsx`, `lib/seo/og-template.tsx`.
   - Tests: content assertion (title, role, year).

2. `task: requesting /api/og/<slug> returns a per-project OpenGraph image (Phase 9)`
   - Priority: P1, depends on #1.
   - Adds: `app/api/og/[slug]/route.tsx`.
   - Tests: parameterised over the seven projects; rejects U+2014 in inputs.

3. `task: legacy paths redirect to canonical urls (Phase 9)`
   - Priority: P2.
   - Outcome: `/about`, `/work`, etc. 308 to canonical.
   - Adds: `next.config.ts` `redirects()`, `lib/seo/redirects.ts`.
   - Tests: snapshot of redirect map; e2e.

4. `task: pwa manifest renders with theme-color from brand 500 (Phase 9)`
   - Priority: P2.
   - Adds: finalise `app/manifest.ts`.
   - Tests: snapshot.

5. `task: rich-results test passes for Person on / and CreativeWork on a project page (Phase 9)`
   - Priority: P1.
   - Outcome: Twitter, LinkedIn, Google validators green against preview URL.
   - Adds: any JSON-LD tweaks needed.
   - Tests: manual against preview; snapshot regression.

---

## Phase 10: Contact, analytics, error monitoring (5 slices)

1. `task: clicking show contact form reveals a form behind Turnstile (Phase 10)`
   - Priority: P1.
   - Outcome: form not on first paint; appears on action.
   - Adds: `components/public/ContactForm.tsx`, `app/api/contact/route.ts`, Turnstile widget.
   - Tests: RTL show/hide; Turnstile verifier unit.

2. `task: submitting a valid contact message lands an email and shows a success state (Phase 10)`
   - Priority: P1, depends on #1.
   - Adds: contact handler via Resend; Zod payload schema rejecting U+2014/emoji.
   - Tests: integration with mocked Resend.

3. `task: rapid resubmits are blocked by Turnstile (Phase 10)`
   - Priority: P2, depends on #1.
   - Adds: Turnstile token verification in handler.
   - Tests: integration with stubbed verifier; manual.

4. `task: page views appear in Vercel Web Analytics (Phase 10)`
   - Priority: P1.
   - Adds: `@vercel/analytics` init in `app/layout.tsx`.
   - Tests: manual.

5. `task: a thrown error surfaces in Sentry with source maps (Phase 10)`
   - Priority: P1.
   - Adds: Sentry init server + client; source map upload in CI.
   - Tests: manual error trigger on preview.

---

## Phase 11: Lighthouse CI budget gate (4 slices)

1. `task: lighthouse CI runs against / on every preview and posts a comment (Phase 11)`
   - Priority: P1.
   - Adds: `.lighthouserc.json` for `/`, `.github/workflows/lighthouse.yml` triggered on Vercel deployment-status success.
   - Tests: CI run.

2. `task: lighthouse CI gates a project page and a deep-dive page on the same budget (Phase 11)`
   - Priority: P1, depends on #1.
   - Adds: budgets for one project and one project-with-deep-dive.
   - Tests: CI run.

3. `task: a deliberately unoptimised png in a PR fails the lighthouse job (Phase 11)`
   - Priority: P1, depends on #1.
   - Outcome: regression catches; revert turns it green.
   - Adds: nothing structural; demonstration only.
   - Tests: PR exercise.

4. `task: lighthouse is required on main alongside ci, e2e, codeql (Phase 11)`
   - Priority: P1, depends on #1.
   - Adds: branch protection update via `gh api`.
   - Tests: manual try-merge with red lighthouse.

---

## Phase 12: End-to-end Playwright on publish flow (4 slices)

1. `task: e2e/sign-in.spec.ts runs against every preview and asserts the magic link round-trip (Phase 12)`
   - Priority: P1.
   - Adds: spec relocated and expanded from Phase 6; CI workflow `e2e.yml` triggered on Vercel preview ready.
   - Tests: CI run.

2. `task: e2e/publish-flow.spec.ts signs in, edits the headline, publishes, asserts a real PR url (Phase 12)`
   - Priority: P1, depends on #1.
   - Adds: spec; uses the test GitHub token.
   - Tests: CI run.

3. `task: e2e/public-smoke.spec.ts visits / and two project pages, asserts h1, og meta, no console errors (Phase 12)`
   - Priority: P1, depends on #1.
   - Adds: spec.
   - Tests: CI run.

4. `task: e2e and lighthouse skip on docs-only PRs to save Actions minutes (Phase 12)`
   - Priority: P2, depends on #1.
   - Adds: path filters in `e2e.yml` and `lighthouse.yml`.
   - Tests: docs-only PR (markdown change) sees the jobs skipped.

---

## Phase 13: Hardening, a11y audit, content review, launch (7 slices)

1. `task: NVDA and VoiceOver navigate every public page using landmarks and palette announcements (Phase 13)`
   - Priority: P1.
   - Outcome: documented audit; fixes shipped.
   - Adds: a11y fixes per audit; PR template manual checklist.
   - Tests: manual.

2. `task: the real-device matrix (Safari macOS, Safari iOS, Chrome Android, Firefox, Edge) renders without breakage (Phase 13)`
   - Priority: P1.
   - Adds: any browser-specific fixes.
   - Tests: manual.

3. `task: davidonasanya.com resolves to the production deployment over https (Phase 13)`
   - Priority: P1.
   - Adds: DNS records, Vercel domain, `AUTH_URL` env update.
   - Tests: dig + curl smoke.

4. `task: production lighthouse scores 95+ on Performance, Accessibility, Best Practices, SEO (Phase 13)`
   - Priority: P1, depends on #3.
   - Outcome: success criterion.
   - Adds: any final perf tweaks.
   - Tests: lighthouse run.

5. `task: a phone-to-live edit round-trip completes in under five minutes (Phase 13)`
   - Priority: P1, depends on #3.
   - Outcome: scope success criterion.
   - Tests: manual stopwatch.

6. `task: branch protection on main, staging, develop is final (all required checks, enforce_admins true, no force-push, no deletion) (Phase 13)`
   - Priority: P1.
   - Adds: final `gh api` protection update across all three branches via `REQUIRE_CHEAP_CHECKS=1 REQUIRE_HEAVY_CHECKS=1 bash scripts/github/seed-branch-protection.sh`.
   - Tests: manual; verify `gh api repos/.../branches/<b>/protection` returns the expected contexts list for each branch.

7. `task: CLAUDE.md documents installed Vercel skills and per-task-type preferences (Phase 13)`
   - Priority: P2.
   - Adds: `CLAUDE.md` finalisation.
   - Tests: manual review.

---

## Summary

| Phase | Slices | P1 | P2 | P3 |
|---|---|---|---|---|
| 0 | 6 | 5 | 1 | 0 |
| 1 | 6 | 3 | 3 | 0 |
| 2 | 5 | 3 | 1 | 1 |
| 3 | 6 | 5 | 1 | 0 |
| 4 | 7 | 6 | 1 | 0 |
| 5 | 6 | 2 | 4 | 0 |
| 6 | 5 | 4 | 1 | 0 |
| 7 | 7 | 6 | 1 | 0 |
| 8 | 5 | 2 | 3 | 0 |
| 9 | 5 | 3 | 2 | 0 |
| 10 | 5 | 4 | 1 | 0 |
| 11 | 4 | 4 | 0 | 0 |
| 12 | 4 | 3 | 1 | 0 |
| 13 | 7 | 6 | 1 | 0 |
| **Total** | **78** | **56** | **21** | **1** |

Next step: review and trim, then I will create these as GitHub Issues against `AdeniyiOnasanya/Portfolio` once the labels, milestones, and project board are seeded.
