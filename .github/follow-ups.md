# Follow-ups

Non-blocking findings from PR reviews that we agreed to defer rather than land in the originating slice. Each row lives here until it ships its own slice (or is consciously closed as no-action). The format is one section per follow-up so the row text can be lifted verbatim into a new GitHub issue when the time comes.

When a follow-up ships, move its section under `## Closed` with the PR number that resolved it. Do not delete; the trail is the audit.

## Open

### F1: Centralise the U+2014 / Extended_Pictographic regex

Source: PR #132, code-reviewer warning 2.2.

Problem: `lib/text/safeText.ts` declares its own `EM_DASH` and `EMOJI` regexes; `lib/text/forbidden.ts` declares `FORBIDDEN_PATTERN` for the static file scanner. Two files now encode the same forbidden-character policy. If a third class is added (or U+2013 is later promoted to forbidden), both files must be updated in lockstep with no compiler help if one is missed.

Recommended fix: extract the two patterns into named exports from `lib/text/forbidden.ts` (for example `EM_DASH_PATTERN` and `EMOJI_PATTERN`), have `safeText.ts` consume them, and rebuild the existing grouped `FORBIDDEN_PATTERN` from the same primitives.

Priority: P3.

### F2: Tighten `__resetSiteCache` visibility

Source: PR #133, code-reviewer warning 2 and security-reviewer informational 2.

Problem: `lib/content.ts` exports `__resetSiteCache` as a normal named symbol with no compile-time guard. The double-underscore prefix is convention, not a boundary. Anyone with autocomplete on `lib/content` can call it from a server component or route handler and silently invalidate the cache, turning a single misroute into a fan-out of fs reads against `content/site.json`. Blast radius is bounded but worth tightening before app code grows.

Recommended fix, in order of preference:
1. Move the reset into a separate test entry point such as `lib/content.testing.ts`, kept out of any production import graph.
2. Add a Biome `noRestrictedImports` (or equivalent) lint rule that fails CI if anything outside `lib/__tests__/**` imports a symbol prefixed `__`.
3. Add a JSDoc `@internal` tag on the export so it is filtered from public-API surface tooling.

Priority: P2.

### F3: Resolve `SITE_JSON_PATH` inside the reader

Source: PR #133, code-reviewer warning 3.

Problem: `lib/content/site-json.ts` captures `SITE_JSON_PATH = join(process.cwd(), 'content', 'site.json')` at module load. A future test that wants to redirect this to a fixture directory cannot, because the path is captured once at import. Pre-existing shape, not a regression in #22, but the new module makes it a fresh entry point worth flagging.

Recommended fix: resolve the path inside `readSiteFromDisk` instead of at module top-level.

Priority: P3.

### F4: Process lesson, TDD seam-first when the test seam will change

Source: PR #132 code-reviewer warning 2.1 and PR #133 code-reviewer warning 1.

Problem: Both Phase 3 `tdd:strict` slices showed the same drift: the red commit captured one test shape, then the green commit rewrote the test as part of the implementation work. The artefact of the red phase no longer corresponds 1-to-1 to what is verified in green, which weakens the TDD audit trail.

Recommended discipline going forward: when a slice will need a new test seam (a fresh module to mock, a new private function), land the seam refactor first as its own commit (or its own slice), then write the red test against the final shape, then green. No code change required; this entry exists so the lesson is searchable in future planning.

Priority: process note, no PR.

## Closed

(none yet)
