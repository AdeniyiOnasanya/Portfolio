import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AiPractice } from '../AiPractice';
import { sampleAiPractice } from './fixtures';

describe('AiPractice', () => {
  it('renders an h2 inside a region labelled by the heading id', () => {
    render(<AiPractice ai={sampleAiPractice} />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveAttribute('id', 'ai-practice-heading');
    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-labelledby', 'ai-practice-heading');
    expect(region).toContainElement(heading);
  });

  it('preserves the inline em tag inside the headline', () => {
    const { container } = render(<AiPractice ai={sampleAiPractice} />);
    const em = container.querySelector('h2 em');
    expect(em).not.toBeNull();
    expect(em?.textContent).toBe('AI in the loop');
  });

  it('renders the eyebrow, intro, pillars, and workflow', () => {
    render(<AiPractice ai={sampleAiPractice} />);
    expect(screen.getByText(sampleAiPractice.eyebrow)).toBeInTheDocument();
    expect(screen.getByText(sampleAiPractice.intro)).toBeInTheDocument();
    for (const pillar of sampleAiPractice.pillars) {
      expect(screen.getByText(pillar.title)).toBeInTheDocument();
      expect(screen.getByText(pillar.body)).toBeInTheDocument();
    }
    for (const item of sampleAiPractice.workflow) {
      expect(screen.getByText(item.k)).toBeInTheDocument();
      expect(screen.getByText(item.v)).toBeInTheDocument();
    }
  });
});
