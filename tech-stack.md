## Tech Stack

Locked decisions: Vercel-first, free tier where it exists, private repo, every publish goes through a PR that I merge by hand. The picks below assume those rules.

### Framework

**Next.js 15, App Router, TypeScript.**
Server components for the public site (free SSG/ISR, fast first paint, excellent SEO). Route handlers for the admin API. `next/og` for per-project OG images. `next/font` for self-hosted fonts. Vercel-native if we deploy there.

Alternatives considered: Remix (great DX, smaller ecosystem for one-off needs like `next/og`), SvelteKit (fewer libraries for what we need). Next is the safe pick.

### Language

**TypeScript, strict mode.** No JS files in the app code. Content schema typed end-to-end with Zod so the CMS form, the file on disk, and the rendered page all agree.

### Styling

**Tailwind CSS v4 + CSS variables for design tokens.**
The handoff already uses CSS variables for the palette and type. Tailwind utilities for layout/spacing, CSS variables for tokens that need theming (dark/light). Component-scoped styles where utilities get unwieldy (cinematic intro, marquee).

Alternatives: vanilla CSS modules (more boilerplate), CSS-in-JS (perf cost, RSC friction). Tailwind is the right call.

### Fonts

**`next/font` self-hosting Fraunces, Geist, JetBrains Mono.** Subset to Latin. Cache aggressively. Variable font axes for Fraunces (opsz, SOFT, WONK, ital) preserved.

### Content storage

**Git-backed: typed JSON and MDX in `/content`.** No database for content.

- `content/site.json` for hero, about, skills, experience, AI practice, footer, settings.
- `content/projects/<slug>.mdx` for each project, with frontmatter for structured fields and MDX body for the long-form sections.
- `public/uploads/` for committed images (small) OR object storage URLs referenced from the content (large; see "Object storage" below).

Why: history, rollback, review, backups, and offline editing all come for free. The repo is the source of truth.

### CMS-to-Git pipeline

**Octokit (GitHub REST + GraphQL) from a server route.**
Admin form submit -> server validates with Zod -> server uses Octokit with a fine-grained PAT to:

1. Create a branch `cms/<timestamp>-<slug>`.
2. Commit the updated content files.
3. Open a PR against `develop` with a generated title and body summarising the diff (content changes ride the same `develop -> staging -> main` chain as code).
4. Return the PR URL to the admin UI; I open it, review the diff on GitHub, and merge by hand.

**No auto-merge.** Every content change ships through a PR I read and merge. Vercel picks up the merge and redeploys.

**GitHub App vs PAT:** start with a fine-grained PAT in env (`GITHUB_TOKEN`, scoped to this one private repo, contents + pull-requests write only). Migrate to a GitHub App later if we want rotation or to share with other agents.

### Authentication

**Auth.js (NextAuth v5) with the Email provider, Resend as the SMTP transport.**

- Magic link to my admin email only (env: `ADMIN_EMAIL`). Anyone else gets generic "if that email is registered, we sent a link."
- httpOnly, Secure, SameSite=Lax session cookie. 30-day sliding session.
- Rate-limit the sign-in endpoint with Upstash Redis (free tier, available via Vercel Marketplace integration). 5 attempts / 15 min / IP.
- CSRF protection comes for free with Auth.js.

Alternatives: Clerk (overkill and paid for one user), Lucia (great but more code), DIY (don't).

### Email provider

**Resend.** Cheap, dev-friendly, Next.js-native. 3,000 emails/month free is plenty for a single-user CMS.

Alternatives: Postmark (best deliverability, more expensive), SES (cheapest at scale, ugliest setup).

### Database

**Neon Postgres via the Vercel Marketplace integration (free tier).**
0.5 GB storage, plenty for sessions and rate-limit state since content lives in Git, not the DB. Drizzle ORM for typed queries. Auth.js Drizzle adapter for the session table.

Alternatives ruled out: SQLite via Turso (works, but Auth.js's Drizzle adapter is smoother on Postgres), no database at all (signed JWTs work but cannot be revoked, and we want a clean "sign me out everywhere" path).

### Object storage (images)

**Vercel Blob (free tier).**
1 GB storage and 10 GB bandwidth on Hobby is comfortable for a portfolio with under a hundred images. Uploads from the admin UI write to Blob; the CMS writes the returned URL into the content file. The repo never holds binary image uploads.

Small static assets (favicon, OG template SVG, default placeholder images) live in `/public` and ship with the repo.

### CV (PDF + DOCX)

**Committed to the repo at `/public/cv/`, served at `/cv/David-Onasanya-CV.pdf` and `/cv/David-Onasanya-CV.docx`.**

The admin UI does not upload the CV. To replace it, drop the new file into `/public/cv/`, open a PR, merge. Same gate as content. Trade-off: cannot replace from my phone, but the CV changes a few times a year at most, and keeping it in Git means it is versioned with the rest of the site.

### Image optimisation

**`next/image` with remote patterns pointing at the blob host.** AVIF/WebP, responsive `sizes`, lazy by default.

### Deployment

**Vercel, Hobby plan (free).** SSG for the public site, with on-demand revalidation triggered by Vercel's git integration on merge to `main`. Production deploys from `main` to `davidonasanya.com`. A staging branch alias deploys from `staging` to `staging.davidonasanya.com`. Preview deployments per PR for `develop` and feature branches use Vercel's auto-generated URLs.

Hobby plan is fine for a personal portfolio. If we ever want to put this behind a custom commercial brand or run paid features, we move to Pro. Until then: free.

Free-tier limits to keep an eye on (Hobby, at the time of writing): 100 GB bandwidth/month, 1,000 image transformations/month for `next/image`, 1 GB Blob storage, 6,000 build hours/month. None should bite for a portfolio.

### CI/CD

**GitHub Actions for CI, Vercel git integration for CD.**

- `ci.yml` on every PR and on push to `main`: install, type-check, lint, unit test, Playwright smoke, build. Cached `pnpm` store for speed.
- Deploy is implicit: Vercel makes a preview per PR and promotes `main` to production on merge.
- **Branch protection on `main`:** PR required, no direct pushes (including from me), all CI checks required green, conversations resolved, no force-push, no deletion. Self-review counts; the gate is that nothing reaches `main` without going through a PR.
- Dependabot for weekly dependency PRs (npm + GitHub Actions).
- CodeQL on the default branch for the security signal.

### Testing

- **Vitest** for unit tests (Zod schemas, content loaders, utilities).
- **Playwright** for one end-to-end smoke: sign in, edit a project title, save draft, publish, see PR open. Run in CI against a preview deploy.
- **Type-checking** is a test in itself; `tsc --noEmit` in CI.

### Linting / formatting

**Biome.** One tool for lint + format, fast, no plugin matrix.
Alternative: ESLint + Prettier if we hit a Biome rule we cannot live without. Biome first.

### Analytics

**Vercel Web Analytics (free tier).** Cookieless, no consent banner, one-line install via `@vercel/analytics`. Hobby tier gives a daily event allowance that a portfolio will not exhaust.

Skip Speed Insights for now (paid on Hobby in some regions); we can rely on Lighthouse + Vercel build output for perf signals.

### Error monitoring

**Sentry.** You already use it at work. Free tier covers a portfolio comfortably.

### Form spam protection

**Cloudflare Turnstile.** Free, no annoying puzzles. On the contact form only.

### Validation

**Zod everywhere content crosses a boundary.** Single schema in `lib/schema.ts` consumed by:
- The CMS form (server action validation).
- The Git commit step (refuse to write invalid content).
- The build step (refuse to build if `content/` is invalid).
- The runtime loader (typed reads).

### Markdown / MDX

**`react-markdown` + `remark-gfm`.** For long-form prose in `content/projects/<slug>.mdx` bodies. The MDX file format is used for the file extension and YAML frontmatter convention only; the body is parsed as plain markdown and rendered via `react-markdown` (server-component-compatible, safe-by-default HTML stripping, no `rehype-raw`). `remark-gfm` adds tables, strikethrough, task lists, and direct URLs.

Out of scope for now: `@next/mdx` and the JSX-in-markdown pipeline (custom callout components, image grids, before/after sliders embedded inline). Those land when the case-study layout calls for them. Until then, the structured `deepDive` payload in `ProjectSchema` carries the metric tiles, before/after labels, process steps, and lessons; the markdown body holds linear prose only.

### Drag-reorder

**`dnd-kit`.** Used in the project list editor. Rewrites `n` numbering on save.

### Command palette

**`cmdk`.** Same items as the prototype.

### State management

None. Server components, server actions, URL state. The CMS has light client state per editor; React `useState` is enough.

### Project structure (proposed)

```
/app
  /(public)
    page.tsx                    landing
    /projects/[slug]/page.tsx   case study
    layout.tsx
  /(admin)
    /login/page.tsx
    /admin/page.tsx
    /admin/projects/[slug]/page.tsx
    layout.tsx
  /api
    /auth/[...nextauth]/route.ts
    /cms/save/route.ts          opens PR
    /cms/upload/route.ts        signs blob upload URL
/content
  site.json                       site-wide content + ordered slug list
  /projects
    multi-cloud-platform.mdx      (Stratus)
    foster-care-platform.mdx      (Hearth)
    compliance-electron.mdx       (Vessel)
    calendar-tool.mdx             (Quorum)
    microplastics-mobile.mdx      (Plumb)
    endoscope-tracking.mdx        (Trace)
    elearning-platform.mdx        (Atrium)
/lib
  schema.ts                     Zod
  content.ts                    typed loader
  github.ts                     Octokit wrapper
  auth.ts                       Auth.js config
/components
  /public                       Hero, About, Skills, etc.
  /admin                        editors, drag list, modal, toast
  /shared                       Cursor, Grain, Reveal, ThemeToggle
/public
  /assets                       favicon, og template, fonts (if not next/font)
```

### Environment variables

```
NEXT_PUBLIC_SITE_URL=           https://davidonasanya.com
ADMIN_EMAIL=                    only address allowed to receive magic links
AUTH_SECRET=                    Auth.js
AUTH_URL=                       https://davidonasanya.com (prod), preview URL otherwise
RESEND_API_KEY=
RESEND_FROM=                    e.g. "David <hello@davidonasanya.com>"
GITHUB_TOKEN=                   fine-grained PAT, contents + pull-requests write, this repo only
GITHUB_REPO=                    "<owner>/<portfolio-repo>"
GITHUB_BRANCH_BASE=             "main"
DATABASE_URL=                   Neon Postgres (Vercel Marketplace)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
BLOB_READ_WRITE_TOKEN=          Vercel Blob
SENTRY_DSN=
```

### Vercel agent skills (for AI-assisted development)

`vercel-labs/agent-skills` is a curated set of packaged instructions Vercel Engineering maintains for AI coding agents (Claude Code, Cursor, Copilot). Loaded on demand, they keep the right rules and patterns in front of the agent without bloating context. Source: github.com/vercel-labs/agent-skills (verified via Context7).

Install once at the start of the project:

```bash
npx skills add vercel-labs/agent-skills
```

The skills below are the ones that earn their keep on this project. Each entry says when the agent should reach for it during a task on this codebase.

#### react-best-practices

40+ performance rules across 8 categories (waterfalls, bundle size, server-side perf, client-side fetching, re-renders, rendering, JS micro-opts), prioritised by impact.

**Use it for:** every Next.js page and React component we ship. Specifically the project index hover preview (re-render-sensitive), the admin live preview iframe pane (bundle and re-hydration), and any data fetching across server/client components.

**Maps to scope:** Lighthouse Performance 95+, fast first paint for recruiter traffic, cinematic intro that does not block LCP.

#### web-design-guidelines

100+ rules covering accessibility, focus states, forms, animation, typography, images, perf, navigation/state, dark mode, touch, locale.

**Use it for:** every UI review pass. Hard match for: cursor + magnetic + grain + intro + reveals must all honour `prefers-reduced-motion`; focus-visible across the admin form set; image dimensions and lazy loading on the case study visuals grid; theme-color meta and `color-scheme` for the dark/light toggle; tabular-nums on the impact metrics row; curly quotes in copy.

**Maps to scope:** Lighthouse Accessibility 95+, Best Practices 95+, the constraint that every animation honours reduced-motion.

#### react-view-transitions

`<ViewTransition>` component, `addTransitionType`, view transition classes, CSS pseudo-elements, shared element transitions via `name`, JS animations through the Web Animations API, and the Next.js `transitionTypes` prop on `next/link`. Includes ready-made CSS recipes (fade, slide, scale, flip) and reduced-motion handling.

**Use it for:** the cinematic intro, project-row to project-detail morph on the index, prev/next navigation between case studies, before/after slider in deep dives, list reorder animations in the admin project list.

**Maps to scope:** the design handoff's animation system without hand-rolling each transition.

#### composition-patterns

Compound components, state lifting, internal composition, avoiding boolean prop proliferation.

**Use it for:** the admin editor surface. Every section editor (Hero, About, Skills, Experience, AI, Projects, Footer, Settings) shares form primitives (drag-reorder list, modal, toast, image upload). Reach for this skill when a component starts growing booleans like `isEditing`, `showPreview`, `compact`, `inline`, then refactor before it metastasises.

**Maps to scope:** keeping the admin codebase reviewable as the editor surface grows.

#### vercel-deploy-claimable

Lower priority for us, since prod deploys go through GitHub merges to `main` (Vercel git integration). Still useful for one-off previews of a local branch we do not want to push (spike branches, throwaway demos). Not core to the workflow.

**Skipped:** `react-native-guidelines` (web only).

#### How to use them in the workflow

- Skills load on demand. We do not need to invoke them by name; the agent picks the relevant one when a task matches the trigger phrases ("review my UI", "optimise this page", "deploy this", "review this component for performance").
- For non-trivial PRs, ask the agent to run a `web-design-guidelines` review over the changed UI files before opening the PR. Feed the output into the PR description so the human reviewer (me) can verify quickly.
- For new components, ask the agent to apply `react-best-practices` upfront rather than refactor after.
- Add a one-liner to `CLAUDE.md` (project root) telling future sessions these skills are installed and which to prefer per task type.

### Decisions locked

1. **Host:** Vercel, Hobby plan (free).
2. **Domain:** `davidonasanya.com`. Canonical URL across metadata, OG, sitemap, JSON-LD, `AUTH_URL`. DNS pointed at Vercel.
3. **Storage:** Vercel Blob (free tier) for image uploads from the admin.
4. **CV:** committed to the repo at `/public/cv/`, served at `/cv/David-Onasanya-CV.pdf` and `/cv/David-Onasanya-CV.docx`. Replaced by a PR like any other content.
5. **Database:** Neon Postgres via Vercel Marketplace integration (free tier), sessions and rate-limit only.
6. **Analytics:** Vercel Web Analytics (free tier, cookieless).
7. **Repo visibility:** private (already created).
8. **CI:** GitHub Actions on the personal account's 2,000 free minutes/month. If Playwright pushes the budget, we trim or move it to a Vercel-side check, but default to Actions.
9. **Publish flow:** every change rides `feature/<n>_<slug> -> develop -> staging -> main`. CMS content edits open a PR against `develop` (not `main`). **No auto-merge.** I review and merge each rung by hand. Branch protection on all three branches enforces this. `branch-flow-guard` rejects PRs that skip a rung. No hotfix path.
