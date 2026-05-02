# Phase log

Track per-phase slice progress. `slice-runner` updates the row for the slice it shipped; the main thread reads this file to pick the next slice.

## Phase 3: Content schema, loaders, seed content

| # | Issue | Title (short) | Status | PR | Outcome |
| - | ----- | ------------- | ------ | -- | ------- |
| 1 | #17 | Zod schemas for site content | merged | (back-fill) | Schemas landed. |
| 2 | #18 | Seven project MDX files | merged | #128 | Seed content shipped. |
| 3 | #19 | site.json projects[] is ordered slug list | merged | (back-fill) | Single source of truth. |
| 4 | #20 | Slug normaliser | merged | #129 | kebab-case + reserved guard. |
| 5 | #21 | safeText U+2014 / emoji refinement | open  | ,  | ,  |
| 6 | #22 | Typed loader memoisation | open  | ,  | ,  |
