'use client';

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../../lib/motion/preferences';
import type { Project } from '../../lib/schema';
import { ProjectRow } from './ProjectRow';
import { ProjectThumb } from './ProjectThumb';

/*
 * ProjectsIndex
 *
 * Client wrapper around the project rows that drives the cursor-following
 * preview thumb mirrored from
 * `design_handoff_portfolio/design/app.jsx#ProjectIndex`. Listens for
 * window mousemove and updates the thumb position via inline style; the
 * `.show` class fades the thumb in once a row reports hover.
 *
 * Reduced-motion bypass: when the live preference is reduce, the thumb
 * stays untracked and unmounted (no listener installed, no hover state
 * propagation). Rows still navigate normally; only the decorative thumb
 * is suppressed.
 */
export function ProjectsIndex({ projects }: { projects: Project[] }) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState<number>(-1);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    function onMove(e: MouseEvent): void {
      const el = previewRef.current;
      if (!el) return;
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div className="projects-index">
      {projects.map((project, index) => (
        <ProjectRow
          key={project.slug}
          project={project}
          onEnter={() => setActiveIdx(index)}
          onLeave={() => setActiveIdx(-1)}
        />
      ))}
      <div
        ref={previewRef}
        className={`preview-thumb ${activeIdx >= 0 ? 'show' : ''}`}
        aria-hidden="true"
      >
        {activeIdx >= 0 && projects[activeIdx] ? (
          <ProjectThumb project={projects[activeIdx]} />
        ) : null}
      </div>
    </div>
  );
}
