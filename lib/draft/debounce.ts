/**
 * Tiny debounce helper used by the admin editors to batch rapid keystrokes
 * into a single auto-save call.
 *
 * Why a hand-rolled util rather than a dependency: the admin auto-save flow
 * needs predictable behaviour around three edge cases that off-the-shelf
 * helpers handle inconsistently (cancel returns the pending call to "never
 * fired"; flush executes the pending call immediately and clears the timer;
 * the trailing edge is the only fire mode). Pinning that contract here is
 * cheaper than wrapping a library and explaining the override.
 *
 * The function is generic over the wrapped callback. The returned object
 * preserves the original argument types so call sites stay type-safe; the
 * `cancel` and `flush` controls are exposed for unit tests and for the
 * `unmount` cleanup in the editor components.
 *
 * `wait` must be a non-negative finite number; a `0` wait still defers the
 * call to the next macrotask (`setTimeout(fn, 0)`) so React's batched state
 * updates have a chance to commit before the network request fires.
 */

export type Debounced<TArgs extends readonly unknown[]> = {
  (...args: TArgs): void;
  cancel: () => void;
  flush: () => void;
};

export function debounce<TArgs extends readonly unknown[]>(
  fn: (...args: TArgs) => void,
  wait: number,
): Debounced<TArgs> {
  if (!Number.isFinite(wait) || wait < 0) {
    throw new Error('debounce: wait must be a non-negative finite number');
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: TArgs | null = null;

  function clear(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function invoke(): void {
    if (pendingArgs === null) return;
    const args = pendingArgs;
    pendingArgs = null;
    timer = null;
    fn(...args);
  }

  const debounced = ((...args: TArgs) => {
    pendingArgs = args;
    clear();
    timer = setTimeout(invoke, wait);
  }) as Debounced<TArgs>;

  debounced.cancel = () => {
    clear();
    pendingArgs = null;
  };

  debounced.flush = () => {
    if (timer === null) return;
    clear();
    invoke();
  };

  return debounced;
}
