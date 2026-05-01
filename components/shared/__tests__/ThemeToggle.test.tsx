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

  it('renders with the label that matches the current mode', () => {
    render(
      <ThemeProvider initialMode="system" initialEffective="dark">
        <ThemeToggle />
      </ThemeProvider>,
    );
    const button = screen.getByRole('button');
    expect(button.textContent).toContain('System');
    expect(button.getAttribute('aria-label')).toBe('Theme: System. Click to change.');
  });

  it('cycles system to dark to light to system on successive clicks', () => {
    render(
      <ThemeProvider initialMode="system" initialEffective="dark">
        <ThemeToggle />
      </ThemeProvider>,
    );
    const button = screen.getByRole('button');

    expect(button.textContent).toContain('System');

    fireEvent.click(button);
    expect(button.textContent).toContain('Dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    fireEvent.click(button);
    expect(button.textContent).toContain('Light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    fireEvent.click(button);
    expect(button.textContent).toContain('System');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('persists the selected mode in the theme cookie', () => {
    render(
      <ThemeProvider initialMode="system" initialEffective="dark">
        <ThemeToggle />
      </ThemeProvider>,
    );
    const button = screen.getByRole('button');

    fireEvent.click(button);
    expect(document.cookie).toMatch(/theme=dark/);

    fireEvent.click(button);
    expect(document.cookie).toMatch(/theme=light/);

    fireEvent.click(button);
    expect(document.cookie).toMatch(/theme=system/);
  });

  it('starts from a non-system initial mode and cycles forward from there', () => {
    render(
      <ThemeProvider initialMode="dark" initialEffective="dark">
        <ThemeToggle />
      </ThemeProvider>,
    );
    const button = screen.getByRole('button');
    expect(button.textContent).toContain('Dark');

    fireEvent.click(button);
    expect(button.textContent).toContain('Light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});
