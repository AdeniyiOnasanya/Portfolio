# Phase log

Track per-phase slice progress. `slice-runner` updates the row for the slice it shipped; the main thread reads this file to pick the next slice.

## Phase 3: Content schema, loaders, seed content (closed)

| # | Issue | Title (short) | Status | PR | Outcome |
| - | ----- | ------------- | ------ | -- | ------- |
| 1 | #17 | Zod schemas for site content | merged | (back-fill) | Schemas landed. |
| 2 | #18 | Seven project MDX files | merged | #128 | Seed content shipped. |
| 3 | #19 | site.json projects[] is ordered slug list | merged | (back-fill) | Single source of truth. |
| 4 | #20 | Slug normaliser | merged | #129 | kebab-case + reserved guard. |
| 5 | #21 | safeText U+2014 / emoji refinement | merged | #132 | Defence-in-depth at parse time. |
| 6 | #22 | Typed loader memoisation | merged | #133 | One fs read per process; cache clears on reject. |

## Meta-tooling shipped during Phase 3

| Issue | Title (short) | PR | Outcome |
| ----- | ------------- | -- | ------- |
| #130 | slice-runner subagent | #131 | Phase-aware orchestrator landed. |
| #134 | per-subagent model pins | #135 | Cost-tier pins landed. |

## Phase 4: Public site shell (closed)

| # | Issue | Title (short) | Status | PR | Outcome |
| - | ----- | ------------- | ------ | -- | ------- |
| 1 | #25 | sitemap.xml + robots.txt | merged | (back-fill) | Public discovery surfaces shipped. |
| 2 | #26 | JSON-LD Person + CreativeWork | merged | (back-fill) | Schema.org structured data on home + projects. |
| 3 | #27 | OpenGraph metadata helpers | merged | (back-fill) | OG metadata baseline. |
| 4 | #28 | Project case study page scaffold | merged | (back-fill) | /projects/[slug] route shipped. |
| 5 | #29 | Public home server-render with content | merged | #137 | Hero, About, Skills, Experience, AiPractice, DeepDive, Projects, Footer all server-rendered. |

## Phase 5: Cinema layer + corrections (closed)

| # | Issue | Title (short) | Status | PR | Outcome |
| - | ----- | ------------- | ------ | -- | ------- |
| 1 | #30 | Cinematic intro (first-visit only) | merged | #152 | Intro fades on first visit, skipped on second via seenStorage. |
| 2 | #31 | Custom cursor (desktop only) | merged | #153 | Dot + ring follower with rAF interpolation, gated on usePointerFine. |
| 3 | #32 | Magnetic primary buttons | merged | #155 | Wrapper with rAF translate, gated on prefers-reduced-motion + pointerFine. |
| 4 | #33 | Skill pills marquee | merged | #154 | Two-copy track at 60s linear infinite, accent-dot separators. |
| 5 | #34 | Cmd+K command palette | merged | (back-fill) | cmdk-backed nav + contact + theme actions. |
| 6 | #35 | Project row morph via view transitions | merged | #156 | startViewTransition wires row -> case study, additive enhancement. |
| corrections | (n/a) | Surface IA correction round | merged | #157 | Grain mount, header DO/2026 mark, eyebrow labels, Footer rebuild + F17 to F25 deferred follow-ups. |

## Phase 6: Authentication (closed)

| # | Issue | Title (short) | Status | PR | Outcome |
| - | ----- | ------------- | ------ | -- | ------- |
| 1 | #36 | Login page + magic-link form | merged | (back-fill) | /login renders the Auth.js v5 sign-in form. |
| 2 | #37 | Resend magic-link provider wired | merged | (back-fill) | sendVerificationRequest replaced with SafeText-guarded builder. |
| 3 | #38 | Admin allowlist | merged | (back-fill) | signIn callback drops anyone not on ADMIN_EMAIL. |
| 4 | #39 | Unauthenticated /admin redirects to /login | merged | (back-fill) | middleware + RSC guard share one helper. |
| 5 | #40 | Sign-in email Zod payload + tests | merged | (back-fill) | Forbidden-char defence at the email boundary. |

## Phase 7: Admin editors (closed)

| # | Issue | Title (short) | Status | PR | Outcome |
| - | ----- | ------------- | ------ | -- | ------- |
| 1 | #41 | Admin shell + nav | merged | (back-fill) | /admin scaffolding behind the auth gate. |
| 2 | #42 | Hero editor draft persistence | merged | (back-fill) | localStorage draft with diff preview. |
| 3 | #43 | Live preview pane | merged | #188 | Preview reflects the unsaved hero draft. |
| 4 | #44 | Drag-reorder project list | merged | #187 | dnd-kit + server-side n renumber on save. |
| 5 | #45 | Image upload route + ImageUploader | merged | #184 | Sharp + Vercel Blob; 1.5MB cap. |
| 6 | #46 | Headline diff preview | merged | (back-fill) | DiffPreview component for hero edits. |
| 7 | #47 | Per-section visibility toggle | merged | #189 | Admin can hide each public section in the preview. |

## Phase 8: CMS publish pipeline (closed)

| # | Issue | Title (short) | Status | PR | Outcome |
| - | ----- | ------------- | ------ | -- | ------- |
| 1 | #48 | Publish opens a PR via Octokit | merged | #190 | First publish writes a new branch + PR. |
| 2 | #49 | Forbidden-char defence at publish boundary | merged | #196 | 422 forbidden_character mapped from typed throw. |
| 3 | #50 | Deterministic per-section branch | merged | #197 | Second publish updates the same PR (SHA-256 of sectionId). |
| 4 | #51 | Stale-token modal copy | merged | #191 | RequestError classified by status + URL match. |
| 5 | #52 | Hero diff summariser | merged | #195 | Pure function powers the PR body bullets. |

## Phase 9: SEO surface (closed)

| # | Issue | Title (short) | Status | PR | Outcome |
| - | ----- | ------------- | ------ | -- | ------- |
| 1 | #56 | Manifest theme_color from brand 500 token | merged | #201 | oklch -> hex helper at lib/seo/brand-colors.ts. |
| 2 | #55 | 9 legacy paths 308 to home anchors | merged | #202 | lib/seo/redirects.ts + next.config redirects(). |
| 3 | #53 | /api/og home OG image | merged | #203 | Self-hosted Fraunces + JetBrains Mono TTFs; force-dynamic. |
| 4 | #54 | /api/og/[slug] per-project OG | merged | #204 | Per-project card + generateMetadata on case study. |
| 5 | #57 | Rich-results JSON-LD adds image + genre | merged | #205 | Person.image + CreativeWork.image + genre. |

## Phase 10: Contact, analytics, error monitoring (closed)

| # | Issue | Title (short) | Status | PR | Outcome |
| - | ----- | ------------- | ------ | -- | ------- |
| 1 | #61 | Vercel Web Analytics | merged | #206 | <Analytics /> mounted in root layout. |
| 2 | #62 | Sentry + source maps | merged | #207 | @sentry/nextjs server + client + withSentryConfig wrapper. |
| 3 | #58 | Contact form reveal + Turnstile | merged | #208 | Reveal pill + widget; route stub. |
| 4 | #59 | Resend + Zod contact handler | merged | #209 | SafeText payload guard; 422/502/503 mapping. |
| 5 | #60 | Server-side Turnstile verification | merged | #210 | siteverify + timeout-or-duplicate -> 403. |

## Phase 11: Lighthouse CI budget gate (closed)

| # | Issue | Title (short) | Status | PR | Outcome |
| - | ----- | ------------- | ------ | -- | ------- |
| 1 | #63 | LHCI runs against / on every preview | merged | #211 | .lighthouserc.json + lighthouse.yml.disabled. |
| 2 | #64 | LHCI gates project + deep-dive | merged | #211 | 3 URLs in the same .lighthouserc.json (consolidated). |
| 3 | #65 | Unoptimised PNG demo | deferred | (USER_TODO) | Shipped as a manual exercise in USER_TODO.md. |
| 4 | #66 | LHCI status check on PRs | merged | #211 | pull_request trigger on develop/staging/main. |

## Phase 12: e2e Playwright (closed)

| # | Issue | Title (short) | Status | PR | Outcome |
| - | ----- | ------------- | ------ | -- | ------- |
| 1 | #67 | sign-in.spec runs in CI | merged | #212 | Workflow yml.disabled wires sign-in.spec.ts to deployment_status:success. |
| 2 | #68 | publish-flow spec | merged | #212 | Cookie-warmed admin session edits hero, asserts PR url + branch shape. |
| 3 | #69 | public-smoke spec | merged | #212 | /, /projects/foster-care-platform, /projects/multi-cloud-platform: h1 + og + no console errors. |
| 4 | #70 | Path filters skip docs PRs | merged | #212 | paths-ignore for .md, .mdx, LICENSE, design_handoff_portfolio. |

## Phase 13: Hardening + launch (closed)

| # | Issue | Title (short) | Status | PR | Outcome |
| - | ----- | ------------- | ------ | -- | ------- |
| 1 | #71 | NVDA + VoiceOver landmarks audit | deferred | (USER_TODO) | Manual audit; tracked in USER_TODO.md. |
| 2 | #72 | Real-device matrix | deferred | (USER_TODO) | Manual; tracked in USER_TODO.md. |
| 3 | #73 | DNS cutover davidonasanya.com | deferred | (USER_TODO) | Manual; tracked in USER_TODO.md. |
| 4 | #74 | Production Lighthouse 95+ | deferred | (USER_TODO) | Depends on #73; run via the LHCI workflow once Actions re-enabled. |
| 5 | #75 | Phone-to-live edit under 5 minutes | deferred | (USER_TODO) | Manual; tracked in USER_TODO.md. |
| 6 | #77 | CLAUDE.md skills documentation | merged | this PR | Per-task-type skills table + Sentry/analytics SDK note. |

Phase 13 closed with five issues deferred to the launch checklist (USER_TODO.md) because they are inherently manual or external (screen reader, device matrix, DNS provider, in-person stopwatch).
