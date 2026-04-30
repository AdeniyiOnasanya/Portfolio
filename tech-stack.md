## Tech Stack

Suggestions, with reasoning and the alternatives I considered. Mark each one accept / change before we start building.

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
Admin form submit -> server validates with Zod -> server uses Octokit with a fine-scoped PAT (or a GitHub App, see below) to:

1. Create a branch `cms/<timestamp>-<slug>`.
2. Commit the updated content files.
3. Open a PR with a generated title and body summarising the diff.
4. Optionally auto-merge if I tick "publish immediately."

Vercel picks up the merge and redeploys. The admin UI links straight to the PR for review.

**GitHub App vs PAT:** start with a fine-grained PAT in env (`GITHUB_TOKEN`) for speed, migrate to a GitHub App when we want fewer permissions and proper rotation.

### Authentication

**Auth.js (NextAuth v5) with the Email provider, Resend as the SMTP transport.**

- Magic link to my admin email only (env: `ADMIN_EMAIL`). Anyone else gets generic "if that email is registered, we sent a link."
- httpOnly, Secure, SameSite=Lax session cookie. 30-day sliding session.
- Rate-limit the sign-in endpoint with Upstash Redis (5 attempts / 15 min / IP).
- CSRF protection comes for free with Auth.js.

Alternatives: Clerk (overkill and paid for one user), Lucia (great but more code), DIY (don't).

### Email provider

**Resend.** Cheap, dev-friendly, Next.js-native. 3,000 emails/month free is plenty for a single-user CMS.

Alternatives: Postmark (best deliverability, more expensive), SES (cheapest at scale, ugliest setup).

### Database

**One small Postgres for sessions and rate-limit state. Neon (free tier) or Vercel Postgres.**
Drizzle ORM for typed queries. No content tables; content is in Git.

Alternatives: SQLite via Turso (works, but Auth.js's adapters are smoother on Postgres), no database at all and use signed JWTs (workable but harder to revoke).

### Object storage (images, CV)

**Vercel Blob if we deploy on Vercel; otherwise Cloudflare R2.**
Uploaded images get a stable URL. The CMS writes the URL into the content file. We do not commit large binaries to the repo.

For very small assets (favicon, OG SVG template) keep them in `/public`.

Alternatives: commit everything to the repo (simple, but bloats Git history fast), Cloudinary (great transforms, more cost).

### Image optimisation

**`next/image` with remote patterns pointing at the blob host.** AVIF/WebP, responsive `sizes`, lazy by default.

### Deployment

**Vercel.** SSG for the public site, ISR with on-demand revalidation triggered by GitHub merge webhook (or just rely on push-to-deploy). Preview deployments per PR. Production on `main`.

Alternatives: Cloudflare Pages + Workers (cheaper, more setup), self-hosted (overkill).

### CI/CD

**GitHub Actions.**

- `ci.yml` on every PR: install, type-check, lint, unit test, Playwright smoke, build.
- `deploy.yml` is implicit: Vercel handles preview-on-PR and production-on-merge.
- Branch protection on `main`: required status checks, required PR review (self-approve allowed for solo).
- Dependabot for weekly dep PRs.

### Testing

- **Vitest** for unit tests (Zod schemas, content loaders, utilities).
- **Playwright** for one end-to-end smoke: sign in, edit a project title, save draft, publish, see PR open. Run in CI against a preview deploy.
- **Type-checking** is a test in itself; `tsc --noEmit` in CI.

### Linting / formatting

**Biome.** One tool for lint + format, fast, no plugin matrix.
Alternative: ESLint + Prettier if we hit a Biome rule we cannot live without. Biome first.

### Analytics

**Plausible (self-hosted or cloud) or Vercel Analytics.** Cookieless, no consent banner.
Plausible if we want script tag simplicity and a public dashboard, Vercel Analytics if we already pay Vercel.

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

**`@next/mdx` + `remark-gfm`.** For long-form fields. Custom MDX components for callouts, image grids, before/after sliders.

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
  site.json
  /projects
    stratus.mdx
    hearth.mdx
    ...
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
ADMIN_EMAIL=                    only address allowed to receive magic links
AUTH_SECRET=                    Auth.js
RESEND_API_KEY=
GITHUB_TOKEN=                   fine-grained PAT, repo scope
GITHUB_REPO=                    "davidonasanya/portfolio"
GITHUB_BRANCH_BASE=             "main"
DATABASE_URL=                   Postgres
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=
BLOB_READ_WRITE_TOKEN=          Vercel Blob (if used)
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

### Open questions

1. **Deploy host: Vercel or Cloudflare Pages?** Vercel is the path of least resistance. Cloudflare is cheaper and faster at the edge but more bring-your-own.
2. **Object storage: Vercel Blob or R2 or commit to repo?** Decided by host above plus how many images we expect (gut: under 100, R2 is fine, repo also fine).
3. **Analytics: Plausible (paid) or Vercel Analytics (paid if we exceed free)?** Either works.
4. **Custom domain.** What is it? `davidonasanya.com`?
5. **GitHub repo name + visibility.** Public so people can read the code (good signal for a portfolio), or private (the live site is the artefact)?
6. **Auto-merge on publish, or always require a PR review (even from myself)?** Auto-merge is faster, manual is safer.
