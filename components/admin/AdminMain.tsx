'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * Two-column main slot for the admin shell.
 *
 * Mirrors `design_handoff_portfolio/design/admin/admin-app.jsx` line 181
 * (`<div className={"admin-main" + (showPreview ? "" : " no-preview")}>`)
 * and the matching CSS rule in `design_handoff_portfolio/design/admin.css`
 * lines 147 to 153 (`.admin-main` is a 1fr 1fr grid; `.admin-main.no-preview`
 * collapses to a single column).
 *
 * The design holds preview visibility in client state. Slice #43 routes the
 * preview through its own URL (`/admin/preview`) instead so a deep link
 * can land directly on the split-pane view, and so the layout is a
 * server component everywhere else. The `usePathname` read here is the
 * minimum client surface we need to flip the column count: every other
 * /admin/* route stays single-column.
 *
 * The element renders as `<main>` to keep the landmark shape from slice
 * #41 intact; screen-reader users still hear the same "Editor" heading
 * inside the same main region.
 */

const PREVIEW_PATH_PREFIX = '/admin/preview';

export function AdminMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPreview = pathname?.startsWith(PREVIEW_PATH_PREFIX) ?? false;
  if (isPreview) {
    // The preview page owns both grid cells (`.admin-editor` and
    // `.admin-preview`) so it can place the editor on the left and the
    // live render on the right. The layout cedes the inner wrapper here
    // and renders the page directly inside the grid.
    return <main className="admin-main">{children}</main>;
  }
  return (
    <main className="admin-main no-preview">
      <div className="admin-editor">{children}</div>
    </main>
  );
}
