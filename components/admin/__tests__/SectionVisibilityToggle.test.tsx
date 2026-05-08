import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

/*
 * SectionVisibilityToggle tests, Phase 7 slice #47.
 *
 * The contract this test pins:
 *  - the toggle hydrates "Show on site" with the inverse of `initialHidden`
 *    so the operator reads the affirmative state (on => visible);
 *  - clicking the toggle calls `saveDraftAction` with the section id and a
 *    payload that sets `hidden` to the new value while preserving the
 *    rest of the draft content;
 *  - the on-saved callback is invoked with the action's `updatedAt` so the
 *    parent editor can refresh its autosave-status line.
 *
 * The server action is mocked at module-level via `@/lib/draft/actions`.
 */

const saveDraftActionMock = vi.fn();

vi.mock('@/lib/draft/actions', () => ({
  saveDraftAction: (...args: unknown[]) => saveDraftActionMock(...args),
  reorderProjectsAction: vi.fn(),
}));

afterEach(() => {
  saveDraftActionMock.mockReset();
  cleanup();
});

async function loadComponent() {
  const mod = await import('../SectionVisibilityToggle');
  return mod.SectionVisibilityToggle;
}

describe('<SectionVisibilityToggle />', () => {
  it('renders "Show on site" with the switch on when initialHidden is false', async () => {
    const SectionVisibilityToggle = await loadComponent();
    render(<SectionVisibilityToggle section="about" initialHidden={false} />);
    const toggle = screen.getByRole('switch', { name: 'Show on site' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle).toHaveClass('on');
  });

  it('renders the switch off when initialHidden is true', async () => {
    const SectionVisibilityToggle = await loadComponent();
    render(<SectionVisibilityToggle section="about" initialHidden={true} />);
    const toggle = screen.getByRole('switch', { name: 'Show on site' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).not.toHaveClass('on');
  });

  it('renders the sub label "Section visible on public preview"', async () => {
    const SectionVisibilityToggle = await loadComponent();
    render(<SectionVisibilityToggle section="about" initialHidden={false} />);
    expect(screen.getByText('Section visible on public preview')).toBeInTheDocument();
  });

  it('persists hidden:true via saveDraftAction when toggled off', async () => {
    saveDraftActionMock.mockResolvedValue({
      ok: true,
      updatedAt: new Date('2026-05-07T12:34:00Z').toISOString(),
    });
    const SectionVisibilityToggle = await loadComponent();
    render(
      <SectionVisibilityToggle
        section="about"
        initialHidden={false}
        initialContent={{ paragraphs: ['Hello'] }}
      />,
    );
    await act(async () => {
      screen.getByRole('switch', { name: 'Show on site' }).click();
    });
    expect(saveDraftActionMock).toHaveBeenCalledTimes(1);
    expect(saveDraftActionMock).toHaveBeenCalledWith('about', {
      paragraphs: ['Hello'],
      hidden: true,
    });
  });

  it('persists hidden:false when toggled back on', async () => {
    saveDraftActionMock.mockResolvedValue({
      ok: true,
      updatedAt: new Date('2026-05-07T12:34:00Z').toISOString(),
    });
    const SectionVisibilityToggle = await loadComponent();
    render(
      <SectionVisibilityToggle
        section="skills"
        initialHidden={true}
        initialContent={{ groups: [] }}
      />,
    );
    await act(async () => {
      screen.getByRole('switch', { name: 'Show on site' }).click();
    });
    expect(saveDraftActionMock).toHaveBeenCalledWith('skills', {
      groups: [],
      hidden: false,
    });
  });

  it('inserts {hidden} when the section has no draft content yet', async () => {
    saveDraftActionMock.mockResolvedValue({
      ok: true,
      updatedAt: new Date('2026-05-07T12:34:00Z').toISOString(),
    });
    const SectionVisibilityToggle = await loadComponent();
    render(
      <SectionVisibilityToggle section="footer" initialHidden={false} initialContent={null} />,
    );
    await act(async () => {
      screen.getByRole('switch', { name: 'Show on site' }).click();
    });
    expect(saveDraftActionMock).toHaveBeenCalledWith('footer', { hidden: true });
  });

  it('flips the visible state immediately on toggle (optimistic)', async () => {
    saveDraftActionMock.mockResolvedValue({
      ok: true,
      updatedAt: new Date('2026-05-07T12:34:00Z').toISOString(),
    });
    const SectionVisibilityToggle = await loadComponent();
    render(<SectionVisibilityToggle section="about" initialHidden={false} />);
    const toggle = screen.getByRole('switch', { name: 'Show on site' });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    await act(async () => {
      toggle.click();
    });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('invokes onSaved with the action updatedAt after a successful save', async () => {
    const stamp = new Date('2026-05-07T12:34:00Z').toISOString();
    saveDraftActionMock.mockResolvedValue({ ok: true, updatedAt: stamp });
    const onSaved = vi.fn();
    const SectionVisibilityToggle = await loadComponent();
    render(<SectionVisibilityToggle section="about" initialHidden={false} onSaved={onSaved} />);
    await act(async () => {
      screen.getByRole('switch', { name: 'Show on site' }).click();
    });
    expect(onSaved).toHaveBeenCalledWith(stamp);
  });
});
