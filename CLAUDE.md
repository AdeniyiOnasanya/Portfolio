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

The `.claude/agents/` directory holds eight role-specific subagents. Reach for them by `subagent_type` via the `Agent` tool:

- `planner`: design implementation plans for non-trivial slices. Calls Context7 for any new or upgraded library.
- `scaffolder`: pure execution against a plan for non-TDD slices.
- `tdd-author`: strict red, green, refactor for slices labelled `tdd:strict` (schemas, auth, GitHub commit pipeline).
- `code-reviewer`: reviews `git diff develop...HEAD` against repo conventions and the Vercel skills.
- `qa-runner`: runs whichever quality gates are wired in `package.json`.
- `security-reviewer`: scans diffs for secret leaks, env misuse, route-handler injection, GitHub-token scope creep.
- `browser-tester`: drives a live Chrome session via `chrome-devtools-mcp` for UI-touching slices. Note: if the agent registry was loaded before the file landed, a Claude Code restart is required to dispatch it.
- `release-manager`: drafts release-PR bodies for `develop -> staging` and `staging -> main`. Never merges.

The PR review contract (`.github/CONTRIBUTING.md`): every non-trivial PR runs `qa-runner`, `code-reviewer`, `security-reviewer` in parallel before opening, plus `browser-tester` whenever the diff touches a UI surface. Each report goes into a collapsible `<details>` block in the PR body. Findings are advisory; the author reconciles.

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
- `pnpm test:e2e`: Playwright e2e tests (config: `playwright.config.ts`, single `chromium` project; `webServer` and `baseURL` arrive in Phase 6 #67).
- `pnpm check:forbidden`: scans `**/*.{ts,tsx,md,mdx,json,css}` for U+2014 and `\p{Extended_Pictographic}`. Same gate runs in CI.
- `pnpm build`: `next build` (Turbopack).

CI (`.github/workflows/ci.yml`) runs the cheap quartet (`typecheck`, `lint`, `build`, `forbidden-chars`) on every PR and push to `develop`, `staging`, `main`. CodeQL (`codeql.yml`) and Dependabot (`.github/dependabot.yml`) run on the same surface. Heavier gates (e2e, lighthouse) join in Phases 11 and 12.

## Git identity

Set repo-local git author to match the GitHub account on the Vercel team allowlist. Without this, Vercel previews fail with `Git author ... must have access to the project`. Future docs slice (#108) will codify this in `.github/CONTRIBUTING.md`. For now, the override lives in `.git/config`:

```
git config --local user.name "AdeniyiOnasanya"
git config --local user.email "98977109+AdeniyiOnasanya@users.noreply.github.com"
```

## Where to look

- `project-scope.md`: what is being built and why.
- `tech-stack.md`: locked technical decisions, including the env var list.
- `implementation-plan.md`: phased build plan and verification per phase.
- `phase-slices.md`: the issue source list (one slice per closeable PR).
- `guide.md`: daily flow, promotion rules, milestone close-out checklist.
- `.github/CONTRIBUTING.md`: branch model, PR conventions, and the multi-agent review contract.
- `.github/PROJECT.md`: project board view spec.
- `.claude/agents/`: eight role-specific subagents listed above.
- `scripts/github/README.md`: setup script run order and Vercel hookup steps.
