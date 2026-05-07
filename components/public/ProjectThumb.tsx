import type { CSSProperties } from 'react';
import type { Project } from '../../lib/schema';

/*
 * ProjectThumb
 *
 * Cursor-following preview rendered above the project row on hover. Mirrors
 * `design_handoff_portfolio/design/app.jsx#ProjectThumb` byte-for-byte: a
 * project-keyed hue drives the gradient + accent glyph, and a 45-degree
 * repeating gradient lays a subtle scanline pattern across the panel.
 *
 * The thumb has no interactive role; the parent .preview-thumb wrapper is
 * already aria-hidden. This is a decorative cinematic flourish only.
 */

const HUE_BY_N: Record<string, number> = {
  '01': 145,
  '02': 28,
  '03': 210,
  '04': 280,
  '05': 180,
  '06': 340,
  '07': 60,
};

export function ProjectThumb({ project }: { project: Project }) {
  const hue = HUE_BY_N[project.n] ?? 145;
  const innerStyle: CSSProperties = {
    background: `linear-gradient(135deg, oklch(0.18 0.03 ${hue}) 0%, oklch(0.12 0.02 ${hue}) 100%)`,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  };
  const scanlinesStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundImage: `repeating-linear-gradient(-45deg, transparent 0, transparent 18px, oklch(0.78 0.13 ${hue} / 0.06) 18px, oklch(0.78 0.13 ${hue} / 0.06) 19px)`,
  };
  const titleStyle: CSSProperties = {
    fontFamily: 'var(--font-serif)',
    fontStyle: 'italic',
    fontWeight: 300,
    fontSize: 36,
    lineHeight: 1,
    letterSpacing: '-0.02em',
    color: `oklch(0.85 0.13 ${hue})`,
    fontVariationSettings: '"SOFT" 100, "opsz" 144',
  };
  return (
    <div className="thumb-inner" style={innerStyle}>
      <div style={scanlinesStyle} />
      <div className="thumb-meta">
        <span>{project.n}</span>
        <span>{project.year}</span>
      </div>
      <div className="thumb-body">
        <div style={titleStyle}>{project.title}</div>
        <div className="thumb-kind">{project.kind}</div>
      </div>
    </div>
  );
}
