// Portfolio enhancements: command palette, magnetic buttons, reduced motion, etc.
// Loaded after React + shared.jsx, before app.jsx / project.jsx.

const { useEffect, useRef, useState, useMemo, useCallback } = React;

// === Reduced motion detection ===
function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return reduced;
}

// === Magnetic button effect ===
// Adds a subtle pull-toward-cursor effect on hover for elements with [data-magnetic].
function useMagneticButtons() {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const STRENGTH = 0.32;
    const RANGE = 80;
    const els = new Set();
    let frame = 0;

    const onMove = (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        els.forEach((el) => {
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = e.clientX - cx;
          const dy = e.clientY - cy;
          const dist = Math.hypot(dx, dy);
          if (dist < RANGE) {
            const pull = (1 - dist / RANGE) * STRENGTH;
            el.style.transform = `translate(${dx * pull}px, ${dy * pull}px)`;
          } else {
            el.style.transform = "";
          }
        });
      });
    };

    const scan = () => {
      document.querySelectorAll("[data-magnetic]").forEach((el) => {
        if (!els.has(el)) {
          els.add(el);
          el.style.transition = "transform 0.18s cubic-bezier(.2,.8,.2,1)";
          el.style.willChange = "transform";
        }
      });
    };

    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("mousemove", onMove);
    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
      window.removeEventListener("mousemove", onMove);
      els.forEach((el) => { el.style.transform = ""; });
    };
  }, [reduced]);
}

// === Command palette ===
function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const D = window.PORTFOLIO_DATA || {};

  // Detect project page via the global slug (the preview server serves under
  // /projects/<id>/serve/, so a pathname check would false-match).
  const isProject = !!window.PROJECT_SLUG;
  const home = isProject ? "../index.html" : "index.html";
  const projectHref = (slug) => isProject ? `${slug}.html` : `projects/${slug}.html`;
  const cvHref = isProject && D.person?.cvUrl ? `../${D.person.cvUrl}` : (D.person?.cvUrl || "#");

  const commands = useMemo(() => {
    const list = [];
    // Navigation
    list.push({ id: "nav-home", group: "Navigate", label: "Home", hint: "/", icon: "↑", action: () => location.href = home });
    list.push({ id: "nav-work", group: "Navigate", label: "Work", hint: "/work", icon: "→", action: () => location.href = `${home}#work` });
    list.push({ id: "nav-about", group: "Navigate", label: "About", hint: "/about", icon: "→", action: () => location.href = `${home}#about` });
    list.push({ id: "nav-skills", group: "Navigate", label: "Skills", hint: "/skills", icon: "→", action: () => location.href = `${home}#skills` });
    list.push({ id: "nav-cv", group: "Navigate", label: "CV / Resume", hint: "/cv", icon: "→", action: () => location.href = `${home}#cv` });
    list.push({ id: "nav-contact", group: "Navigate", label: "Contact", hint: "/contact", icon: "→", action: () => location.href = `${home}#contact` });
    // Projects
    (D.projects || []).forEach((p) => {
      list.push({
        id: `proj-${p.slug}`,
        group: "Projects",
        label: `${p.title}, ${p.subtitle}`,
        hint: `${p.n} · ${p.year}`,
        icon: "▢",
        action: () => location.href = projectHref(p.slug)
      });
    });
    // Actions
    list.push({
      id: "act-cv-pdf",
      group: "Actions",
      label: "Download CV (PDF)",
      hint: "PDF",
      icon: "↓",
      action: () => {
        const a = document.createElement("a");
        a.href = cvHref;
        a.download = "David-Onasanya-CV.pdf";
        document.body.appendChild(a); a.click(); a.remove();
      }
    });
    list.push({
      id: "act-email",
      group: "Actions",
      label: "Copy email to clipboard",
      hint: D.person?.email || "",
      icon: "@",
      action: async () => {
        if (!D.person?.email) return;
        try { await navigator.clipboard.writeText(D.person.email); toast("Email copied"); }
        catch { window.location.href = `mailto:${D.person.email}`; }
      }
    });
    list.push({
      id: "act-mail",
      group: "Actions",
      label: "Email David",
      hint: D.person?.email || "",
      icon: "✉",
      action: () => window.location.href = `mailto:${D.person?.email || ""}`
    });
    if (D.person?.github) list.push({
      id: "act-gh",
      group: "Actions",
      label: "Open GitHub",
      hint: "External",
      icon: "↗",
      action: () => window.open(D.person.github, "_blank", "noopener")
    });
    if (D.person?.linkedin) list.push({
      id: "act-li",
      group: "Actions",
      label: "Open LinkedIn",
      hint: "External",
      icon: "↗",
      action: () => window.open(D.person.linkedin, "_blank", "noopener")
    });
    list.push({
      id: "act-theme",
      group: "Actions",
      label: "Toggle theme (dark / light)",
      hint: "T",
      icon: "◐",
      action: () => {
        const cur = document.documentElement.getAttribute("data-theme") || "dark";
        const next = cur === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        try { localStorage.setItem("theme", next); } catch {}
      }
    });
    list.push({
      id: "act-print",
      group: "Actions",
      label: "Print this page",
      hint: "Cmd+P",
      icon: "⎙",
      action: () => window.print()
    });
    return list;
  }, []);

  // Filter
  const filtered = useMemo(() => {
    if (!q.trim()) return commands;
    const needle = q.toLowerCase();
    return commands.filter(c =>
      c.label.toLowerCase().includes(needle) ||
      (c.hint || "").toLowerCase().includes(needle) ||
      (c.group || "").toLowerCase().includes(needle)
    );
  }, [q, commands]);

  // Group filtered by group preserving order
  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach(c => {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group).push(c);
    });
    return [...map.entries()];
  }, [filtered]);

  // Open / close
  useEffect(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(v => !v);
        return;
      }
      // "/" also opens (when not typing)
      if (!open && e.key === "/" && !["INPUT","TEXTAREA"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      // Quick shortcuts when palette closed
      if (!open && !meta && !e.altKey && !["INPUT","TEXTAREA"].includes(document.activeElement?.tagName)) {
        if (e.key === "?") { e.preventDefault(); setOpen(true); setQ(""); }
        if (e.key === "t") {
          e.preventDefault();
          const cur = document.documentElement.getAttribute("data-theme") || "dark";
          const next = cur === "dark" ? "light" : "dark";
          document.documentElement.setAttribute("data-theme", next);
          try { localStorage.setItem("theme", next); } catch {}
        }
      }
      if (open && e.key === "Escape") { e.preventDefault(); setOpen(false); }
      if (open && e.key === "ArrowDown") { e.preventDefault(); setActive(i => Math.min(i + 1, filtered.length - 1)); }
      if (open && e.key === "ArrowUp") { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
      if (open && e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[active];
        if (cmd) { cmd.action(); setOpen(false); setQ(""); setActive(0); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, filtered, active]);

  // Focus input on open / reset
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 30);
      setActive(0);
    }
  }, [open]);

  useEffect(() => { setActive(0); }, [q]);

  // Scroll active into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-cmd-idx="${active}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      const pr = listRef.current.getBoundingClientRect();
      if (r.bottom > pr.bottom) listRef.current.scrollTop += r.bottom - pr.bottom + 8;
      if (r.top < pr.top) listRef.current.scrollTop -= pr.top - r.top + 8;
    }
  }, [active, open]);

  // Trigger button bubble (always rendered, hint about Cmd+K)
  const isMac = useMemo(() => /Mac|iPhone|iPod|iPad/.test(navigator.platform), []);

  let runIdx = -1;
  return (
    <>
      <button
        type="button"
        className={`cmdk-trigger ${open ? "is-open" : ""}`}
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
      >
        <span className="cmdk-icon">⌘</span>
        <span className="cmdk-label">Quick&nbsp;jump</span>
        <span className="cmdk-kbd">{isMac ? "⌘K" : "Ctrl K"}</span>
      </button>

      {open && (
        <div className="cmdk-overlay" role="dialog" aria-modal="true" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}>
          <div className="cmdk-panel">
            <div className="cmdk-input-row">
              <span className="cmdk-input-icon">⌕</span>
              <input
                ref={inputRef}
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search projects, sections, actions..."
                className="cmdk-input"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="cmdk-esc">esc</kbd>
            </div>
            <div ref={listRef} className="cmdk-list" role="listbox">
              {grouped.length === 0 && (
                <div className="cmdk-empty">No matches.</div>
              )}
              {grouped.map(([group, items]) => (
                <div key={group} className="cmdk-group">
                  <div className="cmdk-group-label">{group}</div>
                  {items.map((c) => {
                    runIdx++;
                    const i = runIdx;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        data-cmd-idx={i}
                        className={`cmdk-item ${i === active ? "active" : ""}`}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => { c.action(); setOpen(false); setQ(""); }}
                      >
                        <span className="cmdk-item-icon">{c.icon}</span>
                        <span className="cmdk-item-label">{c.label}</span>
                        <span className="cmdk-item-hint">{c.hint}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="cmdk-foot">
              <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
              <span><kbd>↵</kbd> open</span>
              <span><kbd>esc</kbd> close</span>
              <span className="cmdk-foot-spacer" />
              <span>{filtered.length} result{filtered.length === 1 ? "" : "s"}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Tiny toast helper (used by command palette)
function toast(msg) {
  let host = document.querySelector(".do-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.className = "do-toast-host";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  el.className = "do-toast";
  el.textContent = msg;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("in"));
  setTimeout(() => {
    el.classList.remove("in");
    setTimeout(() => el.remove(), 250);
  }, 1800);
}

// Mounts the command palette into a fixed root.
function mountCommandPalette() {
  if (document.getElementById("cmdk-root")) return;
  const root = document.createElement("div");
  root.id = "cmdk-root";
  document.body.appendChild(root);
  ReactDOM.createRoot(root).render(<CommandPalette />);
}

// Auto-init: magnetic + palette + reduced-motion class on root.
function PortfolioEnhancements() {
  useMagneticButtons();
  const reduced = useReducedMotion();
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduced);
  }, [reduced]);
  return null;
}

// Export
Object.assign(window, {
  PortfolioEnhancements,
  CommandPalette,
  mountCommandPalette,
  useReducedMotion,
  useMagneticButtons,
  doToast: toast,
});

// Auto-mount the command palette when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountCommandPalette);
} else {
  mountCommandPalette();
}
