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
