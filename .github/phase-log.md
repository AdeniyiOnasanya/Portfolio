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

## Phase 4: Public site shell (next)

Issue numbers and rows added when the first Phase 4 slice is picked up.
