import Link from 'next/link';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ProjectFile } from '../../lib/projects';
import type { Project } from '../../lib/schema';
import { ProjectCaseStudyHeading } from './ProjectCaseStudyHeading';

// react-markdown is safe by default: it strips raw HTML unless explicitly
// re-enabled via rehype-raw, which we deliberately do not pass. The MDX body
// strings live in content/projects/<slug>.mdx under repo control.

const HUE_BY_N: Record<string, number> = {
  '01': 145,
  '02': 28,
  '03': 210,
  '04': 280,
  '05': 180,
  '06': 340,
  '07': 60,
};

const ARROW_LEFT = String.fromCodePoint(0x2190);
const ARROW_RIGHT = String.fromCodePoint(0x2192);

export function ProjectCaseStudy({
  file,
  prev,
  next,
  total,
}: {
  file: ProjectFile;
  prev?: Project;
  next?: Project;
  total?: number;
}) {
  const { frontmatter, body } = file;
  const hue = HUE_BY_N[frontmatter.n] ?? 145;
  const totalLabel = total ? String(total).padStart(2, '0') : null;

  const coverStyle = {
    aspectRatio: '16 / 8',
    background: `linear-gradient(135deg, oklch(0.18 0.04 ${hue}) 0%, oklch(0.1 0.02 ${hue}) 100%)`,
    position: 'relative' as const,
    overflow: 'hidden' as const,
  };
  const coverScanlinesStyle = {
    position: 'absolute' as const,
    inset: 0,
    backgroundImage: `repeating-linear-gradient(-45deg, transparent 0, transparent 22px, oklch(0.78 0.13 ${hue} / 0.05) 22px, oklch(0.78 0.13 ${hue} / 0.05) 23px)`,
  };
  const coverTitleStyle = {
    position: 'absolute' as const,
    bottom: 32,
    left: 32,
    right: 32,
    fontFamily: 'var(--font-serif)',
    fontStyle: 'italic' as const,
    fontWeight: 300,
    fontSize: 'clamp(40px, 7vw, 88px)',
    lineHeight: 0.95,
    letterSpacing: '-0.03em',
    color: `oklch(0.92 0.13 ${hue})`,
    fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 144',
    textShadow: '0 4px 40px rgba(0,0,0,0.4)',
  };
  const coverIndexStyle = {
    position: 'absolute' as const,
    top: 32,
    right: 32,
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    color: 'rgba(255,255,255,0.4)',
  };

  return (
    <article aria-labelledby="case-study-heading">
      <section className="proj-hero">
        <Link href="/#work" className="back">
          {ARROW_LEFT} Back to index
        </Link>
        <div className="eyebrow-row reveal">
          <span>
            Project · {frontmatter.n}
            {totalLabel ? ` / ${totalLabel}` : ''}
          </span>
          <span aria-hidden="true">·</span>
          <span>{frontmatter.year}</span>
          <span aria-hidden="true">·</span>
          <span>{frontmatter.kind}</span>
        </div>
        <ProjectCaseStudyHeading id="case-study-heading" slug={frontmatter.slug}>
          <span className="line-mask">
            <span>{frontmatter.title}</span>
          </span>
          <span className="line-mask">
            <span>
              <em className="proj-tagline">{frontmatter.tagline}</em>
            </span>
          </span>
        </ProjectCaseStudyHeading>
      </section>

      <div className="proj-meta reveal">
        {(['Year', 'Role', 'Sector', 'Status'] as const).map((key) => (
          <div className="item" key={key}>
            <div className="l">{key}</div>
            <div className="v">{frontmatter.meta[key]}</div>
          </div>
        ))}
      </div>

      <section className="proj-section">
        <div className="label">- Cover</div>
        <div>
          <div className="viz wide" style={coverStyle}>
            <div style={coverScanlinesStyle} />
            <div className="label">{frontmatter.subtitle.toUpperCase()}</div>
            <div style={coverTitleStyle}>{frontmatter.title}</div>
            <div style={coverIndexStyle}>
              {frontmatter.n}
              {totalLabel ? ` / ${totalLabel}` : ''}
            </div>
          </div>
        </div>
      </section>

      <section className="proj-section reveal">
        <div className="label">- Subtitle</div>
        <div>
          <p className="proj-subtitle">{frontmatter.subtitle}</p>
        </div>
      </section>

      <section className="proj-section reveal">
        <div className="label">- Overview</div>
        <div>
          <h3>
            The <em>brief</em>.
          </h3>
          <p>{frontmatter.summary}</p>
          <ul className="proj-stack">
            {frontmatter.stack.map((tech) => (
              <li key={tech}>{tech}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="proj-section reveal">
        <div className="label">- Screens</div>
        <div>
          <h3>
            The <em>surface</em>.
          </h3>
          <ul className="gallery" aria-label="Project visuals">
            {frontmatter.visuals.map((visual, index) => {
              const aspect = visual.w === 'wide' ? '16 / 9' : visual.w === 'tall' ? '4 / 5' : '1';
              const style = {
                aspectRatio: aspect,
                background: `linear-gradient(${135 + index * 30}deg, oklch(0.16 0.03 ${hue}) 0%, oklch(0.1 0.02 ${hue}) 100%)`,
              };
              const className = `viz ${visual.span === 2 ? 'span-2' : ''}`.trim();
              return (
                <li key={visual.label} className={className} style={style}>
                  <span className="label">{visual.label}</span>
                </li>
              );
            })}
          </ul>
          <p className="proj-gallery-caption">
            · placeholder treatments, actual screens available on request
          </p>
        </div>
      </section>

      {body.trim().length > 0 ? (
        <section className="proj-section reveal" aria-labelledby="case-study-narrative-heading">
          <div className="label">- Notes</div>
          <div>
            <h3 id="case-study-narrative-heading">
              The <em>story</em>.
            </h3>
            <div className="proj-prose">
              <Markdown remarkPlugins={[remarkGfm]}>{body}</Markdown>
            </div>
          </div>
        </section>
      ) : null}

      {prev || next ? (
        <div className="proj-nav">
          {prev ? (
            <Link className="nav-card" href={`/projects/${prev.slug}`}>
              <div className="l">
                {ARROW_LEFT} Previous · {prev.n}
              </div>
              <div className="t">{prev.title}</div>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link className="nav-card right" href={`/projects/${next.slug}`}>
              <div className="l">
                Next · {next.n} {ARROW_RIGHT}
              </div>
              <div className="t">{next.title}</div>
            </Link>
          ) : (
            <span />
          )}
        </div>
      ) : null}
    </article>
  );
}
