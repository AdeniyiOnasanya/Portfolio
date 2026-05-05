import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Hero } from '../Hero';
import { sampleHero, samplePerson, sampleSkills } from './fixtures';

function renderHero(overrides: Partial<Parameters<typeof Hero>[0]> = {}) {
  return render(
    <Hero
      person={overrides.person ?? samplePerson}
      hero={overrides.hero ?? sampleHero}
      skills={overrides.skills ?? sampleSkills}
    />,
  );
}

describe('Hero', () => {
  it('renders the only h1 with the person name', () => {
    renderHero();
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading.textContent).toContain(samplePerson.name.split(' ')[0]);
    expect(heading.textContent).toContain(samplePerson.nameAccent ?? '');
  });

  it('exposes a section landmark for the hero', () => {
    const { container } = renderHero();
    const section = container.querySelector('section#home');
    expect(section).not.toBeNull();
    expect(section?.getAttribute('aria-labelledby')).toBe('hero-heading');
  });

  it('renders the role and statement from content', () => {
    renderHero();
    expect(screen.getByText(samplePerson.statement)).toBeInTheDocument();
  });

  it('wraps the accent word in an em with the accent class inside the h1', () => {
    renderHero();
    const heading = screen.getByRole('heading', { level: 1 });
    const em = heading.querySelector('em');
    expect(em).not.toBeNull();
    expect(em?.textContent).toBe(samplePerson.nameAccent);
    expect(em?.className).toMatch(/text-accent/);
  });

  it('renders the h1 in two .line-mask spans for the scroll-triggered reveal', () => {
    renderHero();
    const heading = screen.getByRole('heading', { level: 1 });
    const masks = heading.querySelectorAll('.line-mask');
    expect(masks.length).toBe(2);
    masks.forEach((mask) => {
      expect(mask.querySelector('span')).not.toBeNull();
    });
  });

  it('renders every meta-row pill from the hero schema', () => {
    renderHero();
    for (const label of sampleHero.meta) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('renders three stat pairs with the value and label from the schema', () => {
    renderHero();
    for (const stat of sampleHero.stats) {
      expect(screen.getByText(stat.value)).toBeInTheDocument();
      expect(screen.getByText(stat.label)).toBeInTheDocument();
    }
  });

  it('renders the four primary action buttons with correct hrefs and data-magnetic', () => {
    renderHero();
    const cv = screen.getByRole('link', { name: /download cv/i });
    expect(cv).toHaveAttribute('href', samplePerson.cvUrl);
    expect(cv).toHaveAttribute('download');
    expect(cv).toHaveAttribute('data-magnetic');

    const gh = screen.getByRole('link', { name: /github/i });
    expect(gh).toHaveAttribute('href', samplePerson.github);
    expect(gh).toHaveAttribute('target', '_blank');
    expect(gh.getAttribute('rel') ?? '').toMatch(/noreferrer/);
    expect(gh).toHaveAttribute('data-magnetic');

    const li = screen.getByRole('link', { name: /linkedin/i });
    expect(li).toHaveAttribute('href', samplePerson.linkedin);
    expect(li).toHaveAttribute('target', '_blank');
    expect(li).toHaveAttribute('data-magnetic');

    const email = screen.getByRole('link', { name: /^email$/i });
    expect(email).toHaveAttribute('href', `mailto:${samplePerson.email}`);
    expect(email).toHaveAttribute('data-magnetic');
  });

  it('locks the download filename to the trailing segment of the cvUrl', () => {
    renderHero({ person: { ...samplePerson, cvUrl: '/cv/Versioned-CV-2026.pdf' } });
    const link = screen.getByRole('link', { name: /download cv/i });
    expect(link).toHaveAttribute('download', 'Versioned-CV-2026.pdf');
  });

  it('renders an embedded marquee with the flattened skill items', () => {
    const { container } = renderHero();
    const marquee = container.querySelector('[class*="marquee"]');
    expect(marquee).not.toBeNull();
    const allItems = sampleSkills.flatMap((g) => g.items);
    for (const item of allItems) {
      expect(within(container).getAllByText(item).length).toBeGreaterThan(0);
    }
  });
});
