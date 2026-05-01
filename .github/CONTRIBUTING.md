# Contributing

Solo build. These rules keep the repo reviewable, the deploys safe, and the audit trail clean.

## Required reading

- `project-scope.md`: what is being built and why.
- `tech-stack.md`: locked technical decisions.
- `implementation-plan.md`: phased build plan; new work belongs to a phase milestone.

## Hard rules

- No em-dash (U+2014) anywhere in code, content, comments, commit messages, issues, or PR text. Use commas, periods, semicolons, parentheses, or colons.
- No emoji anywhere.
- Every change ships through the chain: `feature/<n>_<slug> -> develop -> staging -> main`. No direct push to any of the three protected branches. No auto-merge. No force-push. No hotfixes.
- Every animation honours `prefers-reduced-motion`.
- No AI-attribution trailers anywhere: never write `Co-Authored-By: Claude`, `Generated with Claude Code`, or any equivalent line in commit messages, PR or issue bodies, or code comments. Work is attributed to the human author.

## Branch model

| Branch | Source of merges | Vercel deploy |
|---|---|---|
| `feature/<n>_<slug>` (also `fix/`, `content/`, `chore/`, `docs/`) | branched off `develop` | per-PR auto preview URL |
| `develop` | feature/fix/content/chore/docs PRs only | per-push auto preview URL |
| `staging` | `develop` PRs only | `staging.davidonasanya.com` |
| `main` | `staging` PRs only | `davidonasanya.com` (production) |

Branch off `develop`. Never branch off `staging` or `main`.

## Branch naming

`<type>/<issue-number>_<short-slug>` where `<type>` is one of `feature`, `fix`, `content`, `chore`, `docs`.

Examples:
- `feature/42_signin-happy-path`
- `fix/91_drag-renumber-off-by-one`
- `content/108_stratus-case-study`

The slug is a kebab-case fragment of the issue title, max 40 characters. Phase number lives in the milestone, not the branch.

## Issue workflow

1. Open an issue from a template (`task`, `bug`, `content`, `content-gap`). Default labels apply.
2. During triage, set: milestone (the phase), `area:*`, `priority:*`, sharpen acceptance criteria, flip to `status:ready`. If the Task form's "TDD strict?" dropdown is set to `yes`, also apply the `tdd:strict` label so the `tdd-author` subagent picks it up.
3. To pick up: create a branch off `develop`, set the issue's project Status to `In Progress`.
4. Open a PR against `develop` with `Closes #N` in the body.
5. CI green, manual checklist done, merge by hand. Issue auto-closes.

## Promotion checklist

- **`develop -> staging`:** open the PR when develop has tested feature work and you intend to ship it to a wider audience.
  - Title: `release: develop -> staging YYYY-MM-DD`.
  - Body lists the issues being promoted (each as `Closes #N` if not already closed).
  - On merge, Vercel deploys to `staging.davidonasanya.com`. Verify there before promoting further.

- **`staging -> main`:** open the PR when staging has been verified end-to-end on `staging.davidonasanya.com`.
  - Title: `release: staging -> main YYYY-MM-DD`.
  - Body lists the staging-tested issues and what verification was done.
  - On merge, Vercel deploys production at `davidonasanya.com`.

## Commit and PR conventions

- PR title mirrors the issue title (`task: ...`, `bug: ...`, `content: ...`), or for promotion PRs uses the `release:` prefix above.
- PR body opens with `Closes #N`. Use `Refs #N` for related but not closing.
- Conventional commit subjects on the squash-merge default.
- No em-dash, no emoji in any commit message, PR title, or PR body.
- No AI-attribution trailers in commits, PR bodies, or issue bodies. The author is the human running the workflow.

## PR review contract

Every non-trivial PR runs a multi-agent review pass before it opens. The author dispatches each subagent in parallel against `git diff develop...HEAD`:

1. **`qa-runner`** runs whichever quality gates are wired in `package.json` (`pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test`, etc.). Missing scripts are skipped, never failed.
2. **`code-reviewer`** flags blockers, warnings, and suggestions against repo conventions, the installed Vercel agent skills, and React/Next.js best practices.
3. **`security-reviewer`** scans the diff for secret leaks, env misuse, route-handler injection, auth allowlist correctness, Zod boundary checks, GitHub-token scope creep, and dangerous file ops in `lib/github/*`.
4. **`browser-tester`** drives a live Chrome session via the `chrome-devtools-mcp` server, walks the golden path on the running dev server (`/` plus any route the diff touches), captures console messages, verifies reduced-motion handling, checks keyboard focus, and screenshots each route. Required whenever the diff touches a UI surface (`app/`, `components/`, `tokens.css`, anything that renders to a page). Skipped for slices that ship no UI surface (workflow YAML, scripts, agent definitions, docs only).

The PR body opens with `Closes #N` and includes one collapsible `<details>` block per dispatched subagent containing each report verbatim. Findings are advisory; the author reconciles. The reviewer subagents do not block the merge button.

Trivial slices may skip the review pass. A slice is trivial if it changes no executable code, no workflow YAML, no schema, and no auth or GitHub-pipeline surface (typo fixes, label tweaks, single-line doc edits).

Strict TDD slices carry the `tdd:strict` label, applied during triage when the Task form's "TDD strict?" dropdown is set to `yes` (typically slices in `implementation-plan.md` Phases 1, 3, 6, 8). Those slices route to the `tdd-author` subagent rather than running inline in the main session. Red, green, refactor is mechanical: no implementation file may be edited until a failing test exists in the working tree.

## Tests

Refer to the test layer for the relevant phase in `implementation-plan.md`. The default expectation per layer:

- Schemas, loaders, slugs, rate-limit, auth helpers, GitHub commit pipeline: strict test-first (Vitest).
- Component logic without animation: Vitest + React Testing Library.
- End-to-end smokes (sign-in, publish-flow, public-smoke): Playwright in CI against the Vercel preview.
- Animations and look-and-feel: manual checklist baked into the PR template.

## Branch protection summary

GitHub Free does not allow branch protection on private repos. Until the repo is on GitHub Pro (or made public), the rules below are **convention plus a soft check**: `branch-flow-guard` runs on every PR and shows a red X on a non-conforming pair, but the merge button is not blocked. The chain holds because the developer follows it; the workflow is the tripwire.

When the repo upgrades to GitHub Pro or goes public, run `bash scripts/github/seed-branch-protection.sh` and the rules below activate as enforced server-side gates.

Target rules (active once protection is enabled):

- **main:** PR required, no direct push, no force push, no deletion, all CI green, `branch-flow-guard` required, `enforce_admins=true`, linear history required.
- **staging:** same as main, but allows merge commits (linear history off) so a `develop -> staging` merge with conflicts can land cleanly.
- **develop:** PR required, cheap CI green (`typecheck`, `lint`, `unit`, `forbidden-chars`, `build`, `branch-flow-guard`).

## CI required checks (final state)

- All three branches: `typecheck`, `lint`, `unit`, `forbidden-chars`, `build`, `branch-flow-guard`.
- `staging` and `main` only: `e2e-smoke`, `e2e-publish`, `lighthouse`, `codeql`.

The list grows phase by phase; see `tech-stack.md` and the `seed-branch-protection.sh` env vars.
