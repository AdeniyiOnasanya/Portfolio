# Portfolio handoff for Claude Code

David Onasanya, full-stack engineer portfolio. Cinematic dark-first aesthetic with a self-serve CMS. This bundle is a working HTML/JSX prototype plus build notes for re-implementing it in a real framework.

## What's in the box

```
design_handoff_portfolio/
  README.md                     This file
  design/
    index.html                  Landing page
    project.jsx                 Per-project case study template
    projects/<slug>.html        7 generated entry files
    app.jsx                     Landing page composition
    shared.jsx                  Cursor, Nav, Theme, Reveal, Intro
    enhancements.jsx            Command palette, magnetic buttons, reduced-motion
    data.js                     All site content + settings + visibility
    styles.css                  Public site styling tokens + components
    login.html                  Magic-link sign-in (front-of-house only)
    admin.html                  CMS shell entry
    admin.css                   CMS styling
    admin/
      admin-shared.jsx          Form primitives, drag-reorder, modal, toast
      admin-editors.jsx         Hero, Contact, Skills, Experience, AI, Footer, Settings
      admin-projects.jsx        Projects list + deep-dive editor
      admin-app.jsx             Auth gate, sidebar, preview iframe, publish flow
    store.js                    DRAFT / PUBLISHED localStorage layer + file resolver
    assets/
      David-Onasanya-CV.pdf
      David-Onasanya-CV.docx
      favicon.svg
      og-image.svg
```

## Routes

| Route                       | Purpose                                              |
| --------------------------- | ---------------------------------------------------- |
| `/`                         | Landing page                                         |
| `/projects/<slug>`          | Per-project case study (one of 7 slugs)              |
| `/login`                    | Magic-link sign-in (no public link, bookmark only)   |
| `/admin`                    | CMS, gated by `?token=<magic>` then 30-day session   |
| `/?preview=draft`           | Public site rendered against the unsaved draft       |

## Aesthetic system

- **Type pairing.** Display: Fraunces (italic, opsz 144, SOFT 100, WONK 1). Body: Geist 300/400/500. Mono: JetBrains Mono.
- **Palette.** `--bg #0a0b0a`, `--fg #f3efe7`, `--accent oklch(0.78 0.18 145)` (luminous green). Light theme inverts via `[data-theme="light"]` overrides in `styles.css`.
- **Texture.** Subtle film grain overlay (`.grain`), no-noise on print or `prefers-reduced-motion`.
- **Cursor.** Custom dot+ring follower (`shared.jsx#CustomCursor`). Hides on touch.
- **Type scale.** Hero serif clamps `clamp(72px, 11vw, 180px)`, section titles `clamp(40px, 6vw, 96px)`, body `15-17px` leading 1.55.

## Public site sections

1. **Hero.** Eyebrow stat strip, full-bleed serif headline with italic emphasis, contact actions (Download CV, GitHub, LinkedIn, Email).
2. **About.** Two-column statement + bullets.
3. **Skills.** Categorised list with mono category labels and pill-style items.
4. **Experience.** Timeline rows: when/where on left, title + bullets right.
5. **AI Practice.** Pillars grid + "how I work with the agent" steps. Reveals on scroll.
6. **Project index.** Numbered rows with hover preview thumbnail; click into deep case study.
7. **Footer.** Big italic CTA + repeat action buttons + meta strip.

## Project page

Eyebrow with project number/year/kind, large title + italic tagline, summary, problem/approach/outcome narrative, 4-cell meta strip, visuals grid (`wide` and `tall` cells, image or placeholder), prev/next navigation.

When `project.deepDive` is set: impact metrics row, before/after image slider, process timeline, reflections, sticky pagination.

## Animations and interactions

- **Cinematic intro.** Skippable on first visit, gated by `sessionStorage("introSeen")`. Disabled when `settings.intro === false` or `prefers-reduced-motion`.
- **Reveals.** `useReveal` (IntersectionObserver) toggles `.reveal.in` for fade-up on scroll. Re-observes on intro completion and watches for late-mounted nodes via MutationObserver.
- **Marquee.** Skill pills auto-scroll horizontally; CSS `@keyframes marquee`. Pauses on hover.
- **Project hover preview.** Thumbnail composited from project meta (color hue per index, large numeral, tagline). Tracks active row via `onMouseEnter`/`onMouseLeave`.
- **Command palette.** `Cmd/Ctrl+K` or `/`. Searches projects, sections, and actions (download CV, copy email, toggle theme, open social, print). See `enhancements.jsx#CommandPalette`.
- **Magnetic buttons.** Buttons with `data-magnetic` translate toward the cursor within a small radius.
- **Theme toggle.** Sun/moon segmented pill in nav. Persists to localStorage. Honours `settings.defaultTheme` (`system | dark | light`) on first load.

## Content model

Source of truth is `data.js`, exported as `window.PORTFOLIO_DATA`. The store layer (`store.js`) merges `localStorage["portfolio.published"]` over the defaults at runtime, and merges `localStorage["portfolio.draft"]` instead when admin or `?preview=draft`.

```ts
type Site = {
  person: {
    name: string;
    role: string;
    location: string;
    phone: string;
    email: string;
    github: string;            // full URL
    linkedin: string;          // full URL
    cvUrl: string;             // path to PDF in /assets
    yearsExp: string | number;
    headline: string;          // hero serif, supports <em>
    statement: string;         // about paragraph
    bullets: string[];
  };
  skills: { label: string; items: string[] }[];
  experience: {
    when: string; where: string;
    title: string; bullets: string[];
  }[];
  aiPractice: {
    headline: string;
    intro: string;
    pillars: { title: string; body: string }[];
    workflow: { k: string; v: string }[];
  };
  projects: Project[];
  footer: { headline: string };
  settings: {
    defaultTheme: "system" | "dark" | "light";
    intro: boolean;
    visibility: {
      about: boolean;
      skills: boolean;
      experience: boolean;
      aiPractice: boolean;
      projects: boolean;
    };
  };
};

type Project = {
  slug: string;
  n: string;                   // "01"..."07", auto-renumbered on reorder
  title: string;
  subtitle: string;
  year: string;
  role: string;
  kind: string;
  stack: string[];
  tagline: string;
  summary: string;
  problem: string;
  approach: string[];
  outcome: string;
  visuals: { label: string; w: "wide" | "tall"; image: string | null }[];
  meta: { Year: string; Role: string; Sector: string; Status: string };
  deepDive?: {
    headline: string;
    subhead: string;
    metrics: { value: string; prefix: string; suffix: string; label: string; note: string }[];
    processSteps: { title: string; body: string }[];
    reflections: { title: string; body: string }[];
    beforeImage?: string;      // file: ref or URL
    afterImage?: string;
  };
};
```

Image fields use a `file:<id>` indirection. The actual base64 lives in `localStorage["portfolio.files"]`. `store.js` resolves these on load by walking the data tree.

## CMS architecture

- **Auth.** `login.html` only allows the configured admin email (`onasanyaadeniyi17@gmail.com` in this build). Generates a 16-byte hex token, writes `{token, exp, email}` to `localStorage["portfolio.session"]`, and shows a magic link `admin.html?token=<...>`. The admin app consumes the token, extends the session 30 days, and strips the query.
- **Editor surface.** Sidebar groups (`Content`, `Catalog`, `Site`) with numbered nav items. Each section is a self-contained editor in `admin/admin-editors.jsx` or `admin/admin-projects.jsx`.
- **Auto-save draft.** 350ms debounce, writes to `portfolio.draft`. Top bar shows `Unsaved draft` / `Saved`. `Cmd+S` publishes; `Cmd+Shift+P` toggles preview.
- **Live preview.** Right pane is `<iframe src="index.html?preview=draft&t=<key>">`. Reloads on each save tick.
- **Publish.** Copies draft to `portfolio.published` and clears draft.
- **Discard.** Drops draft, reverts editor to published.
- **Reset.** Wipes draft, published, and uploaded files. Restores defaults from `data.js`.
- **Image uploads.** Files convert to base64 in the browser (`PortfolioStore.saveFile(id, dataUrl)`), stored in `portfolio.files`. References are inserted as `file:<id>`.

## Suggested re-implementation

If porting to Next.js / Remix / SvelteKit, here's the order I'd build it:

1. **Tokens.** Drop `styles.css` variables into a Tailwind config (or CSS module) and confirm Fraunces / Geist / JetBrains load with the same variation axes.
2. **Layout primitives.** Cursor, Grain, Nav, Theme provider (`next-themes` is fine), Reveal hook.
3. **Public sections.** Build straight from `data.ts` (port `data.js`). Keep the visibility flags and the `<em>` HTML in headlines.
4. **Projects.** Generate `app/projects/[slug]/page.tsx` from the project array. Render `DeepDive` only if present.
5. **Command palette.** `cmdk` is a clean drop-in. Keep the same item set and shortcuts.
6. **Magnetic buttons.** Tiny `useMagnetic` ref hook, no need to abstract.
7. **OG image.** Replace `assets/og-image.svg` with `next/og` from the same template.
8. **CMS.** Either:
   - **Keep client-only** (this prototype's model): swap localStorage for IndexedDB if the site grows past a few MB of images.
   - **Move to a real CMS:** treat `data.ts` as the schema. Sanity, Payload, or Keystone all map cleanly. Auth becomes magic-link via Resend or Clerk; admin lives at `/admin` behind that.
9. **Auth.** If keeping the prototype's magic-link feel, swap the localStorage token for an httpOnly cookie issued by an API route after a real email send.
10. **Drag-reorder, validation.** Use `dnd-kit` for project list reordering. Validate slugs as kebab-case unique strings on save.

## Behavioural notes for the agent

- **Never use the em-dash character (U+2014) anywhere in output.** Use commas, periods, semicolons, parentheses, or colons. Hyphens are fine.
- **No emoji** in code, copy, comments, or commit messages.
- Section copy is intentionally terse. Don't pad with marketing filler.
- The hero headline supports inline `<em>` for italic emphasis on key words. Preserve when porting.
- The cinematic intro should always be skippable and respect `prefers-reduced-motion`.
- Theme should default to system match unless `settings.defaultTheme` overrides.
- Project pages must work without JS for SEO (server-render in production). The prototype is client-only.

## Quick start (just to view the prototype)

Serve the `design/` folder with any static server:

```bash
cd design_handoff_portfolio/design
python3 -m http.server 5173
# open http://localhost:5173
# admin lives at http://localhost:5173/login.html
```

That's it. The CMS state lives in localStorage, so each browser sees its own edits.
