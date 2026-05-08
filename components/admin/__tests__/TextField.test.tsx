import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TextField } from '../TextField';

describe('<TextField />', () => {
  it('renders the bound value and calls onChange with the next string', () => {
    const onChange = vi.fn();
    render(<TextField id="role" label="Role" value="Senior engineer" onChange={onChange} />);
    const input = screen.getByLabelText('Role') as HTMLInputElement;
    expect(input.value).toBe('Senior engineer');
    fireEvent.change(input, { target: { value: 'Staff engineer' } });
    expect(onChange).toHaveBeenCalledWith('Staff engineer');
  });

  it('coerces a null value to an empty string so React stays controlled', () => {
    render(<TextField id="role" label="Role" value={null} onChange={() => {}} />);
    expect((screen.getByLabelText('Role') as HTMLInputElement).value).toBe('');
  });

  it('shows the inline error and marks the input invalid', () => {
    render(
      <TextField id="role" label="Role" value="" onChange={() => {}} error="Role is required" />,
    );
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Role is required');
    const input = screen.getByLabelText('Role');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain('role-error');
  });

  it('clears the error and aria-invalid when the parent re-renders without an error', () => {
    const { rerender } = render(
      <TextField id="role" label="Role" value="" onChange={() => {}} error="Role is required" />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(<TextField id="role" label="Role" value="Staff engineer" onChange={() => {}} />);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByLabelText('Role')).not.toHaveAttribute('aria-invalid');
  });

  it('applies the mono class when mono is true', () => {
    render(<TextField id="hex" label="Hex" value="#5cd29c" onChange={() => {}} mono />);
    expect(screen.getByLabelText('Hex')).toHaveClass('mono');
  });
});
