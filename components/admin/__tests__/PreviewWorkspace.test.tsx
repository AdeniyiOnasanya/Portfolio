import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Hero, Person, Skills } from '@/lib/schema';

/*
 * PreviewWorkspace tests, Phase 7 slice #43.
 *
 * The slice's headline acceptance criterion is "edit on the left, preview
 * on the right updates without full rehydration on every keystroke". The
 * way that contract is honoured is by sharing optimistic state across the
 * editor and the preview render, so this suite asserts:
 *  - the initial render shows the published baseline person values inside
 *    the right-hand `<Hero>` (not just inside the editor inputs);
 *  - typing into an editor input updates the preview's rendered DOM in
 *    the same React commit, before any `saveDraftAction` call resolves;
 *  - the editor's debounced `saveDraftAction` is still wired and fires on
 *    its own schedule (we do not regress slice #42's contract).
 *
 * Mocks. `saveDraftAction` is mocked at module scope so the test does
 * not pull next-auth or the Postgres client into the suite. The public
 * `<Hero>` keeps its real implementation because the contract is "real
 * preview render, not a stub".
 */

const saveDraftActionMock = vi.fn();

vi.mock('@/lib/draft/actions', () => ({
  saveDraftAction: (...args: unknown[]) => saveDraftActionMock(...args),
}));

afterEach(() => {
  saveDraftActionMock.mockReset();
});

const basePerson: Person = {
  name: 'David Onasanya',
  nameAccent: 'Onasanya',
  role: 'Senior Engineer',
  location: 'London',
  phone: '+44 0000',
  email: 'hello@example.com',
  cvUrl: '/cv/david.pdf',
  cvDocxUrl: '/cv/david.docx',
  github: 'https://github.com/example',
  linkedin: 'https://linkedin.com/in/example',
  yearsExp: 9,
  estYear: '2016',
  statement: 'Builds calm interfaces.',
  longBio: ['One.', 'Two.', 'Three.'],
};

const baseHero: Hero = {
  meta: ['London', 'Available'],
  stats: [
    { value: '9', label: 'Years' },
    { value: '40', label: 'Ships' },
    { value: '5', label: 'Teams' },
  ],
};

const baseSkills: Skills = [{ label: 'Frontend', items: ['React', 'TypeScript'] }];

async function loadWorkspace() {
  const mod = await import('../PreviewWorkspace');
  return mod.PreviewWorkspace;
}

describe('<PreviewWorkspace />', () => {
  it('renders both the editor pane and the preview pane with baseline content', async () => {
    const PreviewWorkspace = await loadWorkspace();
    render(
      <PreviewWorkspace
        initialDraft={null}
        initialUpdatedAt={null}
        basePerson={basePerson}
        baseHero={baseHero}
        baseSkills={baseSkills}
      />,
    );
    // Editor pane: the section heading and the field grid render.
    expect(screen.getByText('Hero')).toBeInTheDocument();
    expect(screen.getByText('SECTION 01')).toBeInTheDocument();
    // Preview pane: the live `<Hero>` render carries the baseline name
    // accent ("Onasanya") split out of the full name. The `<em>` wraps
    // the accent in the second `<span class="line-mask">`.
    const preview = screen.getByTestId('admin-preview');
    expect(within(preview).getByText('Live preview')).toBeInTheDocument();
    expect(within(preview).getByText('David')).toBeInTheDocument();
    expect(within(preview).getByText('Onasanya')).toBeInTheDocument();
  });

  it('mirrors editor keystrokes into the preview render in the same React commit', async () => {
    const PreviewWorkspace = await loadWorkspace();
    const { container } = render(
      <PreviewWorkspace
        initialDraft={{ person: { name: 'David Onasanya', statement: 'Old statement.' } }}
        initialUpdatedAt={null}
        basePerson={basePerson}
        baseHero={baseHero}
        baseSkills={baseSkills}
      />,
    );

    const preview = screen.getByTestId('admin-preview');
    expect(within(preview).getByText('Old statement.')).toBeInTheDocument();

    const textareas = container.querySelectorAll<HTMLTextAreaElement>('.f textarea');
    const statementTextarea = textareas[0];
    expect(statementTextarea).toBeDefined();

    act(() => {
      fireEvent.change(statementTextarea as HTMLTextAreaElement, {
        target: { value: 'New live statement.' },
      });
    });

    // The preview reflects the new value immediately; the server-action
    // debounce has not even started counting toward its 300 ms window.
    expect(within(preview).getByText('New live statement.')).toBeInTheDocument();
    expect(saveDraftActionMock).not.toHaveBeenCalled();
  });

  it('still fires the debounced server save from the editor', async () => {
    saveDraftActionMock.mockResolvedValue({ ok: true, updatedAt: new Date().toISOString() });
    const PreviewWorkspace = await loadWorkspace();
    vi.useFakeTimers();
    try {
      const { container } = render(
        <PreviewWorkspace
          initialDraft={null}
          initialUpdatedAt={null}
          basePerson={basePerson}
          baseHero={baseHero}
          baseSkills={baseSkills}
        />,
      );
      const inputs = container.querySelectorAll<HTMLInputElement>('.f input');
      const nameInput = inputs[0];
      expect(nameInput).toBeDefined();
      // Clear any unrelated calls left over from prior tests' unmount-flush
      // microtasks; this test cares only about whether the new keystroke
      // schedules a save after the debounce window.
      saveDraftActionMock.mockClear();
      act(() => {
        fireEvent.change(nameInput as HTMLInputElement, { target: { value: 'Ada' } });
      });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(saveDraftActionMock).toHaveBeenCalledTimes(1);
      const call = saveDraftActionMock.mock.calls[0];
      expect(call?.[0]).toBe('hero');
      const payload = call?.[1] as { person?: { name?: string } };
      expect(payload?.person?.name).toBe('Ada');
    } finally {
      cleanup();
      vi.useRealTimers();
    }
  });
});
