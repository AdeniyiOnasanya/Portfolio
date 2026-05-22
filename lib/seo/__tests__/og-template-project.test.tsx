import { describe, expect, it } from 'vitest';
import { BRAND_500_HEX } from '../brand-colors';
import { OgForbiddenCharacterError, ProjectOgTemplate } from '../og-template';

/*
 * ProjectOgTemplate tests, Phase 9 slice #54.
 *
 * Parameterised over a representative subset of MDX frontmatter
 * shapes (long titles, multi-word kinds, single-word years). The
 * template returns a React element that Satori walks; the assertions
 * read the tree directly rather than going through React DOM.
 *
 * Three behaviours are pinned:
 *  - the project's display number, title, subtitle, kind, and year
 *    each render as visible text;
 *  - the display number paints in brand 500, the rest in the
 *    primary/muted tones;
 *  - any U+2014 or emoji in any of the five interpolated fields
 *    throws `OgForbiddenCharacterError` with the field name, so the
 *    route handler can map the throw to a 422 without inspecting the
 *    error message.
 */

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

const PROJECTS = [
  {
    n: '01',
    title: 'Vessel',
    subtitle: 'Hot-water compliance testing rig',
    kind: 'Electron app on Raspberry Pi',
    year: '2024',
  },
  {
    n: '04',
    title: 'Quorum',
    subtitle: 'Internal meeting and calendar tool',
    kind: 'React Native app',
    year: '2023',
  },
  {
    n: '07',
    title: 'Foster Care Platform',
    subtitle: 'Case management for social services',
    kind: 'Next.js web app',
    year: '2025',
  },
];

describe('ProjectOgTemplate', () => {
  it.each(PROJECTS)('renders all frontmatter fields for %s', (project) => {
    const tree = ProjectOgTemplate(project);
    const text = JSON.stringify(tree);
    expect(text).toContain(project.n);
    expect(text).toContain(project.title);
    expect(text).toContain(project.subtitle);
    expect(text).toContain(project.kind);
    expect(text).toContain(project.year);
  });

  it('paints the display number in brand 500', () => {
    const tree = ProjectOgTemplate(PROJECTS[0]!);
    const numberSpan = flatten(tree).find(
      (node) =>
        typeof node.props.children === 'string' &&
        node.props.children === PROJECTS[0]!.n &&
        typeof node.props.style?.color === 'string',
    );
    expect(numberSpan?.props.style?.color).toBe(BRAND_500_HEX);
  });

  it('renders the brand-500 vertical stripe', () => {
    const tree = ProjectOgTemplate(PROJECTS[0]!);
    const stripe = flatten(tree).find(
      (node) =>
        typeof node.props.style?.backgroundColor === 'string' &&
        node.props.style.backgroundColor === BRAND_500_HEX,
    );
    expect(stripe).toBeDefined();
  });

  it.each([
    'n',
    'title',
    'subtitle',
    'kind',
    'year',
  ] as const)('throws OgForbiddenCharacterError when %s contains U+2014', (field) => {
    const emDash = String.fromCharCode(0x2014);
    const input = { ...PROJECTS[0]!, [field]: `Has${emDash}offender` };
    try {
      ProjectOgTemplate(input);
      throw new Error('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(OgForbiddenCharacterError);
      expect((error as OgForbiddenCharacterError).field).toBe(field);
      expect((error as OgForbiddenCharacterError).codePoint).toBe(0x2014);
    }
  });

  it('throws when an emoji lands in the title field', () => {
    const emoji = String.fromCodePoint(0x1f680);
    try {
      ProjectOgTemplate({ ...PROJECTS[0]!, title: `Vessel ${emoji}` });
      throw new Error('expected throw');
    } catch (error) {
      expect(error).toBeInstanceOf(OgForbiddenCharacterError);
      expect((error as OgForbiddenCharacterError).field).toBe('title');
    }
  });
});
