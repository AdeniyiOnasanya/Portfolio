/* global React */
const { useEffect, useRef, useState } = React;

// === Custom cursor ===
function CustomCursor() {
  useEffect(() => {
    const dot = document.querySelector(".cursor-dot");
    const ring = document.querySelector(".cursor-ring");
    if (!dot || !ring) return;

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;
    let raf;

    const onMove = (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    };
    const onOver = (e) => {
      const t = e.target;
      if (t.closest && t.closest("a, button, .project-row, [data-cursor-hover]")) {
        document.body.classList.add("cursor-hover");
      } else {
        document.body.classList.remove("cursor-hover");
      }
    };
    const tick = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    tick();
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <>
      <div className="cursor-ring"></div>
      <div className="cursor-dot"></div>
    </>
  );
}

// === Theme toggle ===
function useTheme() {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    const def = window.PORTFOLIO_DATA && window.PORTFOLIO_DATA.settings && window.PORTFOLIO_DATA.settings.defaultTheme;
    if (def === "light" || def === "dark") return def;
    if (def === "system" || !def) {
      return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    return "dark";
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);
  return [theme, setTheme];
}

function ThemeToggle({ theme, setTheme }) {
  return (
    <div className="theme-pill" data-theme={theme} role="group" aria-label="Theme">
      <span className="glide" aria-hidden="true"></span>
      <button
        className={theme === "dark" ? "active" : ""}
        onClick={() => setTheme("dark")}
        aria-label="Dark theme"
        aria-pressed={theme === "dark"}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M9.5 6.8A3.5 3.5 0 0 1 5.2 2.5a3.5 3.5 0 1 0 4.3 4.3z" fill="currentColor" />
        </svg>
      </button>
      <button
        className={theme === "light" ? "active" : ""}
        onClick={() => setTheme("light")}
        aria-label="Light theme"
        aria-pressed={theme === "light"}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round">
          <circle cx="6" cy="6" r="2.2" fill="currentColor" stroke="none"/>
          <path d="M6 1v1.4M6 9.6V11M1 6h1.4M9.6 6H11M2.5 2.5l1 1M8.5 8.5l1 1M2.5 9.5l1-1M8.5 3.5l1-1"/>
        </svg>
      </button>
    </div>
  );
}

// === Reveal-on-scroll observer ===
// Watches the document for additions and observes any new .reveal / .line-mask nodes.
// Also re-checks on a deps change (e.g. when intro finishes mounting the main content).
function useReveal(deps = []) {
  useEffect(() => {
    const seen = new WeakSet();
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -5% 0px" });

    const observe = (root) => {
      const els = root.querySelectorAll ? root.querySelectorAll(".reveal, .line-mask") : [];
      els.forEach(el => {
        if (seen.has(el)) return;
        seen.add(el);
        io.observe(el);
        // Force a check immediately for elements already in viewport at mount.
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) {
          // Slight delay to let entry transition CSS apply before adding .in
          requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("in")));
          io.unobserve(el);
        }
      });
    };

    observe(document);

    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach(n => {
          if (n.nodeType === 1) observe(n);
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // Re-scan on resize/scroll briefly in case layout shifts pull elements into view
    const rescan = () => observe(document);
    window.addEventListener("resize", rescan);

    return () => {
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", rescan);
    };
    // eslint-disable-next-line
  }, deps);
}

// === Top nav ===
function Nav({ theme, setTheme, onProjects }) {
  const D = window.PORTFOLIO_DATA || {};
  const p = D.person || {};
  // Detect project page by the slug global, not by URL path (the preview server
  // serves the whole project under a /projects/ prefix, which would false-match).
  const isProject = !!window.PROJECT_SLUG;
  const home = isProject ? "../index.html" : "index.html";
  const cv = isProject && p.cvUrl ? `../${p.cvUrl}` : (p.cvUrl || "#");
  return (
    <nav className="nav">
      <a href={home} className="nav-mark">DO / 2026</a>
      <div className="nav-links">
        <a href={isProject ? `${home}#work` : "#work"} onClick={onProjects}>Work</a>
        <a href={isProject ? `${home}#about` : "#about"}>About</a>
        <a href={cv} download="David-Onasanya-CV.pdf">CV</a>
        {p.github && <a href={p.github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">GH</a>}
        {p.linkedin && <a href={p.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">LI</a>}
        <ThemeToggle theme={theme} setTheme={setTheme} />
      </div>
    </nav>
  );
}

// === Cinematic intro ===
function Intro({ onDone }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);
  const [out, setOut] = useState(false);
  const startRef = useRef(performance.now());
  const DUR = 5400;

  useEffect(() => {
    let raf;
    const tick = (t) => {
      const elapsed = t - startRef.current;
      const p = Math.min(1, elapsed / DUR);
      setProgress(p);
      // phases: 0: bootlines, 1: name reveal, 2: hold, 3: out
      if (elapsed < 1400) setPhase(0);
      else if (elapsed < 3000) setPhase(1);
      else if (elapsed < 4800) setPhase(2);
      else setPhase(3);

      if (elapsed >= DUR && !out) {
        setOut(true);
        setTimeout(onDone, 1100);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone, out]);

  const skip = () => { setOut(true); setTimeout(onDone, 700); };

  return (
    <div className={`intro ${out ? "intro-out" : ""}`}>
      <button className="skip" onClick={skip}>Skip ↗</button>
      <div className="stamp">REC · 16:9 · 24fps</div>
      <div className="stamp-r">{`${(progress * 100).toFixed(0).padStart(2, "0")}%`}</div>

      <div className="stage">
        <IntroContent phase={phase} progress={progress} />
      </div>

      <div className="progress"><div className="bar" style={{ width: `${progress * 100}%` }} /></div>
    </div>
  );
}

function IntroContent({ phase, progress }) {
  // Fixed-pos absolute layout
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* Phase 0: bootlines top-left */}
      <div style={{
        position: "absolute",
        top: "20%",
        left: "8%",
        fontFamily: "var(--mono)",
        fontSize: 12,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--fg-mute)",
        opacity: phase >= 0 ? 1 : 0,
        transition: "opacity 0.6s",
      }}>
        <BootLine show={progress > 0.02} delay={0}>→ initialising portfolio.sys</BootLine>
        <BootLine show={progress > 0.08} delay={120}>→ loading typeface, Fraunces v9</BootLine>
        <BootLine show={progress > 0.14} delay={240}>→ resolving identity ····</BootLine>
        <BootLine show={progress > 0.22} delay={360}>→ <span style={{color: "var(--accent)"}}>OK</span> &nbsp; David Onasanya</BootLine>
      </div>

      {/* Center: crosshair + name */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        textAlign: "center",
      }}>
        {/* Subtle crosshair frame */}
        <div style={{
          position: "absolute",
          inset: "12% 8%",
          border: "1px solid var(--line)",
          opacity: phase >= 1 ? 1 : 0,
          transition: "opacity 0.8s",
        }}>
          <Corner pos="tl" /><Corner pos="tr" /><Corner pos="bl" /><Corner pos="br" />
        </div>

        <div style={{
          fontFamily: "var(--serif)",
          fontWeight: 300,
          fontSize: "clamp(64px, 14vw, 220px)",
          lineHeight: 0.9,
          letterSpacing: "-0.04em",
          fontVariationSettings: '"SOFT" 50, "WONK" 1, "opsz" 144',
          position: "relative",
        }}>
          <div style={{ overflow: "hidden", display: "block" }}>
            <div style={{
              transform: phase >= 1 ? "translateY(0%)" : "translateY(110%)",
              transition: "transform 1s cubic-bezier(0.2, 0.7, 0.3, 1)",
            }}>David</div>
          </div>
          <div style={{ overflow: "hidden", display: "block" }}>
            <div style={{
              transform: phase >= 1 ? "translateY(0%)" : "translateY(110%)",
              transition: "transform 1s cubic-bezier(0.2, 0.7, 0.3, 1) 0.18s",
              fontStyle: "italic",
              color: "var(--accent)",
              fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 144',
            }}>Onasanya</div>
          </div>
        </div>

        <div style={{
          position: "absolute",
          bottom: "calc(12% + 20px)",
          left: "8%",
          right: "8%",
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--fg-mute)",
          opacity: phase >= 2 ? 1 : 0,
          transition: "opacity 0.6s",
        }}>
          <span>Full-stack engineer</span>
          <span>Stafford / UK</span>
          <span>Est. 2019</span>
        </div>
      </div>
    </div>
  );
}

function BootLine({ children, show }) {
  return (
    <div style={{
      opacity: show ? 1 : 0,
      transform: show ? "translateY(0)" : "translateY(8px)",
      transition: "opacity 0.4s, transform 0.4s",
      marginBottom: 4,
    }}>{children}</div>
  );
}

function Corner({ pos }) {
  const styleByPos = {
    tl: { top: -1, left: -1, borderTop: "1px solid var(--accent)", borderLeft: "1px solid var(--accent)" },
    tr: { top: -1, right: -1, borderTop: "1px solid var(--accent)", borderRight: "1px solid var(--accent)" },
    bl: { bottom: -1, left: -1, borderBottom: "1px solid var(--accent)", borderLeft: "1px solid var(--accent)" },
    br: { bottom: -1, right: -1, borderBottom: "1px solid var(--accent)", borderRight: "1px solid var(--accent)" },
  };
  return <div style={{ position: "absolute", width: 24, height: 24, ...styleByPos[pos] }} />;
}

Object.assign(window, {
  CustomCursor, useTheme, ThemeToggle, useReveal, Nav, Intro
});
