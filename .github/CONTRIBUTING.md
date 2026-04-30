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
2. During triage, set: milestone (the phase), `area:*`, `priority:*`, sharpen acceptance criteria, flip to `status:ready`.
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

## Tests

Refer to the test layer for the relevant phase in `implementation-plan.md`. The default expectation per layer:

- Schemas, loaders, slugs, rate-limit, auth helpers, GitHub commit pipeline: strict test-first (Vitest).
- Component logic without animation: Vitest + React Testing Library.
- End-to-end smokes (sign-in, publish-flow, public-smoke): Playwright in CI against the Vercel preview.
- Animations and look-and-feel: manual checklist baked into the PR template.

## Branch protection summary

- **main:** PR required, no direct push, no force push, no deletion, all CI green, `branch-flow-guard` required, `enforce_admins=true`, linear history required.
- **staging:** same as main, but allows merge commits (linear history off) so a `develop -> staging` merge with conflicts can land cleanly.
- **develop:** PR required, cheap CI green (`typecheck`, `lint`, `unit`, `forbidden-chars`, `build`, `branch-flow-guard`).

## CI required checks (final state)

- All three branches: `typecheck`, `lint`, `unit`, `forbidden-chars`, `build`, `branch-flow-guard`.
- `staging` and `main` only: `e2e-smoke`, `e2e-publish`, `lighthouse`, `codeql`.

The list grows phase by phase; see `tech-stack.md` and the `seed-branch-protection.sh` env vars.
