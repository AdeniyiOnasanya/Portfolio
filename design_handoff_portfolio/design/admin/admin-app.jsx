/* global React, ReactDOM */
const { useState: usA, useEffect: ueA, useRef: urA, useMemo: umA, useCallback: ucA } = React;
const { useDirty: udA, useToast: utA, Toast: TostA, Modal: ModA } = window;
const { HeroEditor, ContactEditor, SkillsEditor, ExperienceEditor, AiEditor, FooterEditor, SettingsEditor, ProjectsEditor } = window;

// === AUTH GATE ===
function checkSession() {
  try {
    const sess = JSON.parse(localStorage.getItem("portfolio.session") || "null");
    if (!sess) return false;
    if (sess.exp && sess.exp < Date.now()) {
      // Allow long-lived session for this prototype: the magic-link "consumes" the token,
      // but we extend session for 30 days on first land. Treat any session presence as valid.
    }
    return true;
  } catch { return false; }
}

function consumeMagicLink() {
  const params = new URLSearchParams(location.search);
  const token = params.get("token");
  if (!token) return checkSession();
  try {
    const sess = JSON.parse(localStorage.getItem("portfolio.session") || "null");
    if (sess && sess.token === token) {
      // Extend session 30 days
      sess.exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
      sess.activated = true;
      localStorage.setItem("portfolio.session", JSON.stringify(sess));
      // Clean URL
      history.replaceState(null, "", "admin.html");
      return true;
    }
  } catch {}
  return checkSession();
}

function logout() {
  try { localStorage.removeItem("portfolio.session"); } catch {}
  location.href = "login.html";
}

// === NAV CONFIG ===
const NAV = [
  { group: "Content", items: [
    { id: "hero", num: "01", label: "Hero & About" },
    { id: "contact", num: "02", label: "Contact" },
    { id: "skills", num: "03", label: "Skills" },
    { id: "experience", num: "04", label: "Experience" },
    { id: "ai", num: "05", label: "AI Practice" },
    { id: "footer", num: "06", label: "Footer" },
  ]},
  { group: "Catalog", items: [
    { id: "projects", num: "07", label: "Projects" },
  ]},
  { group: "Site", items: [
    { id: "settings", num: "08", label: "Settings" },
  ]},
];

const PAGES = {
  hero: HeroEditor,
  contact: ContactEditor,
  skills: SkillsEditor,
  experience: ExperienceEditor,
  ai: AiEditor,
  footer: FooterEditor,
  projects: ProjectsEditor,
  settings: SettingsEditor,
};

// === ADMIN APP ===
function AdminApp() {
  const [authed, setAuthed] = usA(() => consumeMagicLink());
  const [draft, setDraft] = usA(() => window.PortfolioStore.getDraft());
  const [active, setActive] = usA(() => localStorage.getItem("admin.active") || "hero");
  const [showPreview, setShowPreview] = usA(() => localStorage.getItem("admin.preview") !== "0");
  const [previewKey, setPreviewKey] = usA(0);
  const [confirmReset, setConfirmReset] = usA(false);
  const [confirmDiscard, setConfirmDiscard] = usA(false);
  const dirty = udA();
  const [toast, showToast] = utA();
  const saveTimer = urA(null);

  // Persist active section
  ueA(() => { localStorage.setItem("admin.active", active); }, [active]);
  ueA(() => { localStorage.setItem("admin.preview", showPreview ? "1" : "0"); }, [showPreview]);

  // Auto-save draft (debounced)
  const handleChange = ucA((next) => {
    setDraft(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      window.PortfolioStore.saveDraft(next);
      setPreviewKey(k => k + 1); // refresh iframe with new draft
    }, 350);
  }, []);

  // Cmd+S = save+publish, Cmd+P = preview toggle
  ueA(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (dirty) handlePublish();
      } else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setShowPreview(s => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Warn on close if dirty
  ueA(() => {
    const onLeave = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  if (!authed) {
    return (
      <div className="locked-screen">
        <h1><em>Locked.</em></h1>
        <p>Your session has expired or you arrived without a magic link. Sign in again to continue.</p>
        <a className="btn btn-primary" href="login.html">Sign in</a>
      </div>
    );
  }

  function handlePublish() {
    // Make sure latest draft is committed before publish
    window.PortfolioStore.saveDraft(draft);
    const ok = window.PortfolioStore.publish();
    setPreviewKey(k => k + 1);
    showToast(ok ? "Published. Public site updated." : "Nothing to publish.", ok ? "ok" : "warn");
  }
  function handleDiscard() {
    window.PortfolioStore.discardDraft();
    setDraft(window.PortfolioStore.getDraft());
    setPreviewKey(k => k + 1);
    setConfirmDiscard(false);
    showToast("Draft discarded. Reverted to published.", "warn");
  }
  function handleReset() {
    window.PortfolioStore.resetAll();
    setDraft(window.PortfolioStore.getDraft());
    setPreviewKey(k => k + 1);
    setConfirmReset(false);
    showToast("Reset. Site is back to defaults.", "warn");
  }

  const ActivePage = PAGES[active] || PAGES.hero;
  const activeLabel = NAV.flatMap(g => g.items).find(i => i.id === active)?.label || "Editor";

  return (
    <div className="admin-app">
      <Sidebar active={active} setActive={setActive} onLogout={logout} />

      <div className="admin-topbar">
        <div className="crumb">
          <span>Admin</span>
          <span className="slash">/</span>
          <b>{activeLabel}</b>
          {active === "projects" && draft.projects && <span className="slash">/ {draft.projects.length} items</span>}
        </div>
        <div className="admin-actions">
          <span className={"dirty-indicator " + (dirty ? "dirty" : "clean")}>
            {dirty ? "Unsaved draft" : "Saved"}
          </span>
          <button className="btn btn-sm" onClick={() => setShowPreview(s => !s)} title="Toggle preview (⌘⇧P)">
            {showPreview ? "Hide preview" : "Show preview"}
          </button>
          <button className="btn btn-sm" disabled={!dirty} onClick={() => setConfirmDiscard(true)}>Discard</button>
          <button className="btn btn-primary btn-sm" disabled={!dirty} onClick={handlePublish} title="Publish (⌘S)">
            Publish
          </button>
        </div>
      </div>

      <div className={"admin-main" + (showPreview ? "" : " no-preview")}>
        <div className="admin-editor">
          <ActivePage data={draft} onChange={handleChange} />
          {active === "settings" && (
            <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
              <h3 style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--fg-mute)", marginBottom: 12 }}>Danger zone</h3>
              <button className="btn btn-danger btn-sm" onClick={() => setConfirmReset(true)}>Reset everything to defaults</button>
            </div>
          )}
        </div>
        {showPreview && (
          <div className="admin-preview">
            <div className="preview-bar">
              <span style={{ color: dirty ? "oklch(0.78 0.18 145)" : "var(--fg-mute)" }}>● {dirty ? "Draft" : "Published"} preview</span>
              <span style={{ flex: 1 }}></span>
              <button className="btn btn-sm" onClick={() => setPreviewKey(k => k + 1)}>↻ Refresh</button>
              <a className="btn btn-sm" href="index.html" target="_blank" rel="noopener">Open ↗</a>
            </div>
            <iframe key={previewKey} src={`index.html?preview=draft&t=${previewKey}`} title="Live preview" />
          </div>
        )}
      </div>

      {confirmReset && (
        <ModA
          title="Reset everything?"
          onClose={() => setConfirmReset(false)}
          actions={<>
            <button className="btn" onClick={() => setConfirmReset(false)}>Cancel</button>
            <button className="btn btn-danger" onClick={handleReset}>Yes, reset</button>
          </>}
        >
          <p>This wipes your draft, your published version, and any uploaded files. The portfolio reverts to the original content shipped with the site. This cannot be undone.</p>
        </ModA>
      )}
      {confirmDiscard && (
        <ModA
          title="Discard draft?"
          onClose={() => setConfirmDiscard(false)}
          actions={<>
            <button className="btn" onClick={() => setConfirmDiscard(false)}>Keep draft</button>
            <button className="btn btn-danger" onClick={handleDiscard}>Discard</button>
          </>}
        >
          <p>Your unsaved changes will be removed and the editor will revert to the last published version.</p>
        </ModA>
      )}

      <TostA toast={toast} />
    </div>
  );
}

function Sidebar({ active, setActive, onLogout }) {
  const sess = umA(() => {
    try { return JSON.parse(localStorage.getItem("portfolio.session") || "{}"); }
    catch { return {}; }
  }, []);
  return (
    <aside className="admin-sidebar">
      <div className="brand">
        <div className="brand-mark">
          <span style={{ fontStyle: "italic" }}>D</span>
        </div>
        <div>
          <div style={{ fontWeight: 500, fontSize: 14 }}>Portfolio CMS</div>
          <div className="brand-name">Onasanya / v1</div>
        </div>
      </div>

      {NAV.map(group => (
        <div key={group.group}>
          <div className="nav-group">{group.group}</div>
          {group.items.map(it => (
            <a
              key={it.id}
              className={"nav-item" + (active === it.id ? " active" : "")}
              onClick={() => setActive(it.id)}
            >
              <span className="num">{it.num}</span>
              <span>{it.label}</span>
            </a>
          ))}
        </div>
      ))}

      <div className="footer">
        <div className="user">
          <div className="avatar">D</div>
          <div className="meta">
            <b>{sess.email || "admin"}</b>
            <span style={{ color: "var(--fg-mute)" }}>SIGNED IN</span>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onLogout} style={{ width: "100%" }}>Sign out</button>
      </div>
    </aside>
  );
}

ReactDOM.createRoot(document.getElementById("admin-root")).render(<AdminApp />);
