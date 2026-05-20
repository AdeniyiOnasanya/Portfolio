import type { ReactElement } from 'react';
import { findForbiddenChars } from '@/lib/text/forbidden';
import { BRAND_500_HEX } from './brand-colors';

/**
 * OpenGraph card template, Phase 9 slice #53.
 *
 * Renders a 1200x630 card composed of three visual parts inspired by
 * the design handoff (no explicit OG mock exists; the composition is
 * derived from `tokens.css`/`design/styles.css` and the implementation
 * plan's verbal description):
 *
 *  - a vertical brand-500 stripe on the left edge (12px wide) that
 *    echoes the bar used on `.section-ribbon` in `admin.css`;
 *  - the person name in Fraunces italic, large and tight, set on the
 *    neutral-900 canvas with the brand 500 accent applied to the
 *    accent token (`nameAccent`);
 *  - a mono caption under it listing role and a year stamp; the year
 *    is computed by the caller and passed in so the template stays
 *    deterministic (no `Date.now()` in the render path).
 *
 * The template is a pure function returning a ReactElement that
 * Satori (under `next/og`) walks; it never mounts, so hooks, effects,
 * portals, and the rest of the React runtime are unavailable. The
 * `style` props use only the CSS subset Satori supports (no `gap`,
 * no `aspect-ratio`, no `background-image: linear-gradient`).
 *
 * Forbidden-character defence runs on every interpolated input before
 * the template returns. A draft string carrying U+2014 or an emoji
 * would otherwise be rendered into the OG card and shared verbatim to
 * Twitter, LinkedIn, and Google's social card cache; throwing here
 * blocks the route handler from returning a 200, so the social
 * platforms cache the previous (clean) version instead. The throw is a
 * plain `Error` whose message names the offending field so the route
 * can map it to a 422 if needed (matching the publish-pipeline
 * forbidden-char contract from #49).
 */

export type HomeOgTemplateInput = {
  /** Full person name, e.g. "David Onasanya". Required, non-empty. */
  name: string;
  /**
   * Surname or accent fragment that renders in brand 500 (the same
   * `nameAccent` field used by `<Hero>`). Optional; falls back to a
   * monochrome name when missing.
   */
  nameAccent?: string | undefined;
  /** Role line under the name, e.g. "Software Engineer". */
  role: string;
  /**
   * Year stamp shown in the mono caption next to the role. Caller
   * passes it in so the template is deterministic.
   */
  year: number;
};

const WIDTH = 1200;
const HEIGHT = 630;
const STRIPE_WIDTH = 12;

const CANVAS_BG = '#0a0a0a';
const TEXT_PRIMARY = '#f5f5f5';
const TEXT_MUTED = '#a1a1a1';

export function HomeOgTemplate(input: HomeOgTemplateInput): ReactElement {
  assertCleanField('name', input.name);
  if (input.nameAccent) assertCleanField('nameAccent', input.nameAccent);
  assertCleanField('role', input.role);

  const { name, nameAccent, role, year } = input;
  // Split the accent off the end of the name when supplied, so the
  // accent renders in brand 500 and the rest in the primary tone.
  // Matches the `<Hero>` accent split rule in `components/public/Hero`.
  const nameBase =
    nameAccent && name.endsWith(nameAccent) ? name.slice(0, -nameAccent.length).trimEnd() : name;
  const accent = nameAccent && name.endsWith(nameAccent) ? nameAccent : null;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: CANVAS_BG,
        color: TEXT_PRIMARY,
      }}
    >
      <div
        style={{
          width: STRIPE_WIDTH,
          height: '100%',
          backgroundColor: BRAND_500_HEX,
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '96px 80px',
          flex: 1,
        }}
      >
        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 22,
            color: TEXT_MUTED,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          {`Portfolio / ${year}`}
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            fontFamily: '"Fraunces", serif',
            fontStyle: 'italic',
            fontSize: 152,
            lineHeight: 1,
            letterSpacing: -4,
          }}
        >
          <span>{nameBase}</span>
          {accent ? <span style={{ marginLeft: 24, color: BRAND_500_HEX }}>{accent}</span> : null}
        </div>

        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 30,
            color: TEXT_MUTED,
            letterSpacing: 1,
          }}
        >
          {role}
        </div>
      </div>
    </div>
  );
}

/**
 * Inputs are scanned for U+2014 and emoji before they reach Satori so a
 * social card cannot ship a forbidden character. Throws a plain Error
 * whose message names the offending field; the route handler maps the
 * throw to a 422 with the same shape the publish pipeline uses (#49).
 */
function assertCleanField(field: string, value: string): void {
  const [first] = findForbiddenChars(value);
  if (!first) return;
  throw new OgForbiddenCharacterError({
    field,
    char: first.char,
    codePoint: value.codePointAt(first.index) ?? first.char.codePointAt(0) ?? 0,
  });
}

/**
 * Typed error so the OG route handler can `instanceof` it and reply
 * with a structured 422 (matching the publish pipeline's contract from
 * slice #49). Exported so tests can assert the throw without
 * substring-matching the message.
 */
export class OgForbiddenCharacterError extends Error {
  readonly field: string;
  readonly char: string;
  readonly codePoint: number;

  constructor(input: { field: string; char: string; codePoint: number }) {
    const hex = input.codePoint.toString(16).toUpperCase().padStart(4, '0');
    super(`forbidden character (U+${hex}) at ${input.field}`);
    this.name = 'OgForbiddenCharacterError';
    this.field = input.field;
    this.char = input.char;
    this.codePoint = input.codePoint;
  }
}

export const OG_TEMPLATE_DIMENSIONS = { width: WIDTH, height: HEIGHT } as const;

/**
 * Per-project OpenGraph card, Phase 9 slice #54.
 *
 * Same 1200x630 canvas, brand-500 stripe, and typography as the home
 * card (`HomeOgTemplate`), but the body shows the project's title in
 * Fraunces italic, the kind ("Electron app on Raspberry Pi") in mono
 * underneath, and a top caption that pairs the project's display
 * number (`n`) with its year. The `n` value (`01`, `02`, ...) is the
 * same one the live project row uses.
 *
 * The composition reuses every constant (stripe width, canvas
 * background, text tones) so the two cards stay visually paired in a
 * social-feed preview. The forbidden-character defence runs on every
 * interpolated field (title, kind, role, n, year) so a typo in MDX
 * frontmatter never reaches Twitter or LinkedIn.
 */
export type ProjectOgTemplateInput = {
  /** Project display number from MDX frontmatter, e.g. "01". */
  n: string;
  /** Project title from MDX frontmatter, e.g. "Vessel". */
  title: string;
  /** Project subtitle, e.g. "Hot-water compliance testing rig". */
  subtitle: string;
  /** Project kind, e.g. "Electron app on Raspberry Pi". */
  kind: string;
  /** Project year, e.g. "2024". String, not number, to match MDX. */
  year: string;
};

export function ProjectOgTemplate(input: ProjectOgTemplateInput): ReactElement {
  assertCleanField('n', input.n);
  assertCleanField('title', input.title);
  assertCleanField('subtitle', input.subtitle);
  assertCleanField('kind', input.kind);
  assertCleanField('year', input.year);

  const { n, title, subtitle, kind, year } = input;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: CANVAS_BG,
        color: TEXT_PRIMARY,
      }}
    >
      <div
        style={{
          width: STRIPE_WIDTH,
          height: '100%',
          backgroundColor: BRAND_500_HEX,
        }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '96px 80px',
          flex: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 22,
            color: TEXT_MUTED,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          <span style={{ color: BRAND_500_HEX }}>{n}</span>
          <span style={{ marginLeft: 16 }}>{`/ ${year}`}</span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            fontFamily: '"Fraunces", serif',
            fontStyle: 'italic',
          }}
        >
          <div style={{ fontSize: 152, lineHeight: 1, letterSpacing: -4 }}>{title}</div>
          <div
            style={{
              fontSize: 38,
              lineHeight: 1.2,
              marginTop: 16,
              color: TEXT_MUTED,
              letterSpacing: -1,
            }}
          >
            {subtitle}
          </div>
        </div>

        <div
          style={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 26,
            color: TEXT_MUTED,
            letterSpacing: 1,
          }}
        >
          {kind}
        </div>
      </div>
    </div>
  );
}
