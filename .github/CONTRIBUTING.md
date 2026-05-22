# Contributing

Solo build. These rules keep the repo reviewable, the deploys safe, and the audit trail clean.

## Required reading

- `project-scope.md`: what is being built and why.
- `tech-stack.md`: locked technical decisions.
- `implementation-plan.md`: phased build plan; new work belongs to a phase milestone.

## First-time setup (every fresh clone)

Vercel deploys this project under a team allowlist. The allowlist is checked against the **commit author**, not the push credential. If a commit lands authored by an account that is not on the allowlist, the preview deployment fails with `Git author <name> must have access to the project on Vercel to create deployments.` (this happened on PR #102).

A global `~/.gitconfig` `user.name` and `user.email` will not be the allowlisted account on most machines, so every fresh clone needs a repo-local override. Set it once, immediately after cloning:

```bash
git config --local user.name  "<your-github-account-name>"
git config --local user.email "<your-no-reply-email>"
```

Where:

- `<your-github-account-name>` is the GitHub username on the Vercel team allowlist (the same handle that appears as the project owner on Vercel).
- `<your-no-reply-email>` is the no-reply address GitHub generates for that account, copied verbatim from `https://github.com/settings/emails` (look for "Keep my email addresses private" and the address shown beside it). The form is `<id>+<account-name>@users.noreply.github.com`.

Do not commit the literal values into any tracked file, issue body, PR body, or commit message. They live only in `.git/config`, which is per-clone and untracked.

To verify the override is in place before pushing:

```bash
git config --local user.name
git config --local user.email
git log -1 --format='%an <%ae>'
```

The first two should print the values you set; the third confirms the most recent commit was authored as expected.

## Hard rules

- No em-dash (U+2014) anywhere in code, content, comments, commit messages, issues, or PR text. Use commas, periods, semicolons, parentheses, or colons.
- No emoji anywhere.
- Every change ships through the chain: `feature/<n>_<slug> -> develop -> staging -> main`. No direct push to any of the three protected branches. No auto-merge. No force-push. No hotfixes.
- Every animation honours `prefers-reduced-motion`.
- No AI-attribution trailers anywhere: never write `Co-Authored-By: Claude`, `Generated with Claude Code`, or any equivalent line in commit messages, PR or issue bodies, or code comments. Work is attributed to the human author.
- **`design_handoff_portfolio/` is the source of truth for every UI surface.** Before planning, implementing, or reviewing a UI-touching slice, read the relevant files in `design_handoff_portfolio/design/{index.html, app.jsx, project.jsx, shared.jsx, styles.css, enhancements.jsx, data.js}`. Mirror named CSS classes, font-variation axes, hover states, animation timings, alpha values, and DOM structure exactly. The PR body must cite the design file paths plus line ranges the change mirrors (the PR template's manual checklist enforces this). The live app catches up to the design files; the design files never catch up to the live app.

## Branch model

| Branch | Source of merges | Vercel deploy |
|---|---|---|
| `feature/<n>_<slug>` (also `fix/`, `content/`, `chore/`, `docs/`, `dependabot/...`) | branched off `develop` (Dependabot branches are auto-named) | per-PR auto preview URL |
| `develop` | feature/fix/content/chore/docs/dependabot PRs only | per-push auto preview URL |
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

Every non-trivial PR runs a multi-agent review pass before it opens. By default this is orchestrated by the `slice-runner` subagent (see "Slice dispatch" below); the calling session does not run the reviewers by hand. When the slice-runner fans out, it dispatches each reviewer in parallel against `git diff develop...HEAD`:

1. **`qa-runner`** runs whichever quality gates are wired in `package.json` (`pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm test`, etc.). Missing scripts are skipped, never failed.
2. **`code-reviewer`** flags blockers, warnings, and suggestions against repo conventions, the installed Vercel agent skills, and React/Next.js best practices.
3. **`security-reviewer`** scans the diff for secret leaks, env misuse, route-handler injection, auth allowlist correctness, Zod boundary checks, GitHub-token scope creep, and dangerous file ops in `lib/github/*`.
4. **`browser-tester`** drives a live Chrome session via the `chrome-devtools-mcp` server, walks the golden path on the running dev server (`/` plus any route the diff touches), captures console messages, verifies reduced-motion handling, checks keyboard focus, and screenshots each route. Required whenever the diff touches a UI surface (`app/`, `components/`, `tokens.css`, anything that renders to a page). Skipped for slices that ship no UI surface (workflow YAML, scripts, agent definitions, docs only).

The PR body opens with `Closes #N` and includes one collapsible `<details>` block per dispatched subagent containing each report verbatim. Findings are advisory; the author reconciles. The reviewer subagents do not block the merge button.

Each reviewer subagent pins a model in its frontmatter (`qa-runner` Haiku 4.5; `code-reviewer`, `security-reviewer`, `browser-tester` Sonnet 4.6). Before promoting `staging` to `main`, escalate `security-reviewer` to Opus by passing `model: 'opus'` to the `Agent` dispatch; the cheap PR pass stays on Sonnet.

Trivial slices may skip the review pass. A slice is trivial if it changes no executable code, no workflow YAML, no schema, and no auth or GitHub-pipeline surface (typo fixes, label tweaks, single-line doc edits).

Strict TDD slices carry the `tdd:strict` label, applied during triage when the Task form's "TDD strict?" dropdown is set to `yes` (typically slices in `implementation-plan.md` Phases 1, 3, 6, 8). Those slices route to the `tdd-author` subagent (dispatched by `slice-runner` for that step) rather than running inline. Red, green, refactor is mechanical: no implementation file may be edited until a failing test exists in the working tree.

## Slice dispatch

The default unit of work is one `phase-slices.md` slice = one closed issue = one PR, shipped end to end by the `slice-runner` subagent. The calling session does not load slice internals; it dispatches the runner and consumes its five-line summary.

1. **Pick the slice.** Read `.github/phase-log.md` and choose the next `open` row in the current phase.
2. **Dispatch.** Call `slice-runner` via the `Agent` tool with one input, e.g. `Ship issue #21. Target develop.`. The runner discovers acceptance criteria, branches, implements (delegating to `tdd-author` for `tdd:strict` slices), runs gates via `qa-runner`, pushes, fans `code-reviewer` / `security-reviewer` / `browser-tester` out in parallel, composes the PR body, and opens the PR against `develop`.
3. **Update the phase log.** Append the runner's five-line summary as a row update in `.github/phase-log.md` (status `merged` once the PR lands, with the PR number and outcome).

Trivial slices and one-off chores can be authored inline without the runner, but every non-trivial slice should route through it so context budget stays at the phase level.

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
