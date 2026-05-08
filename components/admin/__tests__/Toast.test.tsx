import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Toast, useToast } from '../Toast';

describe('<Toast />', () => {
  it('renders nothing when toast is null', () => {
    const { container } = render(<Toast toast={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the message with role="status" and the kind class', () => {
    render(<Toast toast={{ msg: 'Draft saved', kind: 'ok' }} />);
    const toast = screen.getByRole('status');
    expect(toast).toHaveTextContent('Draft saved');
    expect(toast).toHaveClass('admin-toast', 'ok');
  });

  it('uses the warn class for warn kind', () => {
    render(<Toast toast={{ msg: 'Save failed', kind: 'warn' }} />);
    expect(screen.getByRole('status')).toHaveClass('warn');
  });
});

// useToast is exercised through a small host component rather than via
// renderHook so fake timers compose cleanly with Testing Library's act-based
// scheduling under happy-dom.
function ToastHost({ kind = 'ok' as 'ok' | 'warn', msg = 'Draft saved' }) {
  const [toast, show] = useToast();
  return (
    <div>
      <button type="button" onClick={() => show(msg, kind)}>
        show
      </button>
      <Toast toast={toast} />
    </div>
  );
}

describe('useToast()', () => {
  it('starts with no toast and shows one when show() is called', () => {
    render(<ToastHost />);
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'show' }));
    expect(screen.getByRole('status')).toHaveTextContent('Draft saved');
  });

  it('clears the toast after 2200ms', async () => {
    vi.useFakeTimers();
    try {
      render(<ToastHost />);
      fireEvent.click(screen.getByRole('button', { name: 'show' }));
      expect(screen.getByRole('status')).toBeInTheDocument();
      await act(async () => {
        vi.advanceTimersByTime(2200);
      });
      expect(screen.queryByRole('status')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('resets the timer when show() is called a second time before clear', async () => {
    vi.useFakeTimers();
    try {
      render(<ToastHost />);
      fireEvent.click(screen.getByRole('button', { name: 'show' }));
      await act(async () => {
        vi.advanceTimersByTime(1500);
      });
      fireEvent.click(screen.getByRole('button', { name: 'show' }));
      // 1500ms more brings the original timer past 2200ms; the second call
      // reset the timer, so the toast is still visible.
      await act(async () => {
        vi.advanceTimersByTime(1500);
      });
      expect(screen.getByRole('status')).toBeInTheDocument();
      // The reset timer fires at 2200ms after the second call.
      await act(async () => {
        vi.advanceTimersByTime(800);
      });
      expect(screen.queryByRole('status')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
