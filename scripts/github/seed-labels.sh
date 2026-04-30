#!/usr/bin/env bash
set -euo pipefail

# Seed the 22 project labels on AdeniyiOnasanya/Portfolio.
# Idempotent: gh label create --force overwrites colour and description.
# Also deletes the GitHub default labels so they do not pollute filters.

REPO="${REPO:-AdeniyiOnasanya/Portfolio}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found on PATH" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh auth status failed; run gh auth login first" >&2
  exit 1
fi

echo "Seeding labels on $REPO"

# Delete GitHub default labels (ignore errors if they do not exist).
DEFAULTS=(
  "bug"
  "documentation"
  "duplicate"
  "enhancement"
  "good first issue"
  "help wanted"
  "invalid"
  "question"
  "wontfix"
)
for name in "${DEFAULTS[@]}"; do
  gh label delete "$name" --repo "$REPO" --yes >/dev/null 2>&1 || true
done

# create_label NAME COLOR DESCRIPTION
create_label() {
  local name="$1"
  local color="$2"
  local description="$3"
  gh label create "$name" \
    --repo "$REPO" \
    --color "$color" \
    --description "$description" \
    --force >/dev/null
  echo "  $name"
}

echo "type:"
create_label "type:bug"          "b60205" "Defect."
create_label "type:task"         "0e8a16" "Engineering work, default for phase slices."
create_label "type:content"      "5319e7" "Content edit or addition."
create_label "type:content-gap"  "8a44e0" "Missing content the site needs."

echo "area:"
create_label "area:public"   "0366d6" "Public marketing site."
create_label "area:admin"    "1d76db" "Private CMS at /admin."
create_label "area:content"  "5319e7" "Content files in /content."
create_label "area:auth"     "b60205" "Sign-in, sessions, rate limit."
create_label "area:infra"    "444444" "Build, deploy, env, scripts."
create_label "area:ci"       "333333" "GitHub Actions, branch protection."
create_label "area:seo"      "006b75" "Metadata, OG, sitemap, JSON-LD."
create_label "area:docs"     "c5def5" "Project docs and templates."

echo "phase:"
create_label "phase:current" "fbca04" "Pinned to whatever phase is in flight."
create_label "phase:future"  "c2e0c6" "Deferred past the current phase."

echo "priority:"
create_label "priority:P0" "b60205" "Blocks launch or breaks main."
create_label "priority:P1" "d93f0b" "Required for the current phase to close."
create_label "priority:P2" "fbca04" "Nice to have this phase."
create_label "priority:P3" "cccccc" "Backlog, no schedule."

echo "status:"
create_label "status:triage"      "ededed" "New, not yet planned."
create_label "status:ready"       "bfd4f2" "Acceptance criteria written, ready to pick up."
create_label "status:in-progress" "1d76db" "A branch exists."
create_label "status:blocked"     "e99695" "Waiting on external decision or dependency."

echo "Done. 22 labels seeded on $REPO."
