import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownField } from '../MarkdownField';

describe('<MarkdownField />', () => {
  it('defaults the hint to "Markdown" and uses 8 rows', () => {
    render(<MarkdownField id="problem" label="Problem" value="" onChange={() => {}} />);
    expect(screen.getByText('Markdown')).toBeInTheDocument();
    const input = screen.getByLabelText(/Problem/);
    expect(input).toHaveAttribute('rows', '8');
    expect(input).toHaveClass('markdown');
  });

  it('emits onChange with the next string', () => {
    const onChange = vi.fn();
    render(<MarkdownField id="problem" label="Problem" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/Problem/), {
      target: { value: '## Hello' },
    });
    expect(onChange).toHaveBeenCalledWith('## Hello');
  });

  it('renders the inline error', () => {
    render(
      <MarkdownField
        id="problem"
        label="Problem"
        value=""
        onChange={() => {}}
        error="Problem must not be empty"
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Problem must not be empty');
    expect(screen.getByLabelText(/Problem/)).toHaveAttribute('aria-invalid', 'true');
  });
});
