#!/usr/bin/env bash
set -euo pipefail

# Backfill the Portfolio Build project with every open issue and set their
# Status to Ready. Use this if issues were created before the project
# automation workflow was on the default branch.
#
# Idempotent: adding an item that already exists is a no-op; setting the
# same Status value is a no-op.

REPO="${REPO:-AdeniyiOnasanya/Portfolio}"
OWNER="${OWNER:-AdeniyiOnasanya}"
PROJECT_NUMBER="${PROJECT_NUMBER:-1}"

PROJECT_ID="PVT_kwHOBeZFVc4BWOm0"
STATUS_FIELD_ID="PVTSSF_lAHOBeZFVc4BWOm0zhRkluI"
READY_OPTION_ID="36f6bc8d"

# Fetch all open issue node IDs.
echo "Fetching issue node IDs from $REPO"
ISSUES=$(gh issue list --repo "$REPO" --state open --limit 1000 \
  --json number,title --jq '.[] | "\(.number)\t\(.title)"')

if [ -z "$ISSUES" ]; then
  echo "No open issues."
  exit 0
fi

echo "$ISSUES" | while IFS=$'\t' read -r number title; do
  NODE_ID=$(gh api "repos/$REPO/issues/$number" --jq '.node_id')

  # Add the issue to the project (returns existing item id if already present).
  ITEM_ID=$(gh api graphql -f query='
    mutation($p:ID!,$c:ID!){
      addProjectV2ItemById(input:{projectId:$p,contentId:$c}){item{id}}
    }' -F p="$PROJECT_ID" -F c="$NODE_ID" --jq '.data.addProjectV2ItemById.item.id')

  # Set Status to Ready.
  gh api graphql -f query='
    mutation($p:ID!,$i:ID!,$f:ID!,$o:String!){
      updateProjectV2ItemFieldValue(input:{
        projectId:$p,itemId:$i,fieldId:$f,
        value:{singleSelectOptionId:$o}
      }){projectV2Item{id}}
    }' -F p="$PROJECT_ID" -F i="$ITEM_ID" -F f="$STATUS_FIELD_ID" -F o="$READY_OPTION_ID" >/dev/null

  printf "  #%s -> board (Status: Ready) %s\n" "$number" "${title:0:70}"
done

echo "Done."
