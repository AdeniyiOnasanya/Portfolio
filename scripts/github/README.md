# GitHub setup scripts

Reproducible seeds for the issue tracker, milestone list, and project board.

## Prerequisites

- `gh` CLI authenticated as the repo owner (`gh auth status` shows `AdeniyiOnasanya` active).
- Token scopes: `repo`, `project`, `workflow`. If missing, run:
  ```bash
  gh auth refresh -h github.com -s project,workflow
  ```
- Working directory is the repo root.

## Run order

```bash
bash scripts/github/seed-labels.sh
bash scripts/github/seed-milestones.sh
bash scripts/github/seed-project.sh
python3 scripts/github/seed-issues.py            # creates the 78 phase-slice issues
bash scripts/github/backfill-project.sh          # adds open issues to the project board with Status = Ready
bash scripts/github/seed-branch-protection.sh    # protects develop, staging, main (relaxed contexts list)
```

Each script is idempotent: re-running them is safe.

## What each does

- `seed-labels.sh`: deletes GitHub default labels, creates the 22 prefixed project labels.
- `seed-milestones.sh`: creates the 14 phase milestones (no due dates), skips any that already exist.
- `seed-project.sh`: creates the `Portfolio Build` project (v2), links it to the repo, adds Phase / Priority / Estimate custom fields, and rewrites the Status options to Triage / Ready / In Progress / Blocked / Done.
- `seed-issues.py`: reads `slices.json` and opens one GitHub Issue per slice with labels, milestone, and `Depends on #N` cross-refs. Idempotent on title.
- `backfill-project.sh`: adds every open issue to the project board and sets Status = Ready.
- `seed-branch-protection.sh`: applies branch protection to `develop`, `staging`, `main`. Pass `REQUIRE_CHEAP_CHECKS=1` after Phase 1 lands `ci.yml`, and `REQUIRE_HEAVY_CHECKS=1` after Phases 11/12 add lighthouse + e2e.

## One-time bootstrap merge

Workflow files only fire when they exist on the default branch (`main`). After the first commit on `develop` adds the `.github/` tree, run a one-time bootstrap to propagate it up the chain. This bypasses the rules being installed; do it BEFORE running `seed-branch-protection.sh`.

```bash
# from the repo root, current branch develop
gh pr create --base staging --head develop \
  --title "release: develop -> staging $(date -u +%F) bootstrap" \
  --body  "Bootstrap promotion to install the project automation, branch flow guard, and contributing docs on staging."
gh pr merge --merge   # or --squash if you prefer

git fetch origin
gh pr create --base main --head staging \
  --title "release: staging -> main $(date -u +%F) bootstrap" \
  --body  "Bootstrap promotion to install the project automation, branch flow guard, and contributing docs on main."
gh pr merge --merge
```

Verify with `git log main..develop --oneline` returning nothing. Then run `seed-branch-protection.sh`.

## Vercel hookup (manual; the dashboard does not have a CLI surface for this)

Run after the bootstrap merge so the workflow files exist on `main`. Order:

1. Connect Vercel project to `AdeniyiOnasanya/Portfolio`. Framework: Next.js. Package manager: pnpm.
2. **Production branch:** `main`. Domain: `davidonasanya.com` (DNS may be deferred to Phase 13). Add `www.davidonasanya.com` as a 308 redirect to apex.
3. **Staging branch alias:** in Project Settings -> Domains, add `staging.davidonasanya.com`. Edit it and set "Git Branch" to `staging`. The latest deploy of the `staging` branch will always serve at this URL.
4. **Preview deploys:** Vercel auto-creates previews for every branch and PR. No extra config; URLs look like `portfolio-git-<branch>-<account>.vercel.app`.
5. **Env vars:** in Project Settings -> Environment Variables, set per-environment values for `AUTH_URL`, `NEXT_PUBLIC_SITE_URL`, `RESEND_FROM`, `ADMIN_EMAIL`, `DATABASE_URL`, `UPSTASH_REDIS_*`, `BLOB_READ_WRITE_TOKEN`, `GITHUB_TOKEN`, `SENTRY_DSN`. Production gets production-tier values; Preview covers `develop`, `staging`, and feature branches.

## Branch protection

After the bootstrap merge, run `seed-branch-protection.sh` to protect all three branches with the relaxed seed (PR required, no force-push, no deletion, no required-status-checks contexts yet). Tighten the contexts list as CI lands:

```bash
bash scripts/github/seed-branch-protection.sh                                                 # initial seed
REQUIRE_CHEAP_CHECKS=1 bash scripts/github/seed-branch-protection.sh                          # after Phase 1
REQUIRE_CHEAP_CHECKS=1 REQUIRE_HEAVY_CHECKS=1 bash scripts/github/seed-branch-protection.sh   # after Phases 11/12
```

`enforce_admins=true` on all three: even the repo owner cannot bypass.

## Project automation

`.github/workflows/project-automation.yml` requires a repository secret `PROJECT_PAT`: a fine-grained personal access token with `project` scope. The default `GITHUB_TOKEN` cannot manage user-scoped projects, so this PAT is required for the add-to-project and Status-sync jobs.

To create:

1. https://github.com/settings/personal-access-tokens/new
2. Resource owner: `AdeniyiOnasanya`. Repository access: only `AdeniyiOnasanya/Portfolio`.
3. Permissions: Repository -> Issues (read/write), Pull requests (read). Account -> Projects (read/write).
4. Copy the token, then:
   ```bash
   gh secret set PROJECT_PAT --repo AdeniyiOnasanya/Portfolio
   ```
   Paste when prompted.

## Views

The four Project views (Backlog, Current Phase, In Review, Done) are created by hand in the GitHub UI; the v2 view API does not yet support creation. See `.github/PROJECT.md` for the spec.
