# Notes for Claude (and other AI coding agents)

This repo is a Next.js 16 / TypeScript / pnpm portfolio for David Onasanya. The full plan is in `implementation-plan.md`; the day-to-day operator's manual is in `guide.md`.

## Hard rules (apply to every change)

- No em-dash (U+2014) anywhere: code, content, comments, commit messages, issue and PR text. Use commas, periods, semicolons, parentheses, or colons.
- No emoji anywhere.
- Every change ships through `feature/<n>_<slug> -> develop -> staging -> main`. No skipping. No hotfixes.
- No auto-merge. No force-push. No direct push to `develop`, `staging`, or `main`. There is no plan to upgrade to GitHub Pro (issues #3 and #76 closed), so server-side branch protection cannot be enforced. The rule lives in the developer's hand and is reinforced by the `branch-flow-guard` workflow as a soft visible check.
- Every animation honours `prefers-reduced-motion`.
- No AI-attribution trailers anywhere: never write `Co-Authored-By: Claude`, `Generated with Claude Code`, or any equivalent line in commit messages, PR or issue bodies, or code comments. Work is attributed to the human author.

## Vercel agent skills installed for this project

The `vercel-labs/agent-skills` set is loaded. Skills the agent should reach for during work on this repo:

- `react-best-practices`: every Next.js page or React component. Server/client split, re-render discipline, bundle hygiene.
- `web-design-guidelines`: every UI review pass. Reduced-motion, focus-visible, tabular-nums, curly quotes, OG typography.
- `react-view-transitions`: cinematic intro, project-row to case-study morph, before/after slider, list reorder animations.
- `composition-patterns`: the admin editor surface (ten editors share four primitives).

`vercel-deploy-claimable` is available but rarely needed (production deploys go through merges to `main`). `react-native-guidelines` is skipped (web only).

## Subagents installed in this repo

The `.claude/agents/` directory holds six role-specific subagents. Reach for them by `subagent_type` via the `Agent` tool:

- `slice-runner`: ships a single `phase-slices.md` slice end to end from one issue number. Owns branch hygiene, implementation (delegates to `tdd-author` for `tdd:strict` slices), local gates, push, parallel reviewer fan-out, and PR open. Returns a five-line summary so the calling session never loads slice internals.
- `tdd-author`: strict red, green, refactor for slices labelled `tdd:strict` (schemas, auth, GitHub commit pipeline).
- `code-reviewer`: reviews `git diff develop...HEAD` against repo conventions and the Vercel skills.
- `qa-runner`: runs whichever quality gates are wired in `package.json`.
- `security-reviewer`: scans diffs for secret leaks, env misuse, route-handler injection, GitHub-token scope creep.
- `browser-tester`: drives a live Chrome session via `chrome-devtools-mcp` for UI-touching slices. Note: if the agent registry was loaded before the file landed, a Claude Code restart is required to dispatch it.

## How slices ship

The main session stays focused on the **phase**, not the slice. Per-slice work routes through `slice-runner`:

1. Read `.github/phase-log.md` to pick the next `open` row in the current phase.
2. Dispatch `slice-runner` with one input, e.g. `"Ship issue #21. Target develop."`. The slice-runner discovers acceptance criteria, branches, implements, runs gates, fans reviewers out in parallel, and opens the PR.
3. Append the returned five-line summary as a row update in `.github/phase-log.md`. Move to the next slice.

The reviewer fan-out (`qa-runner`, `code-reviewer`, `security-reviewer`, plus `browser-tester` for UI surfaces) happens inside `slice-runner`. Each report goes into a collapsible `<details>` block in the PR body. Findings are advisory; the author reconciles.

## PR body template

PR descriptions open with a single `## Summary` section (a few sentences explaining the slice for a future reader). Then `## Verification` table, `## Target branch checklist`, `## Context7` if libraries were touched, `## Reviews` with three or four collapsible report blocks, then `Closes #N`. Do not split into separate `Why` and `What` headings; keep the rationale and the file-level summary in one block.

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
