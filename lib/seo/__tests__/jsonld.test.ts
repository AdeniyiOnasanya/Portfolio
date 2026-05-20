import { describe, expect, it } from 'vitest';
import { samplePerson, sampleProject } from '../../../components/public/__tests__/fixtures';
import { creativeWorkJsonLd, personJsonLd, serializeJsonLd } from '../jsonld';

const ORIGIN = 'https://davidonasanya.com';

describe('personJsonLd', () => {
  it('returns a schema.org Person sourced from the validated person record', () => {
    const result = personJsonLd(samplePerson, ORIGIN);
    expect(result).toMatchInlineSnapshot(`
      {
        "@context": "https://schema.org",
        "@type": "Person",
        "email": "ada@example.com",
        "image": "https://davidonasanya.com/api/og",
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

  it('points image at the home OG route on the supplied origin', () => {
    const result = personJsonLd(samplePerson, 'https://staging.example.com');
    expect(result.image).toBe('https://staging.example.com/api/og');
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
    const result = creativeWorkJsonLd(sampleProject, samplePerson, ORIGIN);
    expect(result).toMatchInlineSnapshot(`
      {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "creator": {
          "@type": "Person",
          "name": "Ada Lovelace",
        },
        "dateCreated": "2024",
        "description": "A short summary of what this project does.",
        "genre": "Web platform",
        "image": "https://davidonasanya.com/api/og/sample-project",
        "name": "Sample Project",
        "url": "https://davidonasanya.com/projects/sample-project",
      }
    `);
  });

  it('points image at /api/og/<slug> on the supplied origin', () => {
    const result = creativeWorkJsonLd(sampleProject, samplePerson, 'https://staging.example.com');
    expect(result.image).toBe('https://staging.example.com/api/og/sample-project');
  });

  it('maps genre from project.kind', () => {
    const result = creativeWorkJsonLd(sampleProject, samplePerson, ORIGIN);
    expect(result.genre).toBe(sampleProject.kind);
  });

  it('round-trips cleanly through JSON.parse(JSON.stringify(...))', () => {
    const result = creativeWorkJsonLd(sampleProject, samplePerson, ORIGIN);
    const serialised = JSON.stringify(result);
    expect(JSON.parse(serialised)).toEqual(result);
  });

  it('builds the project url from origin and slug', () => {
    const result = creativeWorkJsonLd(sampleProject, samplePerson, 'https://staging.example.com');
    expect(result.url).toBe('https://staging.example.com/projects/sample-project');
  });

  it('sources creator.name from person.name, not project.role', () => {
    const result = creativeWorkJsonLd(sampleProject, samplePerson, ORIGIN);
    expect(result.creator.name).toBe(samplePerson.name);
    expect(result.creator.name).not.toBe(sampleProject.role);
  });
});

describe('serializeJsonLd', () => {
  it('round-trips a Person record through JSON.parse', () => {
    const value = personJsonLd(samplePerson, 'https://davidonasanya.com');
    expect(JSON.parse(serializeJsonLd(value))).toEqual(value);
  });

  it('escapes < > & so a stray </script> substring cannot break the inline tag', () => {
    const malicious = {
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      description: '</script><script>alert(1)</script>',
      flag: 'a & b',
    };
    const serialised = serializeJsonLd(malicious);
    expect(serialised).not.toContain('<');
    expect(serialised).not.toContain('>');
    expect(serialised).not.toContain('&');
    expect(serialised).toContain('\\u003c');
    expect(serialised).toContain('\\u003e');
    expect(serialised).toContain('\\u0026');
    expect(JSON.parse(serialised)).toEqual(malicious);
  });
});
