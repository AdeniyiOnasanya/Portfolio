# Implementation Plan: davidonasanya.com Portfolio

## Context

The scope (`project-scope.md`), tech stack (`tech-stack.md`), design tokens (`tokens.css`), and visual reference (`design_handoff_portfolio/`) are agreed. The repo is greenfield: no Next.js code exists yet. This plan turns those decisions into a phased, TDD-driven build that keeps the repo shippable after every PR.

**Why this shape:** the user wants a senior-engineer artefact. That means strict tests where regressions are expensive (schemas, auth, content pipeline, GitHub commits), pragmatic verification where TDD adds friction without value (animations, cinematic intro, theme toggle aesthetics), and CI gates strong enough that nothing broken can reach `main`.

**Outcome:** a private repo where every content edit ships through a PR I review by hand, a public site at `davidonasanya.com` scoring 95+ on all four Lighthouse axes, and an admin CMS I can drive from my phone.

---

## Hard rules enforced in every phase

- No em-dash (U+2014). No emoji. Enforced in code via Biome rule + a CI meta-test that scans the whole repo.
- All animations honour `prefers-reduced-motion`. Token durations already zero out under reduced motion (`tokens.css` lines 353-359).
- Every change ships through the chain `feature/<n>_<slug> -> develop -> staging -> main`. No direct push to any of the three protected branches. No auto-merge. No force-push. No hotfixes. Branch protection on all three: PR required, CI green required, `branch-flow-guard` required, `enforce_admins=true`.
- Branch naming: `feature/<issue-number>_<short-slug>` (also `fix/`, `content/`, `chore/`, `docs/`). Conventional commit subjects.
- Repo private. Single `ADMIN_EMAIL` gates the magic link. Content in `/content/`. CV in `/public/cv/`.
- Theme dark-first; light alternate; both respect `prefers-color-scheme`.

## TDD discipline (pragmatic flavour)

| Concern | Approach | Why |
|---|---|---|
| Zod schemas, content loaders, validation, slug normalisation | Strict test-first | Schema drift is the highest-blast-radius bug. |
| GitHub commit pipeline (Octokit) | Strict test-first with mocks | Side effects on the repo. |
| Rate-limit, magic-link verification | Strict test-first | Security-adjacent; off-by-one matters. |
| OG image content, JSON-LD, redirects, sitemap | Strict test-first; visuals manual | Strings flow from content; layout is judged by eye. |
| Sign-in, edit/save/publish, public smoke | Behaviour-first via Playwright | Integration of auth + draft + Octokit only proven end-to-end. |
| Cinematic intro, cursor, magnetic, marquee, palette feel, theme toggle look | Manual + visual | TDD adds friction without catching real bugs (jank, taste). The reduced-motion path itself is unit-tested. |

## Test layers

- **Vitest unit:** pure logic (schemas, loaders, slug, rate-limit, redirects, JSON-LD, OG content, GitHub pipeline mocks, auth helpers).
- **Vitest + React Testing Library:** component logic with no animation (theme toggle, admin editors, drag-reorder, validation).
- **Playwright e2e:** three specs against the per-PR Vercel preview: `sign-in`, `publish-flow`, `public-smoke`.
- **Lighthouse CI:** budget gate, required check.
- **Manual checklist:** baked into the PR template per phase.

---

## Phase plan

Each phase is split into 3 to 7 tracer-bullet vertical slices on GitHub Issues. Each slice is one PR. Branches are `feature/<issue-number>_<short-slug>` (also `fix/`, `content/`, `chore/`, `docs/`), branched off `develop`. Promotion to staging and production goes through `develop -> staging -> main`, each via a `release: <from> -> <to> YYYY-MM-DD` PR. See `phase-slices.md` for the full slice list and `.github/CONTRIBUTING.md` for the chain rules.

### Phase 0, Repo bootstrap and protection
**Goal:** Next.js 16 / TS strict / pnpm app installed in this repo, Tailwind v4 wired against `tokens.css`, Biome runnable, CI skeleton in place, Vercel hookup, three-branch flow operating in soft mode (classic protection deferred to GitHub Pro upgrade).
**Adds:** `package.json` (Node 22+, pnpm 9+, scripts `dev`/`build`/`start`/`typecheck`/`lint`/`format`); `tsconfig.json` (strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`); `next.config.ts`; `biome.json`; `postcss.config.mjs`; `app/layout.tsx`; `app/page.tsx` (placeholder); `app/globals.css` (`@import "tailwindcss"` + `@theme { ... }` block exposing `tokens.css` values); `.gitignore`, `.nvmrc`, `.env.example`, `CLAUDE.md`. Already on `main` from earlier setup: `.github/workflows/ci.yml` (added in this phase), `.github/workflows/branch-flow-guard.yml`, `.github/workflows/project-automation.yml`, PR + issue templates, `scripts/github/*` seeders. Library install steps grounded at execution time via Context7 (`/vercel/next.js/v16.2.2`, `/tailwindlabs/tailwindcss.com`, `/biomejs/biome`).
**Tests:** none. CI runs typecheck + lint + build only.
**Verify:** `pnpm typecheck && pnpm build` green; CI green on PR to `develop`; Vercel preview renders the placeholder; Tailwind utility on the placeholder picks up a `tokens.css` value; `pnpm lint` runs Biome and a deliberate `any` fails; `branch-flow-guard` shows a red X on a `feature/*` -> `staging` PR (visible-only until GitHub Pro flips classic protection on, see issue #3).

### Phase 1, Quality gates and the em-dash/emoji guard
**Goal:** lock the test runner, lint rules, and project-specific bans before any logic exists.
**Adds:** `lib/text/forbidden.ts` + tests; `vitest.config.ts`; `playwright.config.ts` (config only); meta-test that scans `**/*.{ts,tsx,md,mdx,json,css}` for U+2014 and `\p{Extended_Pictographic}`; CI jobs `typecheck`, `lint`, `unit`, `forbidden-chars`, `build`; `dependabot.yml`, `codeql.yml`.
**Verify:** PR with a deliberate em-dash fails `forbidden-chars`; remove and pass.

### Phase 2, Tokens, fonts, theme provider, base layout
**Goal:** tokens and fonts wired through App Router; dark-first; reduced motion verified.
**Adds:** `app/globals.css` imports the existing `tokens.css` verbatim (already authored); `next/font` self-hosts Fraunces (variable axes), Geist, JetBrains Mono (Latin subset); `components/shared/{ThemeProvider,ThemeToggle,Reveal,Grain}.tsx`; SSR-safe theme resolver via cookie + `Sec-CH-Prefers-Color-Scheme`.
**Tests:** RTL on `ThemeToggle` (cycle system->dark->light, persistence); unit on `lib/theme/resolve.ts`; RTL on `Reveal` (no observer when reduced motion).
**Verify:** toggle theme has no FOUC; DevTools `prefers-reduced-motion: reduce` zeros durations; OKLCH renders in Safari 16+, Chrome 111+, Firefox 113+.

### Phase 3, Content schema, loaders, seed content
**Goal:** single Zod source of truth; build refuses invalid content. Strictly TDD.
**Adds:** `lib/schema.ts`, `lib/content.ts`, `lib/projects.ts`, `lib/slug.ts`, `lib/text/safeText.ts`, `scripts/validate-content.ts` (called from `prebuild`); `content/site.json` ported from `design_handoff_portfolio/design/data.js` (preserve `<em>` semantics in `headline`; `projects` is now an ordered slug list, not a list of objects); seven `content/projects/<slug>.mdx` files (`multi-cloud-platform`, `foster-care-platform`, `compliance-electron`, `calendar-tool`, `microplastics-mobile`, `endoscope-tracking`, `elearning-platform`) with frontmatter for structured fields and MDX body for `problem`/`approach`/`outcome`/optional deep-dive.
**Tests:** every Zod parser; round-trip parse for valid + invalid; pinned issue-path snapshots; loader memoisation; slug normaliser (kebab-case, diacritics stripped, max 60, reserved words `admin/api/login/cv/_next` rejected); `validate-content` exits non-zero on bad input. `safeText()` refinement rejects U+2014/emoji.
**Verify:** `pnpm validate-content` green; deliberately corrupted `site.json` fails `pnpm build`.

### Phase 4, Public site shell (no animations yet)
**Goal:** server-rendered landing + per-project pages from real content; accessible, fast, indexable.
**Adds:** `app/(public)/{layout,page}.tsx`, `app/(public)/projects/[slug]/{page,not-found}.tsx`, sections `components/public/{Hero,About,Skills,Experience,AIPractice,ProjectIndex,Footer,ProjectCaseStudy,DeepDive}.tsx`, `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts`, `lib/seo/{jsonld,metadata,redirects}.ts`, `app/not-found.tsx`. CV is a static link to `/cv/David-Onasanya-CV.pdf`.
**Tests:** RTL per section (visibility flags, semantic landmarks, single h1 per page); JSON-LD `Person` + `CreativeWork` snapshots; sitemap snapshot; redirect map.
**Vercel skills:** `react-best-practices` for the project-index hover preview (no whole-list re-renders); `web-design-guidelines` review pass before PR; `composition-patterns` on `ProjectCaseStudy` to keep `DeepDive` clean.
**Verify:** Lighthouse 95+ floor on `/` and one project page; tab focus visible; view source contains all section text (no JS for SEO).

### Phase 5, Cinema (intro, cursor, magnetic, marquee, palette, view transitions)
**Goal:** cinematic layer over the static shell; all gated by reduced motion + pointer type.
**Adds:** `components/public/CinematicIntro.tsx` using `react-view-transitions`; `components/shared/{CustomCursor,MagneticButton}.tsx`; `components/public/Marquee.tsx`; `components/shared/CommandPalette.tsx` via `cmdk`; `lib/{intro/seenStorage,motion/preferences,palette/items}.ts`. `ProjectIndex/HoverPreview` extracted via `composition-patterns`.
**Tests (logic only):** seenStorage SSR-safe gate; `usePrefersReducedMotion()` SSR default false; deterministic palette items from `Site`.
**TDD does not apply to:** intro feel, magnetic spring constant, marquee speed, cursor lag (tuned by eye against the handoff).
**Vercel skills:** `react-view-transitions` (intro, project-row morph, prev/next, before/after slider); `web-design-guidelines` reduced-motion sweep before merge; `react-best-practices` on cursor + magnetic hooks (refs + raf, no per-frame React state).
**Verify (manual checklist):** reduced motion ON: intro skipped, marquee frozen, cursor system, magnetic disabled, view transitions instant. Touch device: cursor absent, magnetic disabled, intro auto-skips. Keyboard only: palette opens on Cmd/Ctrl+K and `/`, escape returns focus.

### Phase 6, Auth.js v5 magic-link sign-in
**Goal:** real sign-in; only `ADMIN_EMAIL` gets a link; sessions in Neon; rate-limited via Upstash.
**Adds:** `lib/auth.ts` (Auth.js v5 + Drizzle adapter), `lib/auth/{allowlist,rate-limit,verify,email}.ts`, `lib/db/schema.ts` (`users`, `sessions`, `verification_tokens`), `app/(admin)/login/page.tsx`, `app/api/auth/[...nextauth]/route.ts`, `middleware.ts` (gates `/admin/*`).
**Tests (strict):** allowlist case-insensitive + trim + boot-time empty check; rate-limit 5/15min/IP, sliding window, fail-closed; magic-link token format, expiry, single-use, constant-time compare; Resend payload shape rejects U+2014/emoji; identical responses for known + unknown emails (no enumeration).
**Tests (Playwright, first live e2e):** `e2e/sign-in.spec.ts` against Vercel preview; intercepts outgoing email via Resend test inbox or stubbed transport.
**Verify:** non-admin email returns generic copy, no Resend send; admin email sends; sixth attempt from one IP returns 429.

### Phase 7, Admin shell, editor primitives, draft persistence
**Goal:** admin UI scaffolded; edits stored as a server-side draft (Neon row, JSON column) until publish; preview pane reads the draft.
**Adds:** `app/(admin)/admin/{page.tsx,[section]/page.tsx,projects/[slug]/page.tsx}`; `components/admin/{Hero,About,Skills,Experience,AIPractice,Projects,Footer,Settings,DeepDive}Editor.tsx`; `components/admin/{DragList,Modal,Toast,ImageUploader,MarkdownField,VisibilityToggle}.tsx`; `lib/draft/store.ts`; `app/admin/preview/page.tsx`; `app/api/cms/upload/route.ts` (Vercel Blob signed upload).
**Tests:** RTL form primitives + field-level Zod validation; debounced auto-save (350ms); drag-reorder `n` renumbering on save (not on drag).
**Vercel skills:** `composition-patterns` is the headliner (ten editor sections share four primitives); `react-best-practices` on the iframe preview to avoid full rehydration on every keystroke.
**Verify:** edit hero headline, preview updates within ~400ms; drag-reorder persists across refresh; 2 MB image upload yields a Blob URL written into the draft.

### Phase 8, GitHub commit pipeline (CMS-to-PR)
**Goal:** publish takes draft, validates with Zod, writes content files via Octokit on a new branch, opens a PR. I merge by hand.
**Adds:** `lib/github.ts` (Octokit factory), `lib/github/{commit,branch,pr,diff}.ts`, `app/api/cms/save/route.ts`, `components/admin/{PublishButton,PublishResultModal}.tsx`.
**Tests (strict):** file tree from parsed `Site`; refuses commit if Zod fails or any string contains U+2014/emoji (defence in depth); branch name `cms/<unix-ts>-<slug>` shape + collision; PR title + body generation (no em-dash/emoji); error mapping (401 -> config error, 422 -> single-PR-per-draft re-use via refs PATCH).
**Vercel skills:** `react-best-practices` on the publish button (idempotent, double-click guarded).
**Verify:** publish a hero edit; branch + PR appear on GitHub with correct diff; merging triggers Vercel redeploy; change live within minutes (success criterion).

### Phase 9, SEO surface: OG images, JSON-LD, sitemap, redirects
**Goal:** every shareable URL has an OG card; JSON-LD validates; legacy paths redirect.
**Adds:** `app/api/og/route.tsx` + `app/api/og/[slug]/route.tsx` via `next/og`, `lib/seo/og-template.tsx`, `next.config.ts` `redirects()`, finalised manifest with theme-color from brand 500.
**Tests (strict):** OG content assertions (title, year, role flow correctly; no em-dash); JSON-LD schemas pinned; sitemap regression snapshot.
**Vercel skills:** `web-design-guidelines` on the OG template typography (Fraunces italic, mono caption, brand stripe).
**Verify:** Twitter validator + LinkedIn inspector against preview URL; Google rich-results test passes for `Person` and project `CreativeWork`.

### Phase 10, Contact form, analytics, error monitoring
**Goal:** public contact action behind Cloudflare Turnstile; analytics + Sentry wired.
**Adds:** `app/api/contact/route.ts`, `components/public/ContactForm.tsx` (rendered behind a "show contact form" action, not on first paint); `@vercel/analytics` + Sentry init in `app/layout.tsx`.
**Tests:** Turnstile verifier; contact payload Zod validator (rejects U+2014/emoji).
**Verify:** real submission via preview arrives; Turnstile blocks rapid resubmit.

### Phase 11, Lighthouse CI as a budget gate
**Goal:** CI fails when public scores fall below 95.
**Adds:** `.lighthouserc.json` budgets for `/`, one project, one project with deep-dive; `.github/workflows/lighthouse.yml` triggered on Vercel deployment-status `success`. Required check on `staging` and `main`.
**Verify:** add a deliberately unoptimised PNG, CI red; revert, green.

### Phase 12, End-to-end Playwright on the publish flow
**Goal:** automate the success-criterion smoke up to PR open.
**Adds:** `e2e/publish-flow.spec.ts` (sign in, edit headline, save, publish, assert PR URL + branch); `e2e/public-smoke.spec.ts` (`/`, two project pages: h1, OG meta, no console errors); `.github/workflows/e2e.yml`.
**Verify:** both specs green in CI against every preview.

### Phase 13, Hardening, a11y audit, content review, launch
**Goal:** all success criteria met; both domains live; branch protection final.
**Activities:** NVDA + VoiceOver audit (landmarks, palette announcements, error association); real-device matrix (Safari macOS, Safari iOS, Chrome Android, Firefox, Edge); DNS cutover for `davidonasanya.com` and `staging.davidonasanya.com`; `AUTH_URL` set per environment; `CLAUDE.md` finalised.
**Verify:** Lighthouse 95+ across all four axes on production URL; phone-to-live edit round-trip under five minutes; final branch protection (all required checks, `enforce_admins=true`, no force-push, no deletion) holds on all three branches.

---

## CI / Actions layout

```
.github/workflows/
  ci.yml          PR + push to main: typecheck, lint, unit, forbidden-chars, build
  e2e.yml         on Vercel preview ready: sign-in, publish-flow, public-smoke
  lighthouse.yml  on Vercel preview ready: budget gate
  codeql.yml      weekly + on PR
.github/dependabot.yml   weekly npm + actions
.github/PULL_REQUEST_TEMPLATE.md   manual-check list per phase
```

Required checks on `main` (final state): typecheck, lint, unit, forbidden-chars, build, e2e-smoke, e2e-publish, lighthouse, codeql.

Concurrency group `ci-${{ github.ref }}` cancels superseded runs. pnpm + Playwright caches keyed on lockfile.

---

## Vercel agent skills mapping

| Skill | Phases | Why |
|---|---|---|
| `react-best-practices` | 0, 4, 5, 6, 7, 8 | Lighthouse Performance 95+; server/client split discipline. |
| `web-design-guidelines` | 1, 2, 4, 5, 9, 13 | Reduced-motion guarantee; tabular-nums; curly quotes; focus-visible; OG typography. |
| `react-view-transitions` | 5, 7 | Animation system without hand-rolling each transition. |
| `composition-patterns` | 4, 5, 7 | Keeps the admin editor surface reviewable as ten editors share four primitives. |
| `vercel-deploy-claimable` | 0 only | One-off previews; production deploys go through `main`. |
| `react-native-guidelines` | Skipped | Web only. |

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Vercel Blob 1 GB ceiling | Cap upload at 1.5 MB; auto-AVIF via sharp in upload route; admin shows running total; orphan blobs surfaced for deletion. |
| Hobby bandwidth (100 GB/month) | Vercel Web Analytics dashboards; tuned `next/image` cache; firewall scrapers; promote to Pro if exceeded. |
| Actions 2,000 min/month | pnpm + Playwright browser caches; path filters skip e2e on docs-only PRs; skip Lighthouse on docs-only. |
| Resend 3,000/month | Allowlist drops mismatched email before API hit; rate limit before mailer call; Sentry alert on 429 spike. |
| Auth.js v5 churn | Pin version; upgrade only inside a dedicated PR with Phase 6 e2e green. |
| Tailwind v4 maturity | Tokens are the load-bearing artefact; if a Tailwind issue blocks a phase, fall back to vanilla CSS modules for that component only. |
| OKLCH older-browser support | `@supports (color: oklch(0 0 0))` fallback layer mapping semantic tokens to sRGB; document as known limitation. |
| Image weight | `next/image` with explicit `sizes`; AVIF first; `priority` only for LCP image; Lighthouse budget catches regressions. |
| Font payload | `next/font` Latin subset; `display: swap`; preload only Fraunces hero weight; consider dropping Fraunces `WONK` axis if total exceeds 200 KB. |

---

## Definition of Done (from `project-scope.md` success criteria)

1. I can edit any section of the portfolio from `/admin` on a phone, publish, see it live within minutes (Phases 6 to 8 + 12).
2. A recruiter from LinkedIn sees a fast server-rendered page, clean OG card, one-click CV download (Phases 4 + 9).
3. Repo commit history is the audit log of every content change (Phase 8: every publish opens a PR; merge is the audit event).
4. No content lost if my laptop dies; GitHub is source of truth (Phases 3 + 8).
5. Lighthouse 95+ on Performance, Accessibility, Best Practices, SEO (Phase 11 budget; Phase 13 final pass).
6. Branch protection on `main` enforces "no direct push, CI green, PR required" with no bypasses (manual audit at launch).
7. No em-dash, no emoji anywhere in shipped repo (Phase 1 meta-test, kept green throughout).
8. Every animation has a reduced-motion path (Phases 2 + 5 manual sweep; tokens already cascade).

---

## Critical files (priority order)

1. `/Users/davidonasanya/Desktop/Jobs/Portfolio/lib/schema.ts`. Zod source of truth for all content.
2. `/Users/davidonasanya/Desktop/Jobs/Portfolio/lib/github/commit.ts`. The publish pipeline.
3. `/Users/davidonasanya/Desktop/Jobs/Portfolio/lib/auth.ts`. Auth.js config; allowlist enforced here.
4. `/Users/davidonasanya/Desktop/Jobs/Portfolio/app/layout.tsx`. Fonts, theme, analytics, Sentry init.
5. `/Users/davidonasanya/Desktop/Jobs/Portfolio/.github/workflows/ci.yml`. Quality gate; everything depends on this staying green.

Existing artefacts to reuse, not rewrite:
- `/Users/davidonasanya/Desktop/Jobs/Portfolio/tokens.css`. Imported verbatim into `app/globals.css`. Do not duplicate.
- `/Users/davidonasanya/Desktop/Jobs/Portfolio/design_handoff_portfolio/design/data.js`. Port to `content/site.json` + seven MDX files. Do not import at runtime.
- `/Users/davidonasanya/Desktop/Jobs/Portfolio/design_handoff_portfolio/README.md`. Visual reference only; no code copied verbatim from the prototype.

---

## Verification per phase (one row each)

| Phase | Local | CI green | Browser smoke |
|---|---|---|---|
| 0 | install/typecheck/build | typecheck, lint, build | preview renders placeholder |
| 1 | test/lint | + unit, forbidden-chars | n/a |
| 2 | test, dev | as above | theme toggle no FOUC; reduced-motion zeros durations; OKLCH parity |
| 3 | validate-content, test, build | + content validation step | n/a |
| 4 | dev, local Lighthouse | as above | view source has all text; tab focus; project page renders |
| 5 | dev | as above | manual checklist (intro, cursor, magnetic, marquee, palette, reduced-motion) |
| 6 | test, Playwright sign-in | + e2e sign-in | sign in via Resend; sixth attempt 429 |
| 7 | dev with DATABASE_URL | as above | edit, preview, drag-reorder, image upload |
| 8 | dev with GITHUB_TOKEN | as above | publish opens branch + PR on GitHub |
| 9 | curl /api/og/<slug>.png | as above | Twitter + LinkedIn inspectors; rich-results test |
| 10 | submit contact locally | as above | email arrives; Turnstile blocks resubmit |
| 11 | lhci autorun | + lighthouse | scores 95+ on `/` and project pages |
| 12 | test:e2e | + publish-flow + public-smoke | full publish cycle including manual merge |
| 13 | n/a | all required green | full phone-to-live round-trip |

---

## Decisions to resolve at the relevant phase (not blockers now)

- **Phase 0:** GitHub `<owner>/<repo>` slug; Vercel team slug; DNS plan for `davidonasanya.com`.
- **Phase 2:** keep all four Fraunces axes (`opsz, SOFT, WONK, ital`) or drop `WONK` to save payload.
- **Phase 3:** canonical years of experience. Scope says eight; `data.js` says six. Resolve in `content/site.json`.
- **Phase 6:** canonical `ADMIN_EMAIL`. Memory has `onasanyaadeniyi@gmail.com`; `data.js` has `onasanyaadeniyi17@gmail.com`. Pick one before sign-in is wired.
- **Phase 6:** confirm Upstash Redis provisioned via the Vercel Marketplace integration.
- **Phase 8:** PAT vs GitHub App. Default is fine-grained PAT; migration is a future phase.
- **Phase 10:** public site exposes email via obfuscated link, contact form, or both.
- **Phase 13:** launch announcement copy; "available" string in the footer.

These are deferred so each phase resolves them in its own PR rather than blocking the plan now.
