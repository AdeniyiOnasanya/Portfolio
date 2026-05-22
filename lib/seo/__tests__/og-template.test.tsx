import { describe, expect, it } from 'vitest';
import { BRAND_500_HEX } from '../brand-colors';
import { HomeOgTemplate, OG_TEMPLATE_DIMENSIONS, OgForbiddenCharacterError } from '../og-template';

/*
 * Home OG template tests, Phase 9 slice #53.
 *
 * The template returns a React element that Satori walks. We do not
 * render through React's DOM reconciler (Satori has its own), so the
 * assertions read the returned tree directly. Three behaviours are
 * pinned:
 *
 *  - the canvas dimensions match the OpenGraph spec (1200x630) so the
 *    `metadata.openGraph.images` entry's width/height claims match
 *    what the route actually returns;
 *  - the accent fragment renders in brand 500 when present, and the
 *    full name renders monochrome when absent (matches the live
 *    `<Hero>` accent rule);
 *  - any U+2014 or emoji in the input fields throws
 *    `OgForbiddenCharacterError` with the field name, so the route can
 *    map it to a 422 without inspecting the message.
 */

describe('OG_TEMPLATE_DIMENSIONS', () => {
  it('matches the OpenGraph 1.91:1 aspect ratio at 1200x630', () => {
    expect(OG_TEMPLATE_DIMENSIONS).toEqual({ width: 1200, height: 630 });
  });
});

type AnyElement = {
  type: unknown;
  props: { style?: Record<string, unknown>; children?: unknown };
};

function flatten(node: unknown): AnyElement[] {
  if (node == null || typeof node !== 'object') return [];
  const el = node as AnyElement;
  const here: AnyElement[] = [el];
  const children = el.props?.children;
  if (Array.isArray(children)) {
    for (const c of children) here.push(...flatten(c));
  } else if (children) {
    here.push(...flatten(children));
  }
  return here;
}

describe('HomeOgTemplate', () => {
  it('renders the name, role, and year as visible text', () => {
    const tree = HomeOgTemplate({
      name: 'David Onasanya',
      nameAccent: 'Onasanya',
      role: 'Software Engineer',
      year: 2026,
    });
    const text = JSON.stringify(tree);
    expect(text).toContain('David');
    expect(text).toContain('Onasanya');
    expect(text).toContain('Software Engineer');
    expect(text).toContain('Portfolio / 2026');
  });

  it('paints the accent fragment in brand 500', () => {
    const tree = HomeOgTemplate({
      name: 'David Onasanya',
      nameAccent: 'Onasanya',
      role: 'Software Engineer',
      year: 2026,
    });
    // Find the span carrying the accent text and assert its inline
    // colour matches the BRAND_500_HEX constant. Walking the tree by
    // text content avoids coupling to the exact JSX nesting.
    const spans = flatten(tree).filter((node) => {
      const children = node.props?.children;
      return typeof children === 'string' && children === 'Onasanya';
    });
    expect(spans.length).toBeGreaterThan(0);
    const accent = spans[0];
    expect(accent?.props.style).toMatchObject({ color: BRAND_500_HEX });
  });

  it('renders the brand-500 vertical stripe', () => {
    const tree = HomeOgTemplate({
      name: 'David Onasanya',
      role: 'Software Engineer',
      year: 2026,
    });
    const stripeNode = flatten(tree).find(
      (node) =>
        typeof node.props.style?.backgroundColor === 'string' &&
        node.props.style.backgroundColor === BRAND_500_HEX,
    );
    expect(stripeNode).toBeDefined();
  });

  it('renders the full name monochrome when no accent is supplied', () => {
    const tree = HomeOgTemplate({
      name: 'David Onasanya',
      role: 'Software Engineer',
      year: 2026,
    });
    // The single name span should not carry the brand colour when no
    // accent is set. We assert no `color: BRAND_500_HEX` style appears
    // on any text-bearing node other than the (intentional) stripe.
    const accentColored = flatten(tree).filter(
      (node) =>
        typeof node.props.style?.color === 'string' && node.props.style.color === BRAND_500_HEX,
    );
    expect(accentColored).toHaveLength(0);
  });

  it('throws OgForbiddenCharacterError when name contains a U+2014', () => {
    const emDash = String.fromCharCode(0x2014);
    try {
      HomeOgTemplate({
        name: `David${emDash}Onasanya`,
        role: 'Software Engineer',
        year: 2026,
      });
      throw new Error('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(OgForbiddenCharacterError);
      expect((error as OgForbiddenCharacterError).field).toBe('name');
      expect((error as OgForbiddenCharacterError).codePoint).toBe(0x2014);
    }
  });

  it('throws OgForbiddenCharacterError when role contains an emoji', () => {
    const emoji = String.fromCodePoint(0x1f600);
    try {
      HomeOgTemplate({
        name: 'David Onasanya',
        role: `Engineer ${emoji}`,
        year: 2026,
      });
      throw new Error('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(OgForbiddenCharacterError);
      expect((error as OgForbiddenCharacterError).field).toBe('role');
    }
  });

  it('throws when nameAccent carries a forbidden character', () => {
    const emDash = String.fromCharCode(0x2014);
    try {
      HomeOgTemplate({
        name: 'David Onasanya',
        nameAccent: `Onasanya${emDash}`,
        role: 'Software Engineer',
        year: 2026,
      });
      throw new Error('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(OgForbiddenCharacterError);
      expect((error as OgForbiddenCharacterError).field).toBe('nameAccent');
    }
  });
});
