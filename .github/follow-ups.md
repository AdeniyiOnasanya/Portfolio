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

### F5: Sanitise SafeText HTML before the admin CMS goes live

Source: PR #138, code-reviewer warning 4.

Problem: `SafeText` rejects U+2014 and `\p{Extended_Pictographic}` but does not strip or allowlist HTML tags. `aiPractice.headline` is rendered with `dangerouslySetInnerHTML` so the inline `<em>` is preserved. The current source is repo-controlled (`content/site.json` behind PR review), so the residual XSS surface is essentially nil today. Once Phase 7 onward lets the admin CMS write to `headline`, an authenticated editor could inject `<script>` or event-handler attributes.

Recommended fix: extend `lib/text/safeText.ts` with a tag-allowlist refinement (e.g. `em`, `strong`, `code` only; reject anything else) at parse time. A lightweight regex check is sufficient; a full DOMPurify is not required because the surface is small and the schema runs server-side. Land before the admin CMS ships.

Priority: P2, must land before Phase 7 (admin CMS).

### F6: Use `vi.mocked` instead of `as unknown as` casts in test helpers

Source: PR #138, code-reviewer warning 1.

Problem: `app/(public)/__tests__/page.test.tsx` uses `loadSite as unknown as ReturnType<typeof vi.fn>` to get a typed mock handle. The double cast bypasses TypeScript: if `loadSite`'s signature changes (return type, parameter list), nothing here will catch the drift.

Recommended fix: replace with `vi.mocked(loadSite)` after the `vi.mock(...)` call. Apply the same pattern to `lib/__tests__/content.test.ts` and any other test that double-casts mocked imports.

Priority: P3.

### F7: Confirm `afterEach(cleanup)` in vitest.setup.ts is needed

Source: PR #138, code-reviewer suggestion 8.

Problem: `@testing-library/react` v16+ may auto-call `cleanup` after each test when it detects Vitest's globals. The explicit `afterEach(cleanup)` in `vitest.setup.ts` may be redundant. The reviewer noted: "If there is a specific reason it was kept, e.g. observed double-render artefacts in happy-dom, document it." This slice originally added it because tests failed without it (Hero saw "multiple regions named Ada Lovelace" before the explicit cleanup landed), so removing it without verification would regress.

Recommended fix: write a tiny diagnostic test that renders twice without manual cleanup and assert the DOM is empty between tests; if it passes, drop the explicit `afterEach`. Otherwise leave the call in place and add a one-line comment in the setup file pointing at this follow-up.

Priority: P3.

## Closed

(none yet)
