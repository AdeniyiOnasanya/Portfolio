import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  Fraunces: vi.fn((opts: { variable: string }) => ({
    className: 'mock-fraunces',
    variable: opts.variable,
    style: { fontFamily: 'mock' },
  })),
  Geist: vi.fn((opts: { variable: string }) => ({
    className: 'mock-geist',
    variable: opts.variable,
    style: { fontFamily: 'mock' },
  })),
  JetBrains_Mono: vi.fn((opts: { variable: string }) => ({
    className: 'mock-jetbrains-mono',
    variable: opts.variable,
    style: { fontFamily: 'mock' },
  })),
}));

import { Fraunces, Geist, JetBrains_Mono } from 'next/font/google';
import { fraunces, geist, jetbrainsMono } from '../fonts';

describe('font setup', () => {
  it('exposes the project CSS variables', () => {
    expect(fraunces.variable).toBe('--font-fraunces');
    expect(geist.variable).toBe('--font-geist');
    expect(jetbrainsMono.variable).toBe('--font-jetbrains-mono');
  });

  it('subsets every family to latin only', () => {
    expect(vi.mocked(Fraunces).mock.calls[0]?.[0].subsets).toEqual(['latin']);
    expect(vi.mocked(Geist).mock.calls[0]?.[0].subsets).toEqual(['latin']);
    expect(vi.mocked(JetBrains_Mono).mock.calls[0]?.[0].subsets).toEqual(['latin']);
  });

  it('uses display: swap on every family to avoid blank text on first paint', () => {
    expect(vi.mocked(Fraunces).mock.calls[0]?.[0].display).toBe('swap');
    expect(vi.mocked(Geist).mock.calls[0]?.[0].display).toBe('swap');
    expect(vi.mocked(JetBrains_Mono).mock.calls[0]?.[0].display).toBe('swap');
  });

  it('Fraunces ships the opsz axis and both italic and normal styles for the editorial hero', () => {
    const cfg = vi.mocked(Fraunces).mock.calls[0]?.[0];
    expect(cfg?.axes).toContain('opsz');
    expect(cfg?.style).toEqual(expect.arrayContaining(['normal', 'italic']));
  });
});
