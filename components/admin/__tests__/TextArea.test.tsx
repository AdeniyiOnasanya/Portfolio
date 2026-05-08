import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TextArea } from '../TextArea';

describe('<TextArea />', () => {
  it('renders the bound value and emits onChange', () => {
    const onChange = vi.fn();
    render(<TextArea id="bio" label="Bio" value="One line." onChange={onChange} />);
    const input = screen.getByLabelText('Bio') as HTMLTextAreaElement;
    expect(input.value).toBe('One line.');
    fireEvent.change(input, { target: { value: 'Two lines.' } });
    expect(onChange).toHaveBeenCalledWith('Two lines.');
  });

  it('shows the inline error with role="alert"', () => {
    render(
      <TextArea id="bio" label="Bio" value="" onChange={() => {}} error="Bio must not be empty" />,
    );
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Bio must not be empty');
    expect(screen.getByLabelText('Bio')).toHaveAttribute('aria-invalid', 'true');
  });

  it('uses the rows prop as the textarea row count', () => {
    render(<TextArea id="bio" label="Bio" value="" onChange={() => {}} rows={6} />);
    expect(screen.getByLabelText('Bio')).toHaveAttribute('rows', '6');
  });
});
