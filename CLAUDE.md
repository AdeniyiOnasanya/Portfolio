# Notes for Claude (and other AI coding agents)

This repo is a Next.js 16 / TypeScript / pnpm portfolio for David Onasanya. The full plan is in `implementation-plan.md`; the day-to-day operator's manual is in `guide.md`.

## Hard rules (apply to every change)

- No em-dash (U+2014) anywhere: code, content, comments, commit messages, issue and PR text. Use commas, periods, semicolons, parentheses, or colons.
- No emoji anywhere.
- Every change ships through `feature/<n>_<slug> -> develop -> staging -> main`. No skipping. No hotfixes.
- No auto-merge. No force-push. No direct push to `develop`, `staging`, or `main`. There is no plan to upgrade to GitHub Pro (issues #3 and #76 closed), so server-side branch protection cannot be enforced. The rule lives in the developer's hand and is reinforced by the `branch-flow-guard` workflow as a soft visible check.
- Every animation honours `prefers-reduced-motion`.
- No AI-attribution trailers anywhere: never write `Co-Authored-By: Claude`, `Generated with Claude Code`, or any equivalent line in commit messages, PR or issue bodies, or code comments. Work is attributed to the human author.
- **`design_handoff_portfolio/` is the source of truth for every UI surface.** Before planning, implementing, or reviewing a UI-touching slice, read the relevant files in `design_handoff_portfolio/design/{index.html, app.jsx, project.jsx, shared.jsx, styles.css, enhancements.jsx, data.js}`. Mirror named CSS classes, font-variation axes, hover states, animation timings, alpha values, and DOM structure exactly. The live app catches up to the design files; the design files never catch up to the live app. Drift discovered after the fact (opaque vs translucent fills, missing hover states, swapped class names) blocks merge until the design path is the one that won.

## Vercel agent skills installed for this project

The `vercel-labs/agent-skills` set is loaded. Per-task-type preferences below; reach for the skill that matches the surface you are touching:

| Task type | Primary skill | Secondary | Notes |
| --- | --- | --- | --- |
| New page or React component | `react-best-practices` | `web-design-guidelines` | Server/client split, re-render discipline, bundle hygiene; pair with the design-guidelines pass when any new pixels ship. |
| UI review pass | `web-design-guidelines` | `react-best-practices` | Reduced-motion, focus-visible, tabular-nums, curly quotes, OG typography. |
| Cinematic / animation slice | `react-view-transitions` | `web-design-guidelines` | Intro fade, project row morph, before/after slider, list reorder. Always pair with the reduced-motion guard. |
| Admin editor primitive | `composition-patterns` | `react-best-practices` | The ten editors share four primitives; the composition skill keeps the surface reviewable. |
| OG image route (`/api/og`) | `react-best-practices` | `web-design-guidelines` | Satori subset of CSS only; pair the design skill for the typography rules that mirror the home page. |
| Contact / Auth / Resend slices | `react-best-practices` | n/a | Server-only handlers; the design skill does not apply. |
| Lighthouse + e2e workflow YAML | n/a | n/a | No skill mapping; treat as plain CI work. Path filters and concurrency are the only knobs. |

`vercel-deploy-claimable` is available but rarely needed (production deploys go through merges to `main`). `react-native-guidelines` is skipped (web only). The Sentry + analytics wiring uses `@sentry/nextjs` and `@vercel/analytics` directly with Context7 docs rather than a packaged skill, since both are SDK installs not UX patterns.

## Subagents installed in this repo

The `.claude/agents/` directory holds six role-specific subagents. Each pins a model in its frontmatter so token spend stays bounded. Reach for them by `subagent_type` via the `Agent` tool:

- `slice-runner` (Opus 4.7): ships a single `phase-slices.md` slice end to end from one issue number. Owns branch hygiene, implementation (delegates to `tdd-author` for `tdd:strict` slices, otherwise writes the code itself), local gates, push, parallel reviewer fan-out, and PR open. Returns a five-line summary so the calling session never loads slice internals. Pinned to Opus because for non-`tdd:strict` slices it is the implementation author, not just an orchestrator.
- `tdd-author` (Sonnet 4.6): strict red, green, refactor for slices labelled `tdd:strict` (schemas, auth, GitHub commit pipeline).
- `code-reviewer` (Sonnet 4.6): reviews `git diff develop...HEAD` against repo conventions and the Vercel skills.
- `qa-runner` (Haiku 4.5): runs whichever quality gates are wired in `package.json`. Mechanical script runner with structured output; Haiku is the right tier.
- `security-reviewer` (Sonnet 4.6): scans diffs for secret leaks, env misuse, route-handler injection, GitHub-token scope creep.
- `browser-tester` (Sonnet 4.6): drives a live Chrome session via `chrome-devtools-mcp` for UI-touching slices. Note: if the agent registry was loaded before the file landed, a Claude Code restart is required to dispatch it.

**Model overrides at dispatch time.** When a single dispatch genuinely needs a stronger model than the agent's pin, pass a `model` argument to the `Agent` tool. Two known cases: (1) the deep `security-reviewer` pass before promoting `staging` to `main`, escalated to `model: 'opus'`; (2) a `tdd-author` slice that turns out to be unusually hard, also escalated to `model: 'opus'`. The agent file's pinned default stays untouched.

## Phase command protocol

The user drives the AI agent with three commands. Recognise them verbatim and respond exactly as described.

- **`Start Phase N`**: produce a full plan for every slice in Phase N (format below), then implement and open PRs in dependency order.
- **`Plan Phase N`**: produce the plan only; do not write code, do not branch, do not push.
- **`Work on Slice X of Phase N`**: isolate that single slice end to end. Skip the phase-wide plan; jump to dispatch.

### Plan format per slice

Emit the following six fields for every slice before any code is written. The output is read by the user to approve the plan, so be terse and consistent.

1. **Slice ID + title** (e.g. `#25 sitemap.xml + robots.txt`).
2. **Implements**: one sentence on the observable outcome.
3. **Depends on**: comma-separated slice numbers, or `none`.
4. **Branch base**: `develop` by default; `feature/<dep>_<slug>` when a dependency is unmerged but stable.
5. **Parallel group**: `A`, `B`, `C`, ... slices in the same group run in parallel; later groups wait for earlier groups to merge.
6. **Design handoff anchors**: file paths plus line ranges in `design_handoff_portfolio/design/` that this slice mirrors (e.g. `styles.css#L68-L101 (.cursor-dot/.cursor-ring), shared.jsx#L5-L49 (CustomCursor)`), or `n/a` for slices that ship no UI surface (workflow YAML, schemas, scripts, docs only). The slice cannot enter implementation until this field is filled in.

### Implementation order

- Build a DAG from the `Depends on` fields. Slices with no dependencies form Group A and dispatch in parallel via separate `slice-runner` calls.
- Slices that depend on Group A wait until those PRs merge, then re-base off refreshed `develop` and dispatch as Group B. Repeat per group.
- If a dependency is stable but unmerged (e.g. parent PR is in review), a child slice may branch off the parent branch instead of `develop`. The child's PR body must list the parent as `Blocked by: #X`.
- If during implementation a slice reveals a hidden dependency, stop, flag it to the user, and wait for the dependency to ship before resuming.

## How slices ship

The main session stays focused on the **phase**, not the slice. Per-slice work routes through `slice-runner`:

0. **For UI-touching slices, read the design handoff first.** Grep `design_handoff_portfolio/design/` for the components, classes, or interactions the slice will touch, and capture the file paths plus line ranges in the plan's "Design handoff anchors" field. Slice-runner refuses to start implementing a UI slice without this field filled in. For non-UI slices (schema, workflow, script, doc), record `n/a` and move on.
1. Read `.github/phase-log.md` to pick the next `open` row in the current phase.
2. Dispatch `slice-runner` with one input, e.g. `"Ship issue #21. Target develop."`. The slice-runner discovers acceptance criteria, branches, implements, runs gates, fans reviewers out in parallel, and opens the PR.
3. Append the returned five-line summary as a row update in `.github/phase-log.md`. Move to the next slice.

The reviewer fan-out (`qa-runner`, `code-reviewer`, `security-reviewer`, plus `browser-tester` for UI surfaces) happens inside `slice-runner`. Each report goes into a collapsible `<details>` block in the PR body. Findings are advisory; the author reconciles. The `browser-tester` agent's golden path now includes a side-by-side parity check against the design files cited in the slice's "Design handoff anchors" field; any drift it surfaces (opaque vs translucent fills, missing hover states, swapped class names, missing font-variation axes) is treated as P1 and fixed inline before merge.

## PR body template

PR descriptions open with a single `## Summary` section (a few sentences explaining the slice for a future reader). Then `## Verification` table, `## Target branch checklist`, `## Context7` if libraries were touched, `## Reviews` with three or four collapsible report blocks, then `Closes #N`. Do not split into separate `Why` and `What` headings; keep the rationale and the file-level summary in one block.

The `## Summary` block also carries three required lines (additions to the existing summary prose, not replacements):

- **Implements**: what the slice ships, one sentence.
- **Cut from**: the branch this PR was branched off (e.g. `develop`, or `feature/25_sitemap-robots` when stacked on a parent).
- **Blocked by**: comma-separated PR numbers that must merge before this one can merge. Omit the line entirely if the slice has no parent PR.

## Library setup discipline

When introducing or upgrading a library (Next.js, Tailwind, Auth.js, Drizzle, Resend, Vercel Blob, Octokit, sharp, dnd-kit, cmdk, react-view-transitions, @next/og, lhci, etc.), use Context7 first:

1. `mcp__context7__resolve-library-id` with the library name.
2. `mcp__context7__query-docs` with the resolved id and a specific question (install command, config shape, migration notes).
3. Cite the library id in the issue body or PR description.

Do not rely on training data for library steps; versions and best practices change.

## Local quality gates

All gates run via pnpm scripts and must exit 0 before opening a PR:

- `pnpm typecheck`: `tsc --noEmit`.
- `pnpm lint`: Biome 2.x check.
- `pnpm format:check`: Biome formatter check (use `pnpm format` to apply).
- `pnpm test`: Vitest unit tests (config: `vitest.config.mts`, Node environment, `e2e/**` excluded).
- `pnpm test:e2e`: Playwright e2e tests (config: `playwright.config.ts`, single `chromium` project). Lands with PR #113; `webServer` and `baseURL` plumbing arrives in Phase 6 #67.
- `pnpm check:forbidden`: scans `**/*.{ts,tsx,md,mdx,json,css}` for U+2014 and `\p{Extended_Pictographic}`. Same gate runs in CI.
- `pnpm build`: `next build` (Turbopack).

CI (`.github/workflows/ci.yml`) runs four cheap jobs on every PR and push to `develop`, `staging`, `main`: `typecheck`, `lint`, `build`, `forbidden-chars`. CodeQL (`codeql.yml`) and Dependabot (`.github/dependabot.yml`) are in flight as PRs #115 and #114 and run on the same surface once merged. Heavier gates (e2e, lighthouse) join in Phases 11 and 12.

## Git identity

Commits in this repo must be authored by the GitHub account on the Vercel team allowlist, otherwise previews fail with `Git author ... must have access to the project`. Set the override at the repo level via `git config --local user.name` and `git config --local user.email` using the no-reply address shown at `https://github.com/settings/emails`. Keep the actual values out of every tracked file, every issue body, every PR body, and every commit message. Future docs slice (#108) describes the pattern in `.github/CONTRIBUTING.md` without embedding personal values.

## Where to look

- `project-scope.md`: what is being built and why.
- `tech-stack.md`: locked technical decisions, including the env var list.
- `implementation-plan.md`: phased build plan and verification per phase.
- `phase-slices.md`: the issue source list (one slice per closeable PR).
- `guide.md`: daily flow, promotion rules, milestone close-out checklist.
- `.github/CONTRIBUTING.md`: branch model, PR conventions, and the multi-agent review contract.
- `.github/PROJECT.md`: project board view spec.
- `.claude/agents/`: five role-specific subagents listed above.
- `scripts/github/README.md`: setup script run order and Vercel hookup steps.
