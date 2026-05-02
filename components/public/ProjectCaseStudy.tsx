import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ProjectFile } from '../../lib/projects';

// react-markdown is safe by default: it strips raw HTML unless explicitly
// re-enabled via rehype-raw, which we deliberately do not pass. The MDX body
// strings live in content/projects/<slug>.mdx under repo control, so the
// only HTML they could carry is repo-authored. Stripping at the renderer
// keeps the surface narrow regardless.

export function ProjectCaseStudy({ file }: { file: ProjectFile }) {
  const { frontmatter, body } = file;
  return (
    <article aria-labelledby="case-study-heading" className="pt-3xl pb-2xl">
      <p className="text-fg-muted tracking-eyebrow text-xs uppercase">
        {frontmatter.n} · {frontmatter.kind}
      </p>
      <h1
        id="case-study-heading"
        className="font-serif tracking-display leading-tight mt-md text-5xl md:text-6xl"
      >
        {frontmatter.title}
      </h1>
      <p className="text-fg-secondary text-lg leading-relaxed mt-md max-w-prose">
        {frontmatter.subtitle}
      </p>

      <dl className="mt-2xl grid gap-md md:grid-cols-4 border-t border-fg-muted/20 pt-lg">
        {(['Year', 'Role', 'Sector', 'Status'] as const).map((key) => (
          <div key={key}>
            <dt className="text-fg-muted tracking-eyebrow text-xs uppercase">{key}</dt>
            <dd className="text-fg-primary mt-xs">{frontmatter.meta[key]}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="case-study-stack-heading" className="mt-2xl">
        <h2
          id="case-study-stack-heading"
          className="text-fg-muted tracking-eyebrow text-xs uppercase"
        >
          Stack
        </h2>
        <ul className="mt-xs flex flex-wrap gap-sm text-sm font-mono text-fg-secondary">
          {frontmatter.stack.map((tech) => (
            <li key={tech}>{tech}</li>
          ))}
        </ul>
      </section>

      <p className="mt-2xl font-serif text-2xl leading-snug max-w-prose">{frontmatter.tagline}</p>
      <p className="mt-md text-fg-secondary leading-relaxed max-w-prose">{frontmatter.summary}</p>

      <ul className="mt-2xl grid gap-md md:grid-cols-2">
        {frontmatter.visuals.map((visual) => (
          <li
            key={visual.label}
            data-shape={visual.w}
            className="border border-fg-muted/20 rounded-md p-lg text-fg-muted text-sm font-mono"
          >
            {visual.label}
          </li>
        ))}
      </ul>

      {body.trim().length > 0 ? (
        <section aria-labelledby="case-study-narrative-heading" className="mt-2xl">
          <h2
            id="case-study-narrative-heading"
            className="font-serif tracking-display text-3xl md:text-4xl"
          >
            Notes
          </h2>
          <div className="mt-lg text-fg-secondary leading-relaxed max-w-prose prose-case-study">
            <Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown>
          </div>
        </section>
      ) : null}
    </article>
  );
}
