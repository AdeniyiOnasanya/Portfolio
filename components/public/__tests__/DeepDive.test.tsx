import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DeepDive } from '../DeepDive';
import { sampleProject } from './fixtures';

const data = sampleProject.deepDive;
if (!data) {
  throw new Error('sampleProject.deepDive must be defined for these tests.');
}

describe('DeepDive', () => {
  it('renders the section heading at h2 level', () => {
    render(<DeepDive data={data} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Deep dive' })).toBeInTheDocument();
  });

  it('renders the metrics intro and one entry per metric', () => {
    render(<DeepDive data={data} />);
    expect(screen.getByText(data.metricsIntro)).toBeInTheDocument();
    for (const metric of data.metrics) {
      expect(screen.getByText(metric.label)).toBeInTheDocument();
    }
  });

  it('renders the before/after intro and both labels', () => {
    render(<DeepDive data={data} />);
    expect(screen.getByText(data.beforeAfter.intro)).toBeInTheDocument();
    expect(screen.getByText(data.beforeAfter.beforeLabel)).toBeInTheDocument();
    expect(screen.getByText(data.beforeAfter.afterLabel)).toBeInTheDocument();
  });

  it('renders one process step per entry', () => {
    render(<DeepDive data={data} />);
    for (const step of data.process) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
      expect(screen.getByText(step.desc)).toBeInTheDocument();
    }
  });

  it('renders one lesson per entry', () => {
    render(<DeepDive data={data} />);
    for (const lesson of data.lessons) {
      expect(screen.getByText(lesson.title)).toBeInTheDocument();
      expect(screen.getByText(lesson.body)).toBeInTheDocument();
    }
  });
});
