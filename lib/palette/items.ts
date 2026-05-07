import type { Site } from '../schema';
import type { ThemeMode } from '../theme/resolve';

// PaletteAction is a tagged union so the component can dispatch each action
// without leaking DOM concerns into this module. Side-effects (scrollIntoView,
// router.push, theme set) live in CommandPalette.tsx; this file only describes
// what should happen when an item is selected.
export type PaletteAction =
  | { kind: 'scroll'; target: string }
  | { kind: 'link'; href: string; download?: boolean }
  | { kind: 'theme'; mode: ThemeMode };

export type PaletteGroup = 'Navigation' | 'Projects' | 'Contact' | 'Theme';

export interface PaletteItem {
  id: string;
  label: string;
  group: PaletteGroup;
  action: PaletteAction;
}

interface NavigationDescriptor {
  id: string;
  label: string;
  target: string;
  visible: (site: Site) => boolean;
}

// Order matters: the palette renders Navigation in this exact sequence. Each
// entry pairs a stable id with a human label and a visibility predicate so the
// list can be derived from the validated Site without any branching at the
// caller. Home is always included; the other anchors are gated by
// settings.visibility flags so the public layout and palette never disagree.
const NAVIGATION_ENTRIES: readonly NavigationDescriptor[] = [
  { id: 'nav-home', label: 'Home', target: '#home', visible: () => true },
  {
    id: 'nav-about',
    label: 'About',
    target: '#about',
    visible: (site) => site.settings.visibility.about,
  },
  {
    id: 'nav-skills',
    label: 'Skills',
    target: '#skills',
    visible: (site) => site.settings.visibility.skills,
  },
  {
    id: 'nav-experience',
    label: 'Experience',
    target: '#experience',
    visible: (site) => site.settings.visibility.experience,
  },
  {
    id: 'nav-ai-practice',
    label: 'AI Practice',
    target: '#ai-practice',
    visible: (site) => site.settings.visibility.ai,
  },
  {
    id: 'nav-projects',
    label: 'Projects',
    target: '#projects',
    visible: (site) => site.settings.visibility.work,
  },
] as const;

const THEME_ENTRIES: ReadonlyArray<{ id: string; label: string; mode: ThemeMode }> = [
  { id: 'theme-system', label: 'Theme: System', mode: 'system' },
  { id: 'theme-light', label: 'Theme: Light', mode: 'light' },
  { id: 'theme-dark', label: 'Theme: Dark', mode: 'dark' },
];

/**
 * buildPaletteItems takes the validated Site and returns the deterministic,
 * flat command list rendered by the palette. Order is fixed: Navigation,
 * Projects (one item per slug, in site order), Contact, Theme. Items are
 * filtered by site.settings.visibility; if commandPalette is disabled the
 * result is an empty array (the component still mounts but renders nothing).
 *
 * The function is pure and Node-safe so it can be unit-tested without a DOM.
 */
export function buildPaletteItems(site: Site): PaletteItem[] {
  if (!site.settings.visibility.commandPalette) {
    return [];
  }

  const items: PaletteItem[] = [];

  for (const entry of NAVIGATION_ENTRIES) {
    if (entry.visible(site)) {
      items.push({
        id: entry.id,
        label: entry.label,
        group: 'Navigation',
        action: { kind: 'scroll', target: entry.target },
      });
    }
  }

  if (site.settings.visibility.work) {
    for (const slug of site.projects) {
      items.push({
        id: `project-${slug}`,
        label: slug,
        group: 'Projects',
        action: { kind: 'link', href: `/projects/${slug}` },
      });
    }
  }

  items.push({
    id: 'contact-email',
    label: 'Email',
    group: 'Contact',
    action: { kind: 'link', href: `mailto:${site.person.email}` },
  });
  items.push({
    id: 'contact-github',
    label: 'GitHub',
    group: 'Contact',
    action: { kind: 'link', href: site.person.github },
  });
  items.push({
    id: 'contact-linkedin',
    label: 'LinkedIn',
    group: 'Contact',
    action: { kind: 'link', href: site.person.linkedin },
  });
  items.push({
    id: 'contact-cv',
    label: 'Download CV',
    group: 'Contact',
    action: { kind: 'link', href: site.person.cvUrl, download: true },
  });

  for (const theme of THEME_ENTRIES) {
    items.push({
      id: theme.id,
      label: theme.label,
      group: 'Theme',
      action: { kind: 'theme', mode: theme.mode },
    });
  }

  return items;
}
