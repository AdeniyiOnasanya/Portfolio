#!/usr/bin/env bash
set -euo pipefail

# Seed the 14 phase milestones on AdeniyiOnasanya/Portfolio.
# No due dates. Idempotent: skip if a milestone with the same title already exists.

REPO="${REPO:-AdeniyiOnasanya/Portfolio}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI not found on PATH" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "gh auth status failed; run gh auth login first" >&2
  exit 1
fi

echo "Seeding milestones on $REPO"

# Pull existing milestone titles once so the loop can skip duplicates.
EXISTING_TITLES=$(gh api "repos/$REPO/milestones?state=all&per_page=100" --jq '.[].title' 2>/dev/null || true)

# create_milestone TITLE DESCRIPTION
create_milestone() {
  local title="$1"
  local description="$2"
  if echo "$EXISTING_TITLES" | grep -Fxq "$title"; then
    echo "  skip (exists): $title"
    return 0
  fi
  gh api "repos/$REPO/milestones" \
    -X POST \
    -f title="$title" \
    -f state="open" \
    -f description="$description" >/dev/null
  echo "  created: $title"
}

create_milestone \
  "Phase 0: Repo bootstrap and protection" \
  "Empty Next.js 15 / TS strict app, branch protection, Vercel link, secrets configured."

create_milestone \
  "Phase 1: Quality gates and forbidden-chars guard" \
  "Vitest, Biome, forbidden-chars meta-test, Dependabot, CodeQL, Playwright config."

create_milestone \
  "Phase 2: Tokens, fonts, theme, base layout" \
  "Tokens and fonts wired through App Router; dark-first; reduced-motion verified."

create_milestone \
  "Phase 3: Content schema, loaders, seed content" \
  "Single Zod source of truth; build refuses invalid content; seven project mdx files."

create_milestone \
  "Phase 4: Public site shell" \
  "Server-rendered landing and per-project pages from real content; accessible, fast, indexable."

create_milestone \
  "Phase 5: Cinema layer" \
  "Cinematic intro, cursor, magnetic, marquee, palette, view transitions, all gated by reduced motion and pointer type."

create_milestone \
  "Phase 6: Auth.js v5 magic-link sign-in" \
  "Real sign-in; ADMIN_EMAIL only; sessions in Neon; rate-limited via Upstash."

create_milestone \
  "Phase 7: Admin shell, editors, draft persistence" \
  "Admin UI scaffolded; edits stored as a server-side draft until publish; preview reads draft."

create_milestone \
  "Phase 8: GitHub commit pipeline" \
  "Publish takes the draft, validates with Zod, writes content via Octokit on a new branch, opens a PR."

create_milestone \
  "Phase 9: SEO surface" \
  "OG images per URL, JSON-LD validates, legacy paths redirect, manifest finalised."

create_milestone \
  "Phase 10: Contact, analytics, error monitoring" \
  "Public contact form behind Cloudflare Turnstile; Vercel Analytics and Sentry wired."

create_milestone \
  "Phase 11: Lighthouse CI budget gate" \
  "CI fails when public scores fall below 95 on Performance, Accessibility, Best Practices, SEO."

create_milestone \
  "Phase 12: End-to-end Playwright on publish flow" \
  "Automate the success-criterion smoke up to PR open: sign-in, publish-flow, public-smoke."

create_milestone \
  "Phase 13: Hardening, a11y audit, content review, launch" \
  "All success criteria met; davidonasanya.com live; branch protection final."

echo "Done. Milestones seeded on $REPO."
