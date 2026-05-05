import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Site } from '../../../lib/schema';
import { CommandPalette } from '../CommandPalette';
import { ThemeProvider } from '../ThemeProvider';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const sampleSite: Site = {
  person: {
    name: 'Ada Lovelace',
    nameAccent: 'Lovelace',
    role: 'Software Engineer',
    location: 'London, United Kingdom',
    phone: '07000 000000',
    email: 'ada@example.com',
    cvUrl: '/cv/ada.pdf',
    cvDocxUrl: '/cv/ada.docx',
    github: 'https://github.com/example',
    linkedin: 'https://www.linkedin.com/in/example',
    yearsExp: 6,
    estYear: '2019',
    statement: 'A short statement.',
    longBio: ['Paragraph one.', 'Paragraph two.'],
  },
  hero: {
    meta: ['Available', 'Q2 2026'],
    stats: [
      { value: '06', label: 'Years shipping' },
      { value: '07', label: 'Production projects' },
      { value: '∞', label: 'CSS rewrites' },
    ],
  },
  skills: [{ label: 'Languages', items: ['TypeScript'] }],
  experience: [
    {
      role: 'Software Engineer',
      company: 'Acme',
      where: 'London',
      when: '2024, Present',
      desc: 'Building things that work.',
      tags: ['TypeScript'],
    },
  ],
  projects: ['project-one'],
  certs: ['Cert'],
  education: [{ degree: 'BSc', school: 'Uni', result: 'First' }],
  aiPractice: {
    eyebrow: 'AI',
    headline: 'Headline.',
    intro: 'Intro.',
    pillars: [{ n: 'i.', title: 'Title.', body: 'Body.' }],
    workflow: [{ k: 'Spec', v: 'Plain.' }],
  },
  footer: {
    heading: 'Talk.',
    copy: 'Open.',
    availability: 'Available now',
    copyright: '(c) 2026 Ada.',
  },
  settings: {
    defaultTheme: 'system',
    intro: false,
    visibility: {
      about: true,
      skills: true,
      experience: true,
      ai: true,
      work: true,
      commandPalette: true,
    },
  },
};

function renderPalette(site: Site = sampleSite) {
  return render(
    <ThemeProvider initialMode="system" initialEffective="dark">
      <button type="button" data-testid="opener">
        Opener
      </button>
      <CommandPalette site={site} />
    </ThemeProvider>,
  );
}

// closeAndUnmount routes through Escape (the user-visible close path) before
// returning render's unmount. Radix Dialog uses a portal that happy-dom and
// React 19's commit phase can leave detached if the test ends with the dialog
// open; closing then unmounting prevents the dual-removal that throws inside
// the global cleanup() hook.
function closeAndUnmount(unmount: () => void) {
  const input = screen.queryByPlaceholderText(/type a command/i);
  if (input) {
    act(() => {
      fireEvent.keyDown(input, { key: 'Escape' });
    });
  }
  unmount();
}

describe('<CommandPalette />', () => {
  it('does not render the dialog content while closed', () => {
    const { unmount } = renderPalette();
    expect(screen.queryByPlaceholderText(/type a command/i)).toBeNull();
    unmount();
  });

  it('opens on Cmd+K and exposes the command input', () => {
    const { unmount } = renderPalette();
    act(() => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true });
    });
    expect(screen.getByPlaceholderText(/type a command/i)).toBeInTheDocument();
    closeAndUnmount(unmount);
  });

  it('opens on Ctrl+K (non-mac)', () => {
    const { unmount } = renderPalette();
    act(() => {
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    });
    expect(screen.getByPlaceholderText(/type a command/i)).toBeInTheDocument();
    closeAndUnmount(unmount);
  });

  it('opens on bare slash when focus is not in a typing target', () => {
    const { unmount } = renderPalette();
    act(() => {
      fireEvent.keyDown(window, { key: '/' });
    });
    expect(screen.getByPlaceholderText(/type a command/i)).toBeInTheDocument();
    closeAndUnmount(unmount);
  });

  it('closes on Escape and removes the input from the tree', () => {
    const { unmount } = renderPalette();
    act(() => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true });
    });
    const input = screen.getByPlaceholderText(/type a command/i);
    expect(input).toBeInTheDocument();
    act(() => {
      fireEvent.keyDown(input, { key: 'Escape' });
    });
    expect(screen.queryByPlaceholderText(/type a command/i)).toBeNull();
    unmount();
  });

  it('renders nothing when settings.visibility.commandPalette is false', () => {
    const hidden: Site = {
      ...sampleSite,
      settings: {
        ...sampleSite.settings,
        visibility: { ...sampleSite.settings.visibility, commandPalette: false },
      },
    };
    const { unmount } = renderPalette(hidden);
    act(() => {
      fireEvent.keyDown(window, { key: 'k', metaKey: true });
    });
    expect(screen.queryByPlaceholderText(/type a command/i)).toBeNull();
    unmount();
  });
});
