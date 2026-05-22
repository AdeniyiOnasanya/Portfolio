'use client';

/**
 * Toast is the brief status pill the admin shows for "draft saved",
 * "publish opened a PR", and similar. Mirrors
 * design_handoff_portfolio/design/admin/admin-shared.jsx lines 23 to 39
 * (`useToast`, `Toast`) and the styling at
 * design_handoff_portfolio/design/admin.css lines 320 to 334
 * (`.admin-toast`, `.admin-toast.ok`, `.admin-toast.warn`).
 *
 * The toast is reserved for ambient status feedback: never use it for
 * field validation. Field-level Zod errors must surface inside the Field
 * primitive next to the input that produced them (issue #46). The toast
 * is announced to assistive tech via `role="status"` so it is read on
 * appearance without interrupting the user's focus.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastKind = 'ok' | 'warn';
export type ToastValue = { msg: string; kind: ToastKind } | null;

export type ToastProps = {
  toast: ToastValue;
};

export function Toast({ toast }: ToastProps) {
  if (!toast) return null;
  return (
    <div className={`admin-toast ${toast.kind}`} role="status" aria-live="polite">
      {toast.msg}
    </div>
  );
}

export type UseToastReturn = readonly [ToastValue, (msg: string, kind?: ToastKind) => void];

/**
 * useToast pairs with `<Toast />`. The host calls `show("draft saved")`
 * and the toast appears for 2200ms (matching the design timing) then
 * clears itself. Calling `show` while a toast is visible resets the
 * timer.
 */
export function useToast(): UseToastReturn {
  const [toast, setToast] = useState<ToastValue>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((msg: string, kind: ToastKind = 'ok') => {
    setToast({ msg, kind });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2200);
  }, []);
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  return [toast, show] as const;
}
