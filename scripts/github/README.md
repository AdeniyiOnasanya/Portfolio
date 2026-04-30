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
```

Each script is idempotent: re-running them is safe.

## What each does

- `seed-labels.sh`: deletes GitHub default labels, creates the 22 prefixed project labels.
- `seed-milestones.sh`: creates the 14 phase milestones (no due dates), skips any that already exist.
- `seed-project.sh`: creates the `Portfolio Build` project (v2), links it to the repo, adds Phase / Priority / Estimate custom fields, and rewrites the Status options to Triage / Ready / In Progress / Blocked / Done.

## Branch protection

Set after the seeds, before the first PR. See the "Prerequisites" block at the top of `/Users/davidonasanya/.claude/plans/i-want-you-to-twinkly-turtle.md` for the relaxed seed; tighten the `required_status_checks.contexts` list as Phases 1, 11, 12 land.

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
