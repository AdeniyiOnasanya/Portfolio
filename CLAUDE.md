# Notes for Claude (and other AI coding agents)

This repo is a Next.js 16 / TypeScript / pnpm portfolio for David Onasanya. The full plan is in `implementation-plan.md`; the day-to-day operator's manual is in `guide.md`.

## Hard rules (apply to every change)

- No em-dash (U+2014) anywhere: code, content, comments, commit messages, issue and PR text. Use commas, periods, semicolons, parentheses, or colons.
- No emoji anywhere.
- Every change ships through `feature/<n>_<slug> -> develop -> staging -> main`. No skipping. No hotfixes.
- No auto-merge. No force-push. No direct push to a protected branch (once GitHub Pro flips classic protection on; until then the rule is honoured by hand).
- Every animation honours `prefers-reduced-motion`.

## Vercel agent skills installed for this project

The `vercel-labs/agent-skills` set is loaded. Skills the agent should reach for during work on this repo:

- `react-best-practices`: every Next.js page or React component. Server/client split, re-render discipline, bundle hygiene.
- `web-design-guidelines`: every UI review pass. Reduced-motion, focus-visible, tabular-nums, curly quotes, OG typography.
- `react-view-transitions`: cinematic intro, project-row to case-study morph, before/after slider, list reorder animations.
- `composition-patterns`: the admin editor surface (ten editors share four primitives).

`vercel-deploy-claimable` is available but rarely needed (production deploys go through merges to `main`). `react-native-guidelines` is skipped (web only).

## Library setup discipline

When introducing or upgrading a library (Next.js, Tailwind, Auth.js, Drizzle, Resend, Vercel Blob, Octokit, sharp, dnd-kit, cmdk, react-view-transitions, @next/og, lhci, etc.), use Context7 first:

1. `mcp__context7__resolve-library-id` with the library name.
2. `mcp__context7__query-docs` with the resolved id and a specific question (install command, config shape, migration notes).
3. Cite the library id in the issue body or PR description.

Do not rely on training data for library steps; versions and best practices change.

## Where to look

- `project-scope.md`: what is being built and why.
- `tech-stack.md`: locked technical decisions, including the env var list.
- `implementation-plan.md`: phased build plan and verification per phase.
- `phase-slices.md`: the issue source list (one slice per closeable PR).
- `guide.md`: daily flow, promotion rules, milestone close-out checklist.
- `.github/CONTRIBUTING.md`: branch model and PR conventions.
- `.github/PROJECT.md`: project board view spec.
- `scripts/github/README.md`: setup script run order and Vercel hookup steps.
