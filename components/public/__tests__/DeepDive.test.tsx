import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DeepDive } from '../DeepDive';
import { sampleProject } from './fixtures';

vi.mock('../../../lib/motion/preferences', () => ({
  prefersReducedMotion: () => false,
  usePrefersReducedMotion: () => false,
}));

const data = sampleProject.deepDive;
if (!data) {
  throw new Error('sampleProject.deepDive must be defined for these tests.');
}

describe('DeepDive', () => {
  it('renders a Deep dive region landmark', () => {
    render(<DeepDive data={data} n={sampleProject.n} />);
    expect(screen.getByRole('region', { name: 'Deep dive' })).toBeInTheDocument();
  });

  it('renders the metrics intro and one entry per metric', () => {
    render(<DeepDive data={data} n={sampleProject.n} />);
    expect(screen.getByText(data.metricsIntro)).toBeInTheDocument();
    for (const metric of data.metrics) {
      expect(screen.getByText(metric.label)).toBeInTheDocument();
    }
  });

  it('renders the before/after intro', () => {
    render(<DeepDive data={data} n={sampleProject.n} />);
    expect(screen.getByText(data.beforeAfter.intro)).toBeInTheDocument();
  });

  it('renders one process step per entry', () => {
    render(<DeepDive data={data} n={sampleProject.n} />);
    for (const step of data.process) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
      expect(screen.getByText(step.desc)).toBeInTheDocument();
    }
  });

  it('renders one lesson per entry', () => {
    render(<DeepDive data={data} n={sampleProject.n} />);
    for (const lesson of data.lessons) {
      expect(screen.getByText(lesson.title)).toBeInTheDocument();
      expect(screen.getByText(lesson.body)).toBeInTheDocument();
    }
  });
});
