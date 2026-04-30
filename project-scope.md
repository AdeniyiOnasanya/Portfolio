## Project Scope

### Problem

I am a software engineer with eight years of experience. I have shipped many projects across healthcare, social care, and commercial environments, but I do not have a single place that showcases them. When recruiters or hiring managers ask, I point at company sites I cannot fully control, or at GitHub repos that are old and out of context.

I want a portfolio I own end-to-end: a public site that presents me well, and a private CMS where I can keep it current without redeploying by hand.

### Solution

A Next.js full-stack web application:

1. A public marketing/portfolio site at `/` and `/projects/<slug>`, server-rendered for SEO and shareability.
2. A private CMS at `/admin`, gated by a real magic-link sign-in, where I can edit every section and project.
3. Content lives in the Git repo (MDX/JSON), not a separate database. The CMS commits changes through the GitHub API, opens a pull request, and a redeploy ships the update. This gives me history, rollback, review, and backups for free.

The visual design and content model are already specified in `design_handoff_portfolio/`. This project is a fresh Next.js build, not a port of the prototype. The handoff is reference material for layout, copy, animations, and data shape only.

### Out of scope

- Multi-user accounts. Auth is single-admin (me).
- Public comments, likes, or any user-generated content.
- Internationalisation. English only for v1.
- Mobile native apps. Responsive web only.

### Features

#### Public site

- Landing page with Hero, About, Skills, Experience, AI Practice, Project index, Footer (per the design handoff).
- Per-project case study pages at `/projects/<slug>`, server-rendered.
- Optional `deepDive` block on case studies (impact metrics, before/after, process timeline, reflections).
- Command palette (Cmd/Ctrl+K) for navigation, contact actions, theme toggle.
- Theme: dark default, light alternate, system option. Persisted per visitor.
- Cinematic intro on first visit, skippable, gated by `prefers-reduced-motion`.
- Custom cursor, magnetic buttons, scroll reveals, marquee skill pills. All disabled on touch / reduced-motion.
- OpenGraph cards, sitemap, robots.txt, JSON-LD `Person` and `CreativeWork` for SEO.
- Per-project OpenGraph image generated at request time.
- 404 page on-brand.

#### Private CMS at `/admin`

- Magic-link auth: I enter my email, the server emails me a one-time link, the link sets an httpOnly session cookie. Rate-limited.
- Single allowed admin email (env-configured), so even if someone discovers `/login` they cannot sign in.
- Editor surface: Hero, About, Skills, Experience, AI Practice, Projects, Footer, Settings.
- Project list with drag-reorder, per-project published/draft flag, slug validation.
- Project deep-dive editor for metrics, before/after, process steps, reflections.
- Image upload pipeline: files stored in object storage, references inserted into content.
- CV upload and replace (PDF and DOCX), served from the same storage.
- Markdown support in long-form fields (problem, approach, outcome, reflections).
- Live preview pane rendering the unsaved draft.
- Save creates a draft. Publish opens a pull request against `main` with the diff and a generated title/body. Merging triggers Vercel to redeploy.
- Discard reverts the in-progress draft.
- Per-section visibility toggles to hide a whole section without losing its content.

#### Content & ops

- Content source of truth: typed JSON or MDX files committed to the repo.
- CI: type-check, lint, unit tests, Playwright smoke test for the publish flow, build, on every PR.
- CD: Vercel Preview deployments per PR, production deploy on merge to `main`.
- GitHub Issues used for bugs, content TODOs, and content gaps. Templates for both.
- Branch protection on `main`: PR required, CI green required.
- Analytics: cookieless (Plausible or Vercel Analytics) so no consent banner needed.
- Per-section and per-project visibility flags so I can hide NDA work or stage a draft project.

#### Constraints

- No em-dash (U+2014) anywhere in code, content, comments, or commit messages. Use commas, periods, semicolons, parentheses, or colons.
- No emoji in code, copy, comments, or commit messages.
- All animations honour `prefers-reduced-motion`.
- All content edits must round-trip through Git, so the repo is always the source of truth.
- Phone number not exposed publicly by default. Email exposed only via obfuscated link or contact form.

### Success criteria

- I can edit any section of my portfolio from `/admin` on my phone, publish, and see it live within a few minutes.
- A recruiter who lands on the site from LinkedIn sees a fast, server-rendered page, a clean OG card, and can download my CV in one click.
- The repo's commit history is the audit log of every content change.
- No content is lost if my laptop dies; the source of truth is GitHub.
- Lighthouse: Performance, Accessibility, Best Practices, SEO all 95+.
