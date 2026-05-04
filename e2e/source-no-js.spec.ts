import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Server-rendering smoke for the public home (issue #26).
 *
 * Asserts that every body string declared in `content/site.json` is present
 * in the raw HTML returned by `/`, with JavaScript disabled at the test
 * context level. The slice ships no structural code; the spec exists to
 * lock in that the existing tree is composed entirely of React Server
 * Components (no client-only render gates around content).
 *
 * Pattern reference: Playwright `BrowserContext` honours `javaScriptEnabled`
 * (Context7: `/microsoft/playwright`). `test.use({ javaScriptEnabled: false })`
 * applies that flag to every test in the file. We additionally fetch the
 * HTML via `request.get(baseUrl)` because the source-of-truth check is the
 * server response, not what the runtime DOM renders; `request` is unaffected
 * by the JS toggle but is the canonical way to read pre-hydration HTML.
 *
 * webServer is not wired in playwright.config.ts yet (Phase 6 #67). Until
 * that lands the spec is opt-in via E2E_BASE_URL, e.g.
 *
 *   E2E_BASE_URL=http://localhost:3000 pnpm test:e2e e2e/source-no-js.spec.ts
 *
 * with `pnpm dev` running in another terminal. CI skips it cleanly.
 */
const baseUrl = process.env.E2E_BASE_URL;

type SkillGroup = { label: string; items: string[] };
type ExperienceEntry = {
  role: string;
  company: string;
  where: string;
  when: string;
  desc: string;
  tags: string[];
};
type Pillar = { title: string; body: string };
type WorkflowItem = { k: string; v: string };
type SiteContent = {
  person: {
    name: string;
    role: string;
    location: string;
    statement: string;
    longBio: string[];
  };
  skills: SkillGroup[];
  experience: ExperienceEntry[];
  aiPractice: {
    eyebrow: string;
    headline: string;
    intro: string;
    pillars: Pillar[];
    workflow: WorkflowItem[];
  };
  footer: {
    heading: string;
    copy: string;
    availability: string;
    copyright: string;
  };
};

function loadSiteContent(): SiteContent {
  const filePath = path.resolve(__dirname, '..', 'content', 'site.json');
  return JSON.parse(readFileSync(filePath, 'utf8')) as SiteContent;
}

// Runtime guard for the unsafe `as SiteContent` cast above. content/site.json
// is repo-controlled and Zod-validated by the production loader at boot, so
// today the cast is sound; this guard exists so a future schema drift fails
// the spec with a readable "field missing" error rather than a confusing
// `toContain(undefined)` from Playwright.
function assertCollectedStrings(strings: unknown[]): asserts strings is string[] {
  for (let i = 0; i < strings.length; i += 1) {
    const value = strings[i];
    if (typeof value !== 'string' || value.length === 0) {
      throw new Error(
        `source-no-js spec: expected every collected body string to be a non-empty string; ` +
          `index ${i} is ${typeof value} (${String(value)}). content/site.json shape may have drifted.`,
      );
    }
  }
}

// Strip inline <em> wrappers so the visible text on either side of the tag
// can be matched as a single substring. The Hero name accent and the AI
// practice headline both inject <em> spans that fragment otherwise-contiguous
// content. No other tag is stripped: the assertion is text presence, not
// markup absence.
function stripInlineEm(input: string): string {
  return input.replace(/<\/?em\b[^>]*>/gi, '');
}

// Decode the small set of HTML entities Next emits in server-rendered text:
// React escapes apostrophes as `&#x27;` (or `&#39;`), ampersands as `&amp;`,
// and quotes/angle-brackets defensively. Decoding before substring check
// keeps the spec resilient to those without dragging in a parser dependency.
function decodeCommonEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function normaliseHtml(html: string): string {
  return decodeCommonEntities(stripInlineEm(html));
}

function collectBodyStrings(site: SiteContent): string[] {
  const strings: string[] = [];
  const { person, skills, experience, aiPractice, footer } = site;

  strings.push(person.name, person.role, person.location, person.statement);
  for (const paragraph of person.longBio) {
    strings.push(paragraph);
  }

  for (const group of skills) {
    strings.push(group.label);
    for (const item of group.items) {
      strings.push(item);
    }
  }

  for (const entry of experience) {
    strings.push(entry.role, entry.company, entry.where, entry.when, entry.desc);
    for (const tag of entry.tags) {
      strings.push(tag);
    }
  }

  strings.push(aiPractice.eyebrow, aiPractice.intro);
  // The headline carries an inline <em> in the source; assert the visible
  // text only. The rendered HTML is normalised the same way before the
  // substring check, so the `<em>` framing on either end matches up.
  strings.push(stripInlineEm(aiPractice.headline));
  for (const pillar of aiPractice.pillars) {
    strings.push(pillar.title, pillar.body);
  }
  for (const item of aiPractice.workflow) {
    strings.push(item.k, item.v);
  }

  strings.push(footer.heading, footer.copy, footer.availability, footer.copyright);

  return strings;
}

test.describe('Public home server-rendering', () => {
  test.use({ javaScriptEnabled: false });
  test.skip(!baseUrl, 'E2E_BASE_URL not set; webServer arrives in #67.');

  test('every body string in content/site.json appears in the raw / HTML', async ({ request }) => {
    if (!baseUrl) {
      // Type narrowing for the request below; the skip above covers runtime.
      throw new Error('E2E_BASE_URL must be set when this test runs.');
    }

    const response = await request.get(baseUrl);
    expect(response.status(), '/ should respond 200 with JS disabled').toBe(200);

    const html = normaliseHtml(await response.text());
    const site = loadSiteContent();
    const expectedStrings: unknown[] = collectBodyStrings(site);
    assertCollectedStrings(expectedStrings);

    for (const expected of expectedStrings) {
      expect(html, `expected to find body string in / HTML: ${expected}`).toContain(expected);
    }
  });
});
