# Development Guide

How this repo is set up, how the day-to-day flow works, and the best way to drive the build to launch. Treat this as the operator's manual; the deeper specs live in `project-scope.md`, `tech-stack.md`, `implementation-plan.md`, and `phase-slices.md`.

---

## What is in place

### Repo and branches

- Three long-lived branches: `develop`, `staging`, `main`. Default branch is `main`.
- All three currently point at the same commit (post-bootstrap).
- Vercel and DNS are not connected yet (issue #4); GitHub Pro is not active (issue #3).

### Issue tracker

- 80 phase-slice issues live, plus the bootstrap issues. 78 open, 2 closed (#5, #78 already shipped). 1 blocked (#3, GitHub Pro).
- Labels: `type:`, `area:`, `phase:`, `priority:`, `status:`. 22 in total. No emoji, no em-dash anywhere.
- Milestones: one per phase, Phase 0 to Phase 13.

### Project board

- Project: `Portfolio Build`, https://github.com/users/AdeniyiOnasanya/projects/1.
- Custom fields: `Phase`, `Priority`, `Estimate`.
- Status options: Triage, Ready, In Progress, Blocked, Done.
- Views (build by hand in the UI per `.github/PROJECT.md`): Backlog, Current Phase, In Review, Done.

### Workflows on `main`

- `branch-flow-guard.yml`: validates the base/head pair on every PR. Currently soft (visible-only) until classic protection is enabled.
- `project-automation.yml`: auto-adds new issues/PRs to the project board, syncs Status from PR linkage, applies a default `area:content` label when a content type is added without an area.

### Hard rules (apply everywhere)

- No em-dash (U+2014). No emoji. Anywhere: code, content, issues, PRs, commits.
- Every change ships through `feature/<n>_<slug> -> develop -> staging -> main`. No skipping. No hotfixes.
- No auto-merge. No force-push. No direct push to a protected branch (once Pro is on).
- Every animation honours `prefers-reduced-motion`.

---

## The flow

```
issue #N (Status: Ready)
      |
      v
git checkout -b feature/N_short-slug    (off develop)
      |
      v
code, commit, push
      |
      v
PR feature/N_<slug> -> develop          (Closes #N in body)
      |
      |  CI runs: typecheck, lint, unit, build, branch-flow-guard
      v
read the diff, click Merge              (issue auto-closes)
      |
      v
... merge more features into develop ...
      |
      v
PR develop -> staging                   (title: release: develop -> staging YYYY-MM-DD)
      |
      |  CI runs cheap + heavy gates (e2e, lighthouse) once Phases 11/12 land
      v
merge -> Vercel deploys staging.davidonasanya.com
      |
      |  verify on staging
      v
PR staging -> main                      (title: release: staging -> main YYYY-MM-DD)
      |
      |  CI runs full gates again
      v
merge -> Vercel deploys davidonasanya.com (production)
```

Branch types allowed off `develop`: `feature/`, `fix/`, `content/`, `chore/`, `docs/`. Each starts with the issue number and a short kebab-case slug.

---

## How to pick up the next slice

1. Open the project board, `Current Phase` view, filter `Phase = 0`.
2. Pick the topmost `Ready` card. P1 first, then P2, then P3. Respect `Depends on` (visible in the body).
3. Set its project Status to `In Progress` and the `status:in-progress` label on the issue.
4. Branch off `develop`:
   ```bash
   git fetch origin
   git checkout develop
   git pull --ff-only
   git checkout -b feature/<n>_<short-slug>
   ```
5. Decide the implementation route:
   - If the issue carries the `tdd:strict` label (slices in `implementation-plan.md` Phases 1, 3, 6, 8), drive the work via the `tdd-author` subagent. Red, green, refactor: write the failing test first, see it fail for the right reason, then write the minimum implementation, then refactor. Do not edit implementation files speculatively.
   - Otherwise drive the work inline in the main session.
6. Do the work in small commits with conventional commit subjects. Run `pnpm typecheck && pnpm build` (and the test runner once Phase 1 lands) before opening the PR.
7. Run the review pass in parallel against `git diff develop...HEAD`: `qa-runner`, `code-reviewer`, `security-reviewer`, plus `browser-tester` whenever the diff touches a UI surface (`app/`, `components/`, `tokens.css`, anything that renders to a page). Address blockers; file follow-ups for non-blocking warnings.
8. Push and open a PR against `develop`. Body opens with `Closes #<n>`, ticks the target-branch checklist, and includes one collapsible `<details>` block per dispatched subagent containing each report verbatim.
9. When CI is green and the review pass reports are clean, read your own diff. Merge. The `auto-close-on-develop` workflow closes the issue; the project Status flips to `Done` via the automation workflow.

### Red, green, refactor (when `tdd:strict`)

The `tdd-author` subagent enforces the loop mechanically:

- **Red.** Write the smallest test that captures the next behaviour. Run the test command. Confirm the test fails for the right reason. Commit the failing test on its own when the slice is large enough to justify separate commits.
- **Green.** Write the minimum implementation to pass. Run the full test command. Confirm green.
- **Refactor.** Clean up without changing behaviour. Re-run tests. Confirm still green.

Hard guardrails: no `.skip`, no `xit`, no widening of an existing test to make new code pass. If the failing test will not turn green, investigate the failure; do not delete the test.

---

## How to promote to staging and to production

Promotions are themselves PRs. They are not bulk batch operations; they are reviewed merges.

### develop -> staging

Open when develop holds tested feature work you intend to ship to a wider audience.

```bash
gh pr create --base staging --head develop \
  --title "release: develop -> staging $(date -u +%F)" \
  --body  "## Summary
This release promotes the following issues to staging.

## Closes
- Closes #...
- Closes #...

## Verification on staging after merge
- [ ] /
- [ ] /projects/<slug>
- [ ] sign-in flow (after Phase 6)
- [ ] publish flow (after Phase 8)"
```

After merge: visit `staging.davidonasanya.com` (or the auto staging preview URL until DNS lands). Walk the verification checklist. Anything broken means a `fix/<n>_...` branch off `develop` and another release cycle.

### staging -> main

Open only after staging has been verified. The body should list what was tested on staging.

```bash
gh pr create --base main --head staging \
  --title "release: staging -> main $(date -u +%F)" \
  --body  "## Summary
This release promotes the staging contents to production.

## Tested on staging
- [x] /
- [x] /projects/stratus
- [x] CV download

## Closes
- Closes #..."
```

After merge: production deploy to `davidonasanya.com` (once DNS is live).

---

## How to write a good slice (when you discover new work)

Each issue is a single PR with one observable outcome. If you cannot describe the outcome in one sentence as a behaviour, the slice is too big or too vague.

A good slice has:

- **Outcome**: one or two lines, phrased as something a reader can verify.
- **Adds**: the files and dependencies the PR touches.
- **Tests**: the test layer (Vitest, RTL, Playwright, manual) per `implementation-plan.md`.
- **Depends on**: links to issues that must land first.
- **Priority**: P0 (blocks launch), P1 (required for the phase), P2 (nice to have), P3 (backlog).

Use the issue templates (`task`, `bug`, `content`, `content-gap`). The `task` template is the workhorse and asks for these fields directly.

---

## Library setup discipline (Context7)

Whenever a phase introduces a new library or framework, use Context7 to fetch current docs before installing. Library versions and best practices change between training cuts. Setup steps in this repo are pinned to Context7 sources at the time of writing.

The pattern:

1. `mcp__context7__resolve-library-id` with the library name.
2. `mcp__context7__query-docs` with the chosen ID and a specific question (install steps, config shape, migration notes).
3. Cite the library ID and page in the issue body or PR description so the source is auditable.

Already grounded:
- Issue #1 (Next.js 16): `/vercel/next.js/v16.2.2`.
- Issue #81 (Tailwind v4): `/tailwindlabs/tailwindcss.com`.
- Issue #82 (Biome): `/biomejs/biome`.

Likely to need a fresh Context7 lookup later:
- Phase 1: Vitest, Playwright, Dependabot config, CodeQL.
- Phase 2: `next/font` for Fraunces, Geist, JetBrains Mono.
- Phase 3: Zod, gray-matter / next-mdx-remote for MDX frontmatter parsing.
- Phase 5: `cmdk`, `react-view-transitions`, `dnd-kit`.
- Phase 6: Auth.js v5, Drizzle, Resend, Upstash.
- Phase 7: Vercel Blob, sharp.
- Phase 8: Octokit.
- Phase 9: `next/og`.
- Phase 10: `@vercel/analytics`, Sentry, Cloudflare Turnstile.
- Phase 11: `@lhci/cli`.

---

## How to approach the build (recommended cadence)

### Tight loops, broad horizon

Stay inside one phase at a time. The phases are ordered so each one unlocks the next. Do not start Phase 6 before Phase 3 lands a content schema.

### Order within a phase

1. Land the P1 scaffolding slice first (the one with no `Depends on`). It usually unblocks the rest.
2. Pick P1 slices that depend on the scaffolding and land them in order.
3. Treat P2 and P3 slices as nice-to-haves; if the phase milestone closes without them, drag them to the next phase or `phase:future`.

### Two-rung release rhythm

You do not need to promote every merge to staging immediately. A reasonable rhythm:

- Daily: feature PRs to `develop`. Merge when CI is green and the diff reads cleanly.
- End of phase (or sooner if the work is share-worthy): open a `develop -> staging` release PR, smoke-test on staging.
- After staging soak: open a `staging -> main` release PR.

Phases 0 to 4 will likely produce one or two staging promotions in total (a lot of foundation, not much to share). Phases 5 onward will produce more.

### When something breaks on staging

Open a `fix/<n>_<slug>` branch off `develop`. Land it through the normal chain (`develop -> staging -> main`). No hotfix path. The fix waits for the next release PR.

If something breaks in production after a `staging -> main` merge:

1. Read the diff to understand what shipped.
2. Open a `fix/<n>_<slug>` branch off `develop` with the fix.
3. Walk the chain. There is no production hotfix path; the rule is the rule.

---

## Verification checklist before each phase milestone closes

When the last open slice in a phase merges, run these checks before closing the milestone:

1. All issues in the milestone are closed (or moved to `phase:future`).
2. The Phase column on the project board shows zero `In Progress` or `Ready`.
3. The verification row from `implementation-plan.md` for that phase passes by hand.
4. Every merged PR in this phase carried a clean `qa-runner` report and zero unresolved blockers from `code-reviewer`, `security-reviewer`, and (where dispatched) `browser-tester`.
5. Open a `develop -> staging` release PR, then `staging -> main`, naming the phase in the title (`release: develop -> staging YYYY-MM-DD (Phase N close)`).
6. Re-tag any deferred slices with `phase:future`.
7. Update the `Current Phase` view filter in the project board to the next phase number.

---

## Soft mode while GitHub Pro is off

Branch protection cannot enforce server-side gates on a private GitHub Free repo. Until upgrade or going public:

- Direct push to `main`/`staging`/`develop` is not blocked. Do not do it.
- A non-conforming PR (e.g. `feature/X -> staging`) shows a red `branch-flow-guard` check but the merge button is not disabled. Do not click it.
- A failing CI run does not block merge. Do not merge red CI.
- The discipline lives in your hand. The workflows are tripwires, not walls.

When upgraded:

```bash
bash scripts/github/seed-branch-protection.sh                                                 # initial relaxed
REQUIRE_CHEAP_CHECKS=1 bash scripts/github/seed-branch-protection.sh                          # after Phase 1
REQUIRE_CHEAP_CHECKS=1 REQUIRE_HEAVY_CHECKS=1 bash scripts/github/seed-branch-protection.sh   # after Phases 11/12
```

Re-flip issue #3 to `status:ready` (or close it) once protection is enforced.

---

## Daily commands cheat sheet

```bash
# First-time setup on a fresh clone (see .github/CONTRIBUTING.md)
git config --local user.name  "<your-github-account-name>"
git config --local user.email "<your-no-reply-email-from-github-settings>"

# Start the day
git checkout develop && git pull --ff-only

# Pick up a slice
git checkout -b feature/<n>_<short-slug>
gh issue edit <n> --add-label status:in-progress --remove-label status:ready

# Run quality gates locally before pushing
pnpm typecheck && pnpm lint && pnpm build

# Open a PR
git push -u origin HEAD
gh pr create --base develop --fill

# Promote when ready
gh pr create --base staging --head develop \
  --title "release: develop -> staging $(date -u +%F)" --body "..."

gh pr create --base main --head staging \
  --title "release: staging -> main $(date -u +%F)" --body "..."

# Inspect the project board
gh project item-list 1 --owner AdeniyiOnasanya --limit 100
```

---

## Definition of done (from `project-scope.md`)

The build is finished when all of these are true:

1. Editable from `/admin` on a phone, publish, see live within minutes.
2. Recruiter from LinkedIn sees a fast server-rendered page, clean OG card, one-click CV download.
3. Repo commit history is the audit log of every content change.
4. No content lost if the laptop dies; GitHub is source of truth.
5. Lighthouse 95+ on Performance, Accessibility, Best Practices, SEO.
6. Branch protection on all three branches, no bypasses, all required checks green.
7. No em-dash, no emoji anywhere in the shipped repo.
8. Every animation has a reduced-motion path.

Phase 13 is the final pass that drives all eight to true.

---

## Where to look when you are stuck

- **What is being built and why:** `project-scope.md`.
- **Locked technical decisions:** `tech-stack.md`.
- **Phase plan and verification per phase:** `implementation-plan.md`.
- **The full slice list (the issue source):** `phase-slices.md`.
- **Branch model and rules:** `.github/CONTRIBUTING.md`.
- **Project board spec:** `.github/PROJECT.md`.
- **Setup scripts run order:** `scripts/github/README.md`.
- **Library docs:** Context7 (`mcp__context7__query-docs`), not training data.

If a fact in any of these conflicts with the live state of the repo or a Context7 source, the live state wins. Update the doc, then proceed.
