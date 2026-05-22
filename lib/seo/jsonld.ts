import type { Person, Project } from '../schema';

// Generic JSON-LD value type. Schema.org graphs are nested key-value trees of
// strings, numbers, booleans, arrays, and child objects. The shape varies per
// @type, so the helpers below return narrow object literals rather than a
// shared interface; the `JsonLdValue` alias only exists to keep `JSON.stringify`
// happy at the call site without a `Record<string, unknown>` cast.
export type JsonLdValue =
  | string
  | number
  | boolean
  | null
  | JsonLdValue[]
  | { [key: string]: JsonLdValue };

export type PersonJsonLd = {
  '@context': 'https://schema.org';
  '@type': 'Person';
  name: string;
  jobTitle: string;
  email: string;
  telephone: string;
  url: string;
  image: string;
  sameAs: string[];
};

export type CreativeWorkJsonLd = {
  '@context': 'https://schema.org';
  '@type': 'CreativeWork';
  name: string;
  description: string;
  url: string;
  dateCreated: string;
  genre: string;
  image: string;
  creator: {
    '@type': 'Person';
    name: string;
  };
};

// personJsonLd builds the schema.org Person record that mounts on the home
// page as a `<script type="application/ld+json">` tag in the page body, per
// Next.js 16 official guidance (/vercel/next.js/v16.2.2 docs/01-app/02-guides
// /json-ld.mdx). Every field comes from the validated `person` block in
// site.json so the search-engine view of the site cannot drift from the page
// view; the URL is the canonical origin returned by `siteOrigin()` so preview
// and production builds emit the right host.
export function personJsonLd(person: Person, origin: string): PersonJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    jobTitle: person.role,
    email: person.email,
    telephone: person.phone,
    url: origin,
    // `image` points at the home OG card so Google's Person rich
    // result (https://developers.google.com/search/docs/appearance/
    // structured-data/person) has a representative image. The route
    // was added in Phase 9 slice #53 and serves the same 1200x630 PNG
    // that openGraph + twitter metadata already advertises.
    image: `${origin}/api/og`,
    sameAs: [person.github, person.linkedin],
  };
}

// creativeWorkJsonLd builds the schema.org CreativeWork record that mounts on
// /projects/<slug> as a `<script type="application/ld+json">` tag in the page
// body, per the same Next.js 16 guidance cited on personJsonLd. The creator
// resolves to the site owner: `project.role` is a free-text job-title string
// like "Lead engineer" and would fail Google's Rich Results validation, so the
// creator is sourced from the validated site.person record instead.
export function creativeWorkJsonLd(
  project: Project,
  person: Person,
  origin: string,
): CreativeWorkJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    description: project.summary,
    url: `${origin}/projects/${project.slug}`,
    dateCreated: project.year,
    // `genre` maps to project.kind ("React Native app", "Electron app
    // on Raspberry Pi"). Google's CreativeWork schema treats genre as
    // a free-text descriptor of the work's category; using `kind`
    // keeps it readable in the SERP without inventing taxonomy.
    genre: project.kind,
    // `image` points at the per-project OG card from slice #54 so the
    // rich result has a project-specific preview rather than the
    // home card.
    image: `${origin}/api/og/${project.slug}`,
    creator: {
      '@type': 'Person',
      name: person.name,
    },
  };
}

// serializeJsonLd renders a JSON-LD value as a string safe to embed inside a
// <script type="application/ld+json"> element. JSON.stringify alone leaves
// raw `<` characters in the output, so a description containing the literal
// substring `</script>` (which SafeText does not block; only U+2014 and
// emoji are refined) could close the inline script tag and inject HTML. The
// standard mitigation is to escape `<`, `>`, and `&` as `\uXXXX` sequences;
// the result is still valid JSON and parsers reverse the escape transparently.
export function serializeJsonLd(value: JsonLdValue): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
