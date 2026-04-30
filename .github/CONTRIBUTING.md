# Contributing

Solo build. These rules keep the repo reviewable and the audit trail clean.

## Required reading

- `project-scope.md`: what is being built and why.
- `tech-stack.md`: locked technical decisions.
- `implementation-plan.md`: phased build plan; new work belongs to a phase milestone.

## Hard rules

- No em-dash (U+2014) anywhere in code, content, comments, commit messages, issues, or PR text. Use commas, periods, semicolons, parentheses, or colons.
- No emoji anywhere.
- Every change ships through a PR against `main`. No direct push. No auto-merge. No force-push.
- Every animation honours `prefers-reduced-motion`.

## Issue workflow

1. Open an issue from a template (`task`, `bug`, `content`, `content-gap`). Default labels apply.
2. During triage, set: milestone (the phase), `area:*`, `priority:*`, sharpen acceptance criteria, flip to `status:ready`.
3. To pick up: create a branch, set the issue's project Status to `In Progress`.
4. Open a PR with `Closes #N` in the body.
5. CI green, manual checklist done, merge by hand.

## Branch naming

`feature/<issue-number>_<short-slug>`

Examples:
- `feature/42_signin-happy-path`
- `feature/57_hero-headline-edit`

The slug is a kebab-case fragment of the issue title, max 40 characters. Phase number lives in the milestone, not the branch.

## Commit and PR conventions

- PR title mirrors the issue title (`task: ...`, `bug: ...`, `content: ...`).
- PR body opens with `Closes #N`. Use `Refs #N` for related but not closing.
- Conventional commit subjects on the squash-merge default.
- No em-dash, no emoji in any commit message, PR title, or PR body.

## Tests

Refer to the test layer for the relevant phase in `implementation-plan.md`. The default expectation per layer:

- Schemas, loaders, slugs, rate-limit, auth helpers, GitHub commit pipeline: strict test-first (Vitest).
- Component logic without animation: Vitest + React Testing Library.
- End-to-end smokes (sign-in, publish-flow, public-smoke): Playwright in CI against the Vercel preview.
- Animations and look-and-feel: manual checklist baked into the PR template.

## CI required checks (final state)

`typecheck`, `lint`, `unit`, `forbidden-chars`, `build`, `e2e-smoke`, `e2e-publish`, `lighthouse`, `codeql`. The list grows phase by phase; see `tech-stack.md`.
