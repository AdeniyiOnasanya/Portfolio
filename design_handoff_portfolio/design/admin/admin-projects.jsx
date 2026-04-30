/* global React */
const { useState: usP, useMemo: umP } = React;
const { setDeep: sdP } = window.AdminUtils;
const { Field: FP, TextField: TFP, TextArea: TAP, TagInput: TGP, ImageUpload: IUP, useDragReorder } = window;

function slugify(s) {
  return (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function ProjectsEditor({ data, onChange }) {
  const projects = data.projects || [];
  const [editingSlug, setEditingSlug] = usP(null);

  const reorder = (fromId, toId) => {
    const next = [...projects];
    const fi = next.findIndex(p => p.slug === fromId);
    const ti = next.findIndex(p => p.slug === toId);
    if (fi < 0 || ti < 0) return;
    const [moved] = next.splice(fi, 1);
    next.splice(ti, 0, moved);
    // Re-number n based on new order
    const renum = next.map((p, i) => ({ ...p, n: String(i + 1).padStart(2, "0") }));
    onChange({ ...data, projects: renum });
  };
  const dr = useDragReorder(reorder);

  const remove = (slug) => {
    if (!confirm(`Delete project "${slug}"? Discard the draft to undo.`)) return;
    const next = projects.filter(p => p.slug !== slug).map((p, i) => ({ ...p, n: String(i + 1).padStart(2, "0") }));
    onChange({ ...data, projects: next });
    if (editingSlug === slug) setEditingSlug(null);
  };

  const add = () => {
    const slug = `new-project-${Date.now().toString(36)}`;
    const fresh = {
      slug,
      n: String(projects.length + 1).padStart(2, "0"),
      title: "New project",
      subtitle: "Short subtitle",
      year: String(new Date().getFullYear()),
      role: "Engineering lead",
      kind: "Web app",
      stack: [],
      tagline: "One-line elevator.",
      summary: "What this project does and why it exists.",
      problem: "What was broken before.",
      approach: ["Approach 1", "Approach 2", "Approach 3"],
      outcome: "What shipped.",
      visuals: [],
      meta: { Year: String(new Date().getFullYear()), Role: "Engineering lead", Sector: "", Status: "In progress" }
    };
    onChange({ ...data, projects: [fresh, ...projects].map((p, i) => ({ ...p, n: String(i + 1).padStart(2, "0") })) });
    setEditingSlug(slug);
  };

  const editing = projects.find(p => p.slug === editingSlug);

  if (editing) {
    return (
      <ProjectEditDeep
        project={editing}
        onChange={(updated) => {
          const next = projects.map(p => (p.slug === editingSlug ? updated : p));
          onChange({ ...data, projects: next });
          if (updated.slug !== editingSlug) setEditingSlug(updated.slug);
        }}
        onClose={() => setEditingSlug(null)}
        onDelete={() => remove(editing.slug)}
      />
    );
  }

  return (
    <div className="editor-section">
      <div className="head">
        <div>
          <div className="section-ribbon"><span className="bar"></span>SECTION 08</div>
          <h2>Projects</h2>
        </div>
        <div className="num">projects[] · {projects.length}</div>
      </div>
      <div className="help-panel">
        <b>Drag</b> the handle to reorder, the list number updates automatically. <b>Click a row</b> to edit deeply, including the deep-dive case study fields. Project pages are generated from this data.
      </div>
      <div className="item-list">
        {projects.map((p, i) => (
          <div
            key={p.slug}
            className={"item-card" + (dr.dragId === p.slug ? " dragging" : "") + (dr.overId === p.slug ? " drop-over" : "")}
            {...dr.dropProps(p.slug)}
          >
            <div className="item-head">
              <span className="drag" {...dr.dragProps(p.slug)} title="Drag to reorder">::</span>
              <span className="item-meta" style={{ width: 32 }}>{p.n || String(i + 1).padStart(2, "0")}</span>
              <div className="item-title" style={{ cursor: "pointer" }} onClick={() => setEditingSlug(p.slug)}>
                <b>{p.title}</b> <span className="item-meta">· {p.subtitle}</span>
              </div>
              <span className="item-meta">{p.year}</span>
              <span className="item-meta">{p.kind}</span>
              {p.deepDive && <span className="item-meta" style={{ color: "oklch(0.78 0.18 145)" }}>· DEEP DIVE</span>}
              <button className="btn btn-sm" onClick={() => setEditingSlug(p.slug)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(p.slug)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
      <div className="add-row">
        <button className="btn btn-primary btn-sm" onClick={add}>+ New project</button>
      </div>
    </div>
  );
}

function ProjectEditDeep({ project, onChange, onClose, onDelete }) {
  const set = (k, v) => onChange({ ...project, [k]: v });
  const setMeta = (k, v) => onChange({ ...project, meta: { ...(project.meta || {}), [k]: v } });
  const setDD = (k, v) => onChange({ ...project, deepDive: { ...(project.deepDive || {}), [k]: v } });

  const stack = project.stack || [];
  const approach = project.approach || [];
  const visuals = project.visuals || [];
  const meta = project.meta || {};

  const updateVisual = (i, k, v) => {
    const next = [...visuals]; next[i] = { ...next[i], [k]: v };
    set("visuals", next);
  };
  const addVisual = () => set("visuals", [...visuals, { label: "Screen", w: "wide", image: null }]);
  const removeVisual = (i) => set("visuals", visuals.filter((_, j) => j !== i));

  return (
    <div className="editor-section">
      <div className="head">
        <div>
          <div className="section-ribbon">
            <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: "2px 8px" }}>← All projects</button>
            <span className="bar"></span>EDITING
          </div>
          <h2>{project.title}</h2>
        </div>
        <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete project</button>
      </div>

      <h3 style={H3}>Basics</h3>
      <div className="field-grid">
        <TFP label="Title" value={project.title} onChange={(v) => set("title", v)} />
        <TFP label="Subtitle" value={project.subtitle} onChange={(v) => set("subtitle", v)} />
        <TFP label="Slug (URL)" hint="lowercase, hyphens" value={project.slug} onChange={(v) => set("slug", slugify(v))} mono />
        <TFP label="Number (display)" hint="e.g. 01" value={project.n} onChange={(v) => set("n", v)} mono />
        <TFP label="Year" value={project.year} onChange={(v) => set("year", v)} />
        <TFP label="Role" value={project.role} onChange={(v) => set("role", v)} />
        <TFP label="Kind" hint="Web platform / Mobile app / Desktop" value={project.kind} onChange={(v) => set("kind", v)} />
        <FP label="Stack tags"><TGP values={stack} onChange={(v) => set("stack", v)} placeholder="React, Postgres, AWS" /></FP>
      </div>

      <div style={{ height: 16 }}></div>
      <TFP label="Tagline" hint="Italic display under title" value={project.tagline} onChange={(v) => set("tagline", v)} />
      <div style={{ height: 12 }}></div>
      <TAP label="Summary" hint="Short overview" rows={3} value={project.summary} onChange={(v) => set("summary", v)} />

      <h3 style={H3}>Narrative</h3>
      <TAP label="Problem" rows={3} value={project.problem} onChange={(v) => set("problem", v)} />
      <div style={{ height: 12 }}></div>
      <FP label="Approach (one bullet per line)">
        <textarea rows={5} value={approach.join("\n")} onChange={(e) => set("approach", e.target.value.split("\n").filter(s => s.trim()))} />
      </FP>
      <div style={{ height: 12 }}></div>
      <TAP label="Outcome" rows={3} value={project.outcome} onChange={(v) => set("outcome", v)} />

      <h3 style={H3}>Meta strip (4 cells)</h3>
      <div className="field-grid">
        <TFP label="Year" value={meta.Year} onChange={(v) => setMeta("Year", v)} />
        <TFP label="Role" value={meta.Role} onChange={(v) => setMeta("Role", v)} />
        <TFP label="Sector" value={meta.Sector} onChange={(v) => setMeta("Sector", v)} />
        <TFP label="Status" value={meta.Status} onChange={(v) => setMeta("Status", v)} />
      </div>

      <h3 style={H3}>Visuals</h3>
      <div className="help-panel">
        Each visual gets a placeholder card if no image is uploaded. Width: <code>wide</code> (2 cols) or <code>tall</code> (1 col, taller).
      </div>
      <div className="item-list">
        {visuals.map((s, i) => {
          const fileId = (s.image || "").startsWith("file:") ? s.image.slice(5) : null;
          const previewSrc = fileId ? (window.PortfolioStore.getFiles()[fileId] || null) : s.image;
          return (
            <div key={i} className="item-card">
              <div className="item-head">
                <span className="drag">::</span>
                <div className="item-title">{s.label || `Visual ${i + 1}`}</div>
                <span className="item-meta">{s.w || "wide"}</span>
                <button className="btn btn-danger btn-sm" onClick={() => removeVisual(i)}>Remove</button>
              </div>
              <div className="body">
                <div className="field-grid">
                  <TFP label="Label" value={s.label} onChange={(v) => updateVisual(i, "label", v)} />
                  <FP label="Width">
                    <select value={s.w || "wide"} onChange={(e) => updateVisual(i, "w", e.target.value)}>
                      <option value="wide">Wide</option>
                      <option value="tall">Tall</option>
                    </select>
                  </FP>
                </div>
                <FP label="Image (optional)">
                  <IUP
                    value={previewSrc}
                    onFile={(b64) => {
                      const id = `proj-${project.slug}-v${i}-${Date.now()}`;
                      window.PortfolioStore.saveFile(id, b64);
                      updateVisual(i, "image", `file:${id}`);
                    }}
                    onClear={() => {
                      if (fileId) window.PortfolioStore.deleteFile(fileId);
                      updateVisual(i, "image", null);
                    }}
                  />
                </FP>
              </div>
            </div>
          );
        })}
      </div>
      <div className="add-row"><button className="btn btn-sm" onClick={addVisual}>+ Add visual</button></div>

      <h3 style={H3}>Deep dive (case study)</h3>
      <div className="help-panel">
        When enabled, the project page renders impact metrics, before/after slider, process timeline, and reflections.
      </div>
      <div className="toggle-row">
        <div className="label">
          <b>Enable deep dive</b>
          <span>Adds metrics, timeline, reflections.</span>
        </div>
        <div className={"switch" + (project.deepDive ? " on" : "")} onClick={() => {
          if (project.deepDive) onChange({ ...project, deepDive: undefined });
          else onChange({ ...project, deepDive: { headline: "Deep dive", subhead: "What changed and how", metrics: [], processSteps: [], reflections: [] } });
        }} />
      </div>

      {project.deepDive && (
        <div style={{ marginTop: 16 }}>
          <TFP label="Deep dive headline" value={project.deepDive.headline} onChange={(v) => setDD("headline", v)} />
          <div style={{ height: 12 }}></div>
          <TAP label="Subhead" rows={2} value={project.deepDive.subhead} onChange={(v) => setDD("subhead", v)} />

          <h4 style={H4}>Impact metrics</h4>
          <MetricsEditor metrics={project.deepDive.metrics || []} onChange={(v) => setDD("metrics", v)} />

          <h4 style={H4}>Process steps</h4>
          <ListEditor
            items={project.deepDive.processSteps || []}
            template={{ title: "Step", body: "" }}
            onChange={(v) => setDD("processSteps", v)}
            row={(item, set) => (
              <>
                <TFP label="Title" value={item.title} onChange={(v) => set("title", v)} />
                <TAP label="Body" rows={2} value={item.body} onChange={(v) => set("body", v)} />
              </>
            )}
            label="step"
          />

          <h4 style={H4}>Reflections</h4>
          <ListEditor
            items={project.deepDive.reflections || []}
            template={{ title: "Reflection", body: "" }}
            onChange={(v) => setDD("reflections", v)}
            row={(item, set) => (
              <>
                <TFP label="Title" value={item.title} onChange={(v) => set("title", v)} />
                <TAP label="Body" rows={2} value={item.body} onChange={(v) => set("body", v)} />
              </>
            )}
            label="reflection"
          />
        </div>
      )}

      <div style={{ height: 64 }}></div>
      <button className="btn btn-ghost" onClick={onClose}>← Back to projects</button>
    </div>
  );
}

function MetricsEditor({ metrics, onChange }) {
  const update = (i, k, v) => {
    const next = [...metrics]; next[i] = { ...next[i], [k]: v };
    onChange(next);
  };
  const add = () => onChange([...metrics, { value: "0", prefix: "", suffix: "%", label: "Metric", note: "" }]);
  const remove = (i) => onChange(metrics.filter((_, j) => j !== i));
  return (
    <div className="item-list">
      {metrics.map((m, i) => (
        <div key={i} className="item-card">
          <div className="item-head">
            <span className="item-meta" style={{ width: 28 }}>0{i + 1}</span>
            <div className="item-title">{m.prefix}{m.value}{m.suffix} <span className="item-meta">· {m.label}</span></div>
            <button className="btn btn-danger btn-sm" onClick={() => remove(i)}>Remove</button>
          </div>
          <div className="body">
            <div className="field-grid col-3">
              <TFP label="Prefix" value={m.prefix} onChange={(v) => update(i, "prefix", v)} mono />
              <TFP label="Value" value={m.value} onChange={(v) => update(i, "value", v)} />
              <TFP label="Suffix" value={m.suffix} onChange={(v) => update(i, "suffix", v)} mono />
            </div>
            <TFP label="Label" value={m.label} onChange={(v) => update(i, "label", v)} />
            <TAP label="Note" rows={2} value={m.note} onChange={(v) => update(i, "note", v)} />
          </div>
        </div>
      ))}
      <div className="add-row"><button className="btn btn-sm" onClick={add}>+ Add metric</button></div>
    </div>
  );
}

function ListEditor({ items, template, onChange, row, label }) {
  const update = (i, key, v) => {
    const next = [...items]; next[i] = { ...next[i], [key]: v };
    onChange(next);
  };
  const add = () => onChange([...items, { ...template }]);
  const remove = (i) => onChange(items.filter((_, j) => j !== i));
  return (
    <div className="item-list">
      {items.map((item, i) => (
        <div key={i} className="item-card">
          <div className="item-head">
            <span className="item-meta" style={{ width: 28 }}>0{i + 1}</span>
            <div className="item-title">{item.title || `Item ${i + 1}`}</div>
            <button className="btn btn-danger btn-sm" onClick={() => remove(i)}>Remove</button>
          </div>
          <div className="body">
            {row(item, (k, v) => update(i, k, v))}
          </div>
        </div>
      ))}
      <div className="add-row"><button className="btn btn-sm" onClick={add}>+ Add {label}</button></div>
    </div>
  );
}

const H3 = { fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--fg-mute)", marginTop: 32, marginBottom: 12 };
const H4 = { fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-mute)", marginTop: 24, marginBottom: 8 };

Object.assign(window, { ProjectsEditor });
