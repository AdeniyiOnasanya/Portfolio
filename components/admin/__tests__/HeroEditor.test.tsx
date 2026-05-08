import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * HeroEditor tests, Phase 7 slice #42.
 *
 * Three behaviours are pinned:
 *  - the form does not block typing on the network: state updates land on
 *    every keystroke, and the auto-save call is deferred behind the
 *    debounce window;
 *  - rapid keystrokes coalesce into one server-action call (debounce
 *    contract);
 *  - on a successful save, the status line shows a saved-at stamp
 *    derived from the action's `updatedAt` ISO string.
 *
 * The server action is mocked at module-level via `@/lib/draft/actions`;
 * fake timers are scoped per-test via `withFakeTimers` to avoid wedging
 * the global `cleanup()` afterEach hook from `vitest.setup.ts`. Each test
 * also calls `cleanup()` explicitly before the timers swap back so any
 * pending React work flushes against the real clock.
 */

const saveDraftActionMock = vi.fn();

vi.mock('@/lib/draft/actions', () => ({
  saveDraftAction: (...args: unknown[]) => saveDraftActionMock(...args),
}));

afterEach(() => {
  saveDraftActionMock.mockReset();
});

async function loadEditor() {
  const mod = await import('../HeroEditor');
  return mod.HeroEditor;
}

function findInputByLabel(container: HTMLElement, labelText: string): HTMLInputElement {
  const inputs = container.querySelectorAll<HTMLInputElement>('.f input');
  for (const input of inputs) {
    if (input.previousElementSibling?.textContent?.includes(labelText)) {
      return input;
    }
  }
  throw new Error(`input for label "${labelText}" not found`);
}

describe('<HeroEditor />', () => {
  it('renders the design header and the four field-grid inputs from admin-editors.jsx', async () => {
    const HeroEditor = await loadEditor();
    render(<HeroEditor initialDraft={null} initialUpdatedAt={null} />);
    expect(screen.getByText('Hero')).toBeInTheDocument();
    expect(screen.getByText('SECTION 01')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Location')).toBeInTheDocument();
    expect(screen.getByText('Years experience')).toBeInTheDocument();
    expect(screen.getByText('Personal statement')).toBeInTheDocument();
    expect(screen.getByText('Long bio (about section)')).toBeInTheDocument();
  });

  it('hydrates from the initial draft', async () => {
    const HeroEditor = await loadEditor();
    const { container } = render(
      <HeroEditor
        initialDraft={{
          person: {
            name: 'David Onasanya',
            role: 'Engineer',
            statement: 'Builds things that ship.',
            longBio: ['One.', 'Two.', 'Three.'],
          },
        }}
        initialUpdatedAt={null}
      />,
    );
    expect(findInputByLabel(container, 'Name').value).toBe('David Onasanya');
    const longBio = container.querySelector('textarea[rows="9"]') as HTMLTextAreaElement | null;
    expect(longBio?.value).toBe('One.\n\nTwo.\n\nThree.');
  });

  it('coalesces rapid keystrokes into a single saveDraftAction call', async () => {
    saveDraftActionMock.mockResolvedValue({ ok: true, updatedAt: new Date().toISOString() });
    const HeroEditor = await loadEditor();
    vi.useFakeTimers();
    try {
      const { container } = render(<HeroEditor initialDraft={null} initialUpdatedAt={null} />);
      const nameInput = findInputByLabel(container, 'Name');

      // Five keystrokes 50 ms apart, well inside the 300 ms window.
      const sequence = ['D', 'Da', 'Dav', 'Davi', 'David'];
      for (const next of sequence) {
        act(() => {
          fireEvent.change(nameInput, { target: { value: next } });
        });
        act(() => {
          vi.advanceTimersByTime(50);
        });
      }
      expect(saveDraftActionMock).not.toHaveBeenCalled();

      // Cross the debounce window.
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(saveDraftActionMock).toHaveBeenCalledTimes(1);
      const call = saveDraftActionMock.mock.calls[0];
      expect(call?.[0]).toBe('hero');
      const payload = call?.[1] as { person?: { name?: string } };
      expect(payload?.person?.name).toBe('David');
    } finally {
      cleanup();
      vi.useRealTimers();
    }
  });

  it('renders the "Show on site" toggle in the editor head row', async () => {
    const HeroEditor = await loadEditor();
    render(<HeroEditor initialDraft={null} initialUpdatedAt={null} />);
    const toggle = screen.getByRole('switch', { name: 'Show on site' });
    // initialHidden defaults to false, so the switch reads as on (visible).
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Section visible on public preview')).toBeInTheDocument();
  });

  it('hydrates the toggle from initialHidden', async () => {
    const HeroEditor = await loadEditor();
    render(<HeroEditor initialDraft={null} initialUpdatedAt={null} initialHidden={true} />);
    expect(screen.getByRole('switch', { name: 'Show on site' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('persists hidden:true via saveDraftAction when toggled off', async () => {
    saveDraftActionMock.mockResolvedValue({ ok: true, updatedAt: new Date().toISOString() });
    const HeroEditor = await loadEditor();
    render(
      <HeroEditor
        initialDraft={{ person: { name: 'David' } }}
        initialUpdatedAt={null}
        initialHidden={false}
      />,
    );
    await act(async () => {
      screen.getByRole('switch', { name: 'Show on site' }).click();
    });
    expect(saveDraftActionMock).toHaveBeenCalledTimes(1);
    expect(saveDraftActionMock).toHaveBeenCalledWith('hero', {
      person: { name: 'David' },
      hidden: true,
    });
  });

  it('flushes pending typing into the visibility save snapshot (no split state)', async () => {
    saveDraftActionMock.mockResolvedValue({ ok: true, updatedAt: new Date().toISOString() });
    const HeroEditor = await loadEditor();
    vi.useFakeTimers();
    try {
      const { container } = render(<HeroEditor initialDraft={null} initialUpdatedAt={null} />);
      const nameInput = findInputByLabel(container, 'Name');
      act(() => {
        fireEvent.change(nameInput, { target: { value: 'David' } });
      });
      // Within debounce window: no save yet.
      expect(saveDraftActionMock).not.toHaveBeenCalled();

      // Toggle the visibility, which should cancel the pending debounce
      // and save immediately with the latest typed value.
      await act(async () => {
        screen.getByRole('switch', { name: 'Show on site' }).click();
      });
      expect(saveDraftActionMock).toHaveBeenCalledTimes(1);
      expect(saveDraftActionMock).toHaveBeenCalledWith('hero', {
        person: { name: 'David' },
        hidden: true,
      });

      // The cancelled debounce should not fire a stale second call.
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(saveDraftActionMock).toHaveBeenCalledTimes(1);
    } finally {
      cleanup();
      vi.useRealTimers();
    }
  });

  it('shows the saved-at status after the action resolves', async () => {
    const stamp = new Date('2026-05-07T12:34:00Z');
    saveDraftActionMock.mockResolvedValue({ ok: true, updatedAt: stamp.toISOString() });
    const HeroEditor = await loadEditor();
    vi.useFakeTimers();
    try {
      const { container } = render(<HeroEditor initialDraft={null} initialUpdatedAt={null} />);
      const nameInput = findInputByLabel(container, 'Name');
      act(() => {
        fireEvent.change(nameInput, { target: { value: 'X' } });
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      // Drain pending microtasks (action promise + transition commit).
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      const status = screen.getByTestId('autosave-status');
      expect(status.textContent).toMatch(/Draft saved at/);
    } finally {
      cleanup();
      vi.useRealTimers();
    }
  });
});
