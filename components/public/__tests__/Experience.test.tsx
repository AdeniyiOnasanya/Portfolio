import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Experience } from '../Experience';
import { sampleCerts, sampleEducation, sampleExperience } from './fixtures';

describe('Experience', () => {
  it('renders an Experience region with an h2 inside', () => {
    render(
      <Experience experience={sampleExperience} education={sampleEducation} certs={sampleCerts} />,
    );
    const region = screen.getByRole('region', { name: 'Experience' });
    const heading = screen.getByRole('heading', { level: 2 });
    expect(region).toContainElement(heading);
  });

  it('renders one article per role', () => {
    render(
      <Experience experience={sampleExperience} education={sampleEducation} certs={sampleCerts} />,
    );
    for (const entry of sampleExperience) {
      expect(screen.getByText(entry.role)).toBeInTheDocument();
      expect(screen.getByText(entry.company)).toBeInTheDocument();
    }
  });

  it('renders the company, when, where, desc, and tags for each entry', () => {
    render(
      <Experience experience={sampleExperience} education={sampleEducation} certs={sampleCerts} />,
    );
    for (const entry of sampleExperience) {
      expect(screen.getByText(entry.where)).toBeInTheDocument();
      expect(screen.getByText(entry.desc)).toBeInTheDocument();
      for (const tag of entry.tags) {
        expect(screen.getByText(tag)).toBeInTheDocument();
      }
    }
  });

  it('renders education and certifications blocks at the tail', () => {
    render(
      <Experience experience={sampleExperience} education={sampleEducation} certs={sampleCerts} />,
    );
    expect(screen.getByText(sampleEducation[0].degree)).toBeInTheDocument();
    expect(screen.getByText(sampleEducation[0].school)).toBeInTheDocument();
    for (const cert of sampleCerts) {
      expect(screen.getByText(cert)).toBeInTheDocument();
    }
  });
});
