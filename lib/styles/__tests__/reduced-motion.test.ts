import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const TOKENS_CSS = readFileSync(join(process.cwd(), 'tokens.css'), 'utf8');

const GLOBALS_CSS = readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8');

const REDUCED_MOTION_BLOCK =
  /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{([\s\S]*?)\}\s*\}/m;

describe('prefers-reduced-motion contract', () => {
  it('tokens.css ships an @media (prefers-reduced-motion: reduce) block', () => {
    expect(REDUCED_MOTION_BLOCK.test(TOKENS_CSS)).toBe(true);
  });

  it('the reduced-motion block zeros every duration token', () => {
    const match = TOKENS_CSS.match(REDUCED_MOTION_BLOCK);
    expect(match).not.toBeNull();
    const body = match?.[1] ?? '';
    expect(body).toMatch(/--duration-fast\s*:\s*0ms\s*;/);
    expect(body).toMatch(/--duration-base\s*:\s*0ms\s*;/);
    expect(body).toMatch(/--duration-slow\s*:\s*0ms\s*;/);
  });

  it('app/globals.css documents the reduced-motion contract for authors', () => {
    expect(GLOBALS_CSS).toMatch(/Reduced-motion contract/);
    expect(GLOBALS_CSS).toMatch(/var\(--duration-/);
    expect(GLOBALS_CSS).toMatch(/PULL_REQUEST_TEMPLATE\.md/);
  });

  it('app/globals.css hides the grain overlay under reduced-motion and print', () => {
    expect(GLOBALS_CSS).toMatch(
      /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)[\s\S]*?\.grain[\s\S]*?display\s*:\s*none/,
    );
    expect(GLOBALS_CSS).toMatch(/@media\s+print[\s\S]*?\.grain[\s\S]*?display\s*:\s*none/);
  });
});
