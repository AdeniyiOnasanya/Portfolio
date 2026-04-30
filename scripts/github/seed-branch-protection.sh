#!/usr/bin/env bash
set -euo pipefail

# Seed branch protection on develop, staging, and main.
# Idempotent: PUT /protection replaces the rule each run.
#
# Initial seed is relaxed: PR required, no force push, no deletion, but
# required-status-checks contexts is empty so the rules can land before
# CI exists. Run again with REQUIRE_CHEAP_CHECKS=1 once Phase 1 lands
# typecheck/lint/unit/forbidden-chars/build, and REQUIRE_HEAVY_CHECKS=1
# after Phases 11 and 12 land lighthouse + e2e.

REPO="${REPO:-AdeniyiOnasanya/Portfolio}"
REQUIRE_CHEAP_CHECKS="${REQUIRE_CHEAP_CHECKS:-0}"
REQUIRE_HEAVY_CHECKS="${REQUIRE_HEAVY_CHECKS:-0}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found on PATH" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh auth status failed; run gh auth login first" >&2
  exit 1
fi

# Build the JSON contexts list per branch.
cheap_contexts='"typecheck","lint","unit","forbidden-chars","build","branch-flow-guard"'
heavy_contexts='"lighthouse","e2e-smoke","e2e-publish","codeql"'

contexts_for() {
  local branch="$1"
  local out=""
  if [ "$REQUIRE_CHEAP_CHECKS" = "1" ]; then
    out="$cheap_contexts"
  fi
  case "$branch" in
    main|staging)
      if [ "$REQUIRE_HEAVY_CHECKS" = "1" ]; then
        if [ -n "$out" ]; then out="$out,$heavy_contexts"; else out="$heavy_contexts"; fi
      fi
      ;;
  esac
  echo "[$out]"
}

protect() {
  local branch="$1"
  local linear_history="$2"  # true for main, false for staging/develop

  local contexts
  contexts=$(contexts_for "$branch")

  echo "Protecting $branch (contexts=$contexts, linear=$linear_history)"

  # PUT replaces the rule each run, so order of fields here is the source of truth.
  # Use --input - so we can hand a complete JSON body (the -F shorthand cannot
  # express nested objects cleanly).
  local body
  body=$(cat <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": $contexts
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true,
  "required_linear_history": $linear_history,
  "lock_branch": false,
  "allow_fork_syncing": true
}
EOF
  )

  echo "$body" | gh api -X PUT "repos/$REPO/branches/$branch/protection" \
    --input - >/dev/null

  echo "  ok: $branch"
}

# main is strictest: linear history required.
protect "main" "true"
# staging mirrors main but allows merge commits (so develop -> staging can
# merge-commit if rebase has conflicts).
protect "staging" "false"
# develop never grows the heavy contexts; only the cheap ones.
protect "develop" "false"

echo "Done. Branch protection applied to main, staging, develop on $REPO."
echo
echo "To tighten when CI lands:"
echo "  REQUIRE_CHEAP_CHECKS=1 bash scripts/github/seed-branch-protection.sh    # after Phase 1"
echo "  REQUIRE_CHEAP_CHECKS=1 REQUIRE_HEAVY_CHECKS=1 bash scripts/github/seed-branch-protection.sh    # after Phase 11 / 12"
