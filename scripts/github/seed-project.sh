#!/usr/bin/env bash
set -euo pipefail

# Seed the Portfolio Build project (v2) under AdeniyiOnasanya.
# Creates the project if missing, links it to AdeniyiOnasanya/Portfolio,
# and adds Phase / Priority / Estimate custom fields.
# Idempotent: skips creation when an item already exists.

OWNER="${OWNER:-AdeniyiOnasanya}"
REPO="${REPO:-AdeniyiOnasanya/Portfolio}"
PROJECT_TITLE="${PROJECT_TITLE:-Portfolio Build}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found on PATH" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh auth status failed; run gh auth login first" >&2
  exit 1
fi

echo "Seeding project '$PROJECT_TITLE' under @$OWNER"

# Find an existing project with the same title (paginate over up to 100).
PROJECT_NUMBER=$(gh project list --owner "$OWNER" --limit 100 --format json \
  --jq ".projects[] | select(.title == \"$PROJECT_TITLE\") | .number" \
  | head -n1)

if [ -z "$PROJECT_NUMBER" ]; then
  echo "  creating project"
  PROJECT_NUMBER=$(gh project create --owner "$OWNER" --title "$PROJECT_TITLE" --format json --jq '.number')
  echo "  project number: $PROJECT_NUMBER"
else
  echo "  project exists, number: $PROJECT_NUMBER"
fi

# Link the project to the repo (idempotent: skip if already linked).
echo "  linking to $REPO"
gh project link "$PROJECT_NUMBER" --owner "$OWNER" --repo "$REPO" >/dev/null 2>&1 || \
  echo "    (already linked or link not required)"

# Read existing custom field names so we can skip duplicates.
EXISTING_FIELDS=$(gh project field-list "$PROJECT_NUMBER" --owner "$OWNER" --format json \
  --jq '.fields[].name' 2>/dev/null || true)

field_exists() {
  local name="$1"
  echo "$EXISTING_FIELDS" | grep -Fxq "$name"
}

# Phase single-select 0 through 13.
if field_exists "Phase"; then
  echo "  field exists: Phase"
else
  echo "  creating field: Phase"
  gh project field-create "$PROJECT_NUMBER" \
    --owner "$OWNER" \
    --name "Phase" \
    --data-type SINGLE_SELECT \
    --single-select-options "0,1,2,3,4,5,6,7,8,9,10,11,12,13" >/dev/null
fi

# Priority single-select.
if field_exists "Priority"; then
  echo "  field exists: Priority"
else
  echo "  creating field: Priority"
  gh project field-create "$PROJECT_NUMBER" \
    --owner "$OWNER" \
    --name "Priority" \
    --data-type SINGLE_SELECT \
    --single-select-options "P0,P1,P2,P3" >/dev/null
fi

# Estimate number (half-day units).
if field_exists "Estimate"; then
  echo "  field exists: Estimate"
else
  echo "  creating field: Estimate"
  gh project field-create "$PROJECT_NUMBER" \
    --owner "$OWNER" \
    --name "Estimate" \
    --data-type NUMBER >/dev/null
fi

# Rewrite the default Status field options (Todo/In Progress/Done)
# to the project's lifecycle: Triage, Ready, In Progress, Blocked, Done.
# Idempotent: applying the same options is a no-op.
echo "  syncing Status options (Triage, Ready, In Progress, Blocked, Done)"
STATUS_FIELD_ID=$(gh api graphql -f query='
query($login: String!, $number: Int!) {
  user(login: $login) {
    projectV2(number: $number) {
      field(name: "Status") {
        ... on ProjectV2SingleSelectField { id }
      }
    }
  }
}' -F login="$OWNER" -F number="$PROJECT_NUMBER" --jq '.data.user.projectV2.field.id')

gh api graphql -f query='
mutation($fieldId: ID!) {
  updateProjectV2Field(input: {
    fieldId: $fieldId,
    singleSelectOptions: [
      {name: "Triage", color: GRAY, description: "New, not yet planned."},
      {name: "Ready", color: BLUE, description: "Acceptance criteria written, ready to pick up."},
      {name: "In Progress", color: YELLOW, description: "A branch exists."},
      {name: "Blocked", color: RED, description: "Waiting on external decision or dependency."},
      {name: "Done", color: GREEN, description: "Merged or closed."}
    ]
  }) {
    projectV2Field { ... on ProjectV2SingleSelectField { name } }
  }
}' -F fieldId="$STATUS_FIELD_ID" >/dev/null

echo "Done. Project '$PROJECT_TITLE' (#$PROJECT_NUMBER) ready."
echo "URL: https://github.com/users/$OWNER/projects/$PROJECT_NUMBER"
