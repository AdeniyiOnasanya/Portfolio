import { describe, expect, it, vi } from 'vitest';
import { debounce } from '../debounce';

/*
 * Debounce timing tests, Phase 7 slice #42.
 *
 * The admin Hero editor depends on this util to coalesce keystrokes into a
 * single auto-save call. The slice spec gives the round-trip a 350 ms budget
 * (last keystroke -> server action returns); the client-side debounce window
 * is 300 ms, leaving 50 ms for the action. These tests pin the timing
 * contract:
 *  - the wrapped function never fires before `wait` ms;
 *  - rapid calls reset the timer (only the trailing call lands);
 *  - `cancel` clears pending invocations;
 *  - `flush` fires the pending call immediately;
 *  - the latest arguments win, not the first.
 *
 * Vitest's fake timers drive the clock; real `setTimeout` would make the
 * suite flaky on slow runners. Each test installs and uninstalls the fake
 * clock in-place rather than relying on a module-level afterEach hook,
 * because the global `cleanup()` registered in `vitest.setup.ts` schedules
 * a microtask that can wedge if the fake clock is still installed when the
 * teardown runs.
 */

function withFakeTimers(run: () => void): void {
  vi.useFakeTimers();
  try {
    run();
  } finally {
    vi.useRealTimers();
  }
}

describe('debounce', () => {
  it('fires the wrapped fn once after the wait window with the latest args', () => {
    withFakeTimers(() => {
      const fn = vi.fn();
      const debounced = debounce(fn, 300);
      debounced('a');
      debounced('b');
      debounced('c');
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(299);
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('c');
    });
  });

  it('resets the timer on each call so a steady stream never fires', () => {
    withFakeTimers(() => {
      const fn = vi.fn();
      const debounced = debounce(fn, 300);
      for (let i = 0; i < 10; i++) {
        debounced(i);
        vi.advanceTimersByTime(299);
      }
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(9);
    });
  });

  it('cancel clears the pending invocation', () => {
    withFakeTimers(() => {
      const fn = vi.fn();
      const debounced = debounce(fn, 300);
      debounced('once');
      debounced.cancel();
      vi.advanceTimersByTime(1000);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  it('flush fires the pending call immediately and clears the timer', () => {
    withFakeTimers(() => {
      const fn = vi.fn();
      const debounced = debounce(fn, 300);
      debounced('x');
      debounced.flush();
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('x');
      vi.advanceTimersByTime(1000);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  it('flush is a no-op when nothing is pending', () => {
    withFakeTimers(() => {
      const fn = vi.fn();
      const debounced = debounce(fn, 300);
      debounced.flush();
      expect(fn).not.toHaveBeenCalled();
    });
  });

  it('supports a 0 ms wait, deferring to the next macrotask', () => {
    withFakeTimers(() => {
      const fn = vi.fn();
      const debounced = debounce(fn, 0);
      debounced();
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(0);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  it('rejects a negative wait', () => {
    expect(() => debounce(() => {}, -1)).toThrow(/non-negative/);
  });

  it('rejects a non-finite wait', () => {
    expect(() => debounce(() => {}, Number.POSITIVE_INFINITY)).toThrow(/finite/);
    expect(() => debounce(() => {}, Number.NaN)).toThrow(/finite/);
  });
});
