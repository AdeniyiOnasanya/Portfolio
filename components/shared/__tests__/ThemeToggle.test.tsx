import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ThemeProvider } from '../ThemeProvider';
import { ThemeToggle } from '../ThemeToggle';

function clearCookies() {
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (name) {
      // biome-ignore lint/suspicious/noDocumentCookie: test-environment helper. cookieStore is not implemented in happy-dom.
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
}

describe('<ThemeToggle />', () => {
  beforeEach(() => {
    clearCookies();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    cleanup();
    clearCookies();
    document.documentElement.removeAttribute('data-theme');
  });

  it('renders a segmented pill with two buttons (Dark and Light)', () => {
    render(
      <ThemeProvider initialMode="system" initialEffective="dark">
        <ThemeToggle />
      </ThemeProvider>,
    );
    const dark = screen.getByRole('button', { name: 'Dark' });
    const light = screen.getByRole('button', { name: 'Light' });
    expect(dark).toBeInTheDocument();
    expect(light).toBeInTheDocument();
  });

  it('marks the dark button active when the visible theme is dark', () => {
    render(
      <ThemeProvider initialMode="dark" initialEffective="dark">
        <ThemeToggle />
      </ThemeProvider>,
    );
    const dark = screen.getByRole('button', { name: 'Dark' });
    const light = screen.getByRole('button', { name: 'Light' });
    expect(dark).toHaveAttribute('aria-pressed', 'true');
    expect(light).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking Light sets data-theme to light and persists the cookie', () => {
    render(
      <ThemeProvider initialMode="system" initialEffective="dark">
        <ThemeToggle />
      </ThemeProvider>,
    );
    const light = screen.getByRole('button', { name: 'Light' });
    fireEvent.click(light);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.cookie).toMatch(/theme=light/);
    expect(light).toHaveAttribute('aria-pressed', 'true');
  });

  it('clicking Dark sets data-theme to dark and persists the cookie', () => {
    render(
      <ThemeProvider initialMode="light" initialEffective="light">
        <ThemeToggle />
      </ThemeProvider>,
    );
    const dark = screen.getByRole('button', { name: 'Dark' });
    fireEvent.click(dark);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.cookie).toMatch(/theme=dark/);
    expect(dark).toHaveAttribute('aria-pressed', 'true');
  });

  it('reflects the visible theme on the pill data-theme attribute', () => {
    const { container } = render(
      <ThemeProvider initialMode="dark" initialEffective="dark">
        <ThemeToggle />
      </ThemeProvider>,
    );
    const pill = container.querySelector('.theme-pill') as HTMLElement;
    expect(pill.getAttribute('data-theme')).toBe('dark');

    const light = screen.getByRole('button', { name: 'Light' });
    fireEvent.click(light);
    expect(pill.getAttribute('data-theme')).toBe('light');
  });
});
