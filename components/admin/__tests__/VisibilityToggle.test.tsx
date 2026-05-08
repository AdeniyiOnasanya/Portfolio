import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VisibilityToggle } from '../VisibilityToggle';

describe('<VisibilityToggle />', () => {
  it('renders as role="switch" with aria-checked reflecting the value', () => {
    render(<VisibilityToggle label="Hero" on={false} onChange={() => {}} />);
    const toggle = screen.getByRole('switch', { name: 'Hero' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('marks the .switch element with the .on class when on is true', () => {
    render(<VisibilityToggle label="Hero" on={true} onChange={() => {}} />);
    expect(screen.getByRole('switch', { name: 'Hero' })).toHaveClass('on');
  });

  it('toggles via click', () => {
    const onChange = vi.fn();
    render(<VisibilityToggle label="Hero" on={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Hero' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('toggles via Space and Enter keys', () => {
    const onChange = vi.fn();
    render(<VisibilityToggle label="Hero" on={true} onChange={onChange} />);
    const toggle = screen.getByRole('switch', { name: 'Hero' });
    fireEvent.keyDown(toggle, { key: ' ' });
    fireEvent.keyDown(toggle, { key: 'Enter' });
    expect(onChange).toHaveBeenNthCalledWith(1, false);
    expect(onChange).toHaveBeenNthCalledWith(2, false);
  });

  it('renders the optional sub copy beneath the label', () => {
    render(
      <VisibilityToggle label="Hero" sub="Hide on the public site" on={true} onChange={() => {}} />,
    );
    expect(screen.getByText('Hide on the public site')).toBeInTheDocument();
  });

  it('renders an inline error and wires aria-describedby when an id is provided', () => {
    render(
      <VisibilityToggle
        id="hero-visible"
        label="Hero"
        on={true}
        onChange={() => {}}
        error="Hero is locked"
      />,
    );
    const toggle = screen.getByRole('switch', { name: 'Hero' });
    expect(toggle).toHaveAttribute('aria-invalid', 'true');
    expect(toggle).toHaveAttribute('aria-describedby', 'hero-visible-error');
    expect(screen.getByRole('alert')).toHaveTextContent('Hero is locked');
  });
});
