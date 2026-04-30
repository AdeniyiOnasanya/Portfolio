# Portfolio Build (GitHub Project v2)

This file is the spec for the `Portfolio Build` project board. If the board is rebuilt, follow this document to recreate it.

URL: https://github.com/users/AdeniyiOnasanya/projects/1

## Setup

Reproduce with:

```bash
bash scripts/github/seed-project.sh
```

The script is idempotent: it creates the project if absent, links it to the repo, and ensures the three custom fields and the Status options exist.

## Custom fields

Native fields stay (Title, Status, Assignees, Labels, Milestone, Linked pull requests, Repository, Reviewers, Parent issue, Sub-issues progress).

The seed adds:

- `Phase` (single-select): `0`, `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `10`, `11`, `12`, `13`. Mirrors the milestone for fast in-board sorting.
- `Priority` (single-select): `P0`, `P1`, `P2`, `P3`. Mirrors the `priority:*` label.
- `Estimate` (number): half-day units (1 = roughly half a day). Optional per issue; sanity-checks phase scope.

## Status field options

The default Status field (Todo / In Progress / Done) is rewritten to:

- `Triage` (gray)
- `Ready` (blue)
- `In Progress` (yellow)
- `Blocked` (red)
- `Done` (green)

The automation workflow `.github/workflows/project-automation.yml` keeps Status synced with PR linkage.

## Views (UI-driven; create by hand)

The GitHub Projects v2 view API is limited; views live in the UI. Recreate them as follows.

### 1. Backlog (table)

- Filter: `Status: Triage,Ready` AND `Phase != <current>`.
- Sort: `Phase` ascending, then `Priority` ascending.
- Columns: Title, Phase, Priority, Labels, Milestone.

The parking lot. Future work that has not been pulled into the active phase.

### 2. Current Phase (board)

- Filter: `Phase = <current>` (update the filter on phase rollover).
- Group by: `Status`.
- Columns visible: Triage, Ready, In Progress, Blocked, Done.

Day-to-day surface. The active phase's slices flow left to right.

### 3. In Review (table)

- Filter: `Status: In Progress` AND has linked PR.
- Sort: updated desc.
- Columns: Title, Linked pull requests, Phase, Priority.

What is open on GitHub right now.

### 4. Done (table)

- Filter: `Status: Done`.
- Sort: closed date desc.
- Columns: Title, Phase, Priority, Linked pull requests, closed date.

The changelog.

## Workflow

1. Open an issue from a template. Defaults to `status:triage`. The automation workflow adds it to the project Backlog.
2. Triage: set milestone, area, priority, sharpen acceptance, flip to `status:ready`. Set Status field to `Ready` in the project.
3. Pick up: create branch `feature/<n>_<slug>`. Set Status to `In Progress`.
4. Open PR with `Closes #N` in the body. The automation workflow confirms `In Progress`.
5. Merge to `main` auto-closes the issue. The workflow flips Status to `Done`.

When all milestone issues close, close the milestone, flip the `Current Phase` view filter to the next phase, retag rollover issues from `phase:current` to the new phase or `phase:future`.
