import { describe, expect, it } from 'vitest';
import { samplePerson, sampleProject } from '../../../components/public/__tests__/fixtures';
import { creativeWorkJsonLd, personJsonLd } from '../jsonld';

const ORIGIN = 'https://davidonasanya.com';

describe('personJsonLd', () => {
  it('returns a schema.org Person sourced from the validated person record', () => {
    const result = personJsonLd(samplePerson, ORIGIN);
    expect(result).toMatchInlineSnapshot(`
      {
        "@context": "https://schema.org",
        "@type": "Person",
        "email": "ada@example.com",
        "jobTitle": "Software Engineer",
        "name": "Ada Lovelace",
        "sameAs": [
          "https://github.com/example",
          "https://www.linkedin.com/in/example",
        ],
        "telephone": "07000 000000",
        "url": "https://davidonasanya.com",
      }
    `);
  });

  it('round-trips cleanly through JSON.parse(JSON.stringify(...))', () => {
    const result = personJsonLd(samplePerson, ORIGIN);
    const serialised = JSON.stringify(result);
    expect(JSON.parse(serialised)).toEqual(result);
  });

  it('uses the supplied origin verbatim for the url field', () => {
    const result = personJsonLd(samplePerson, 'https://staging.example.com');
    expect(result.url).toBe('https://staging.example.com');
  });
});

describe('creativeWorkJsonLd', () => {
  it('returns a schema.org CreativeWork sourced from the validated project record', () => {
    const result = creativeWorkJsonLd(sampleProject, ORIGIN);
    expect(result).toMatchInlineSnapshot(`
      {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "creator": {
          "@type": "Person",
          "name": "Lead engineer",
        },
        "dateCreated": "2024",
        "description": "A short summary of what this project does.",
        "name": "Sample Project",
        "url": "https://davidonasanya.com/projects/sample-project",
      }
    `);
  });

  it('round-trips cleanly through JSON.parse(JSON.stringify(...))', () => {
    const result = creativeWorkJsonLd(sampleProject, ORIGIN);
    const serialised = JSON.stringify(result);
    expect(JSON.parse(serialised)).toEqual(result);
  });

  it('builds the project url from origin and slug', () => {
    const result = creativeWorkJsonLd(sampleProject, 'https://staging.example.com');
    expect(result.url).toBe('https://staging.example.com/projects/sample-project');
  });
});
