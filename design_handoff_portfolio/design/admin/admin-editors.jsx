/* global React */
const { useState: uS } = React;
const { setDeep, getDeep } = window.AdminUtils;
const { Field: F, TextField: TF, TextArea: TA, Switch: SW, TagInput: TG, ImageUpload: IU } = window;

// === HERO + ABOUT (person) ===
function HeroEditor({ data, onChange }) {
  const p = data.person || {};
  const set = (k, v) => onChange(setDeep(data, `person.${k}`, v));
  return (
    <div className="editor-section">
      <div className="head">
        <div>
          <div className="section-ribbon"><span className="bar"></span>SECTION 01</div>
          <h2>Hero & About</h2>
        </div>
        <div className="num">person</div>
      </div>
      <div className="field-grid">
        <TF label="Name" value={p.name} onChange={(v) => set("name", v)} />
        <TF label="Role" value={p.role} onChange={(v) => set("role", v)} />
        <TF label="Location" value={p.location} onChange={(v) => set("location", v)} />
        <TF label="Years experience" type="number" value={p.yearsExp} onChange={(v) => set("yearsExp", parseInt(v) || p.yearsExp)} />
      </div>
      <div style={{ height: 16 }}></div>
      <TA label="Personal statement" hint="Sits under hero, kept short" rows={3} value={p.statement} onChange={(v) => set("statement", v)} />
      <div style={{ height: 16 }}></div>
      <TA label="Long bio (about section)" hint="Three paragraphs separated by a blank line" rows={9}
        value={(p.longBio || []).join("\n\n")}
        onChange={(v) => set("longBio", v.split(/\n\n+/).map(s => s.trim()).filter(Boolean))}
      />
    </div>
  );
}

// === CONTACT ===
function ContactEditor({ data, onChange }) {
  const p = data.person || {};
  const set = (k, v) => onChange(setDeep(data, `person.${k}`, v));
  const cv = p.cvUrl || "";
  const cvIsFile = cv.startsWith("file:");
  return (
    <div className="editor-section">
      <div className="head">
        <div>
          <div className="section-ribbon"><span className="bar"></span>SECTION 02</div>
          <h2>Contact & Links</h2>
        </div>
        <div className="num">person.contact</div>
      </div>
      <div className="field-grid">
        <TF label="Email" type="email" value={p.email} onChange={(v) => set("email", v)} mono />
        <TF label="Phone" type="tel" value={p.phone} onChange={(v) => set("phone", v)} mono />
        <TF label="GitHub URL" type="url" value={p.github} onChange={(v) => set("github", v)} mono />
        <TF label="LinkedIn URL" type="url" value={p.linkedin} onChange={(v) => set("linkedin", v)} mono />
        <TF label="CV file (PDF)" hint="URL or upload below" value={cvIsFile ? "(uploaded)" : cv} onChange={(v) => set("cvUrl", v)} mono />
        <TF label="CV file (DOCX)" value={p.cvDocxUrl} onChange={(v) => set("cvDocxUrl", v)} mono />
      </div>
      <div style={{ height: 14 }}></div>
      <F label="Upload a new CV PDF" hint="Stored as base64 in localStorage for the prototype">
        <IU
          value={null}
          hint="PDF up to 5MB"
          onFile={(b64) => {
            const id = `cv-${Date.now()}`;
            window.PortfolioStore.saveFile(id, b64);
            set("cvUrl", `file:${id}`);
          }}
          onClear={() => set("cvUrl", "assets/David-Onasanya-CV.pdf")}
        />
      </F>
    </div>
  );
}

// === SKILLS ===
function SkillsEditor({ data, onChange }) {
  const cats = data.skills || [];
  const setCat = (i, key, v) => {
    const next = [...cats]; next[i] = { ...next[i], [key]: v };
    onChange({ ...data, skills: next });
  };
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= cats.length) return;
    const next = [...cats]; [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...data, skills: next });
  };
  const add = () => onChange({ ...data, skills: [...cats, { label: "New category", items: [] }] });
  const remove = (i) => onChange({ ...data, skills: cats.filter((_, j) => j !== i) });
  return (
    <div className="editor-section">
      <div className="head">
        <div>
          <div className="section-ribbon"><span className="bar"></span>SECTION 03</div>
          <h2>Skills</h2>
        </div>
        <div className="num">skills[] · {cats.length}</div>
      </div>
      <div className="item-list">
        {cats.map((cat, i) => (
          <div key={i} className="item-card">
            <div className="item-head">
              <span className="drag" title="Reorder">::</span>
              <input
                value={cat.label || ""}
                onChange={(e) => setCat(i, "label", e.target.value)}
                style={{ flex: 1, background: "transparent", border: 0, color: "var(--fg)", fontFamily: "var(--sans)", fontSize: 16, fontWeight: 500, outline: "none" }}
              />
              <span className="item-meta">{(cat.items || []).length} items</span>
              <button className="btn btn-sm" onClick={() => move(i, -1)} title="Move up">↑</button>
              <button className="btn btn-sm" onClick={() => move(i, +1)} title="Move down">↓</button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(i)}>Remove</button>
            </div>
            <div className="body">
              <TG values={cat.items || []} onChange={(v) => setCat(i, "items", v)} />
            </div>
          </div>
        ))}
      </div>
      <div className="add-row"><button className="btn" onClick={add}>+ Add category</button></div>
    </div>
  );
}

// === EXPERIENCE ===
function ExperienceEditor({ data, onChange }) {
  const xs = data.experience || [];
  const setX = (i, key, v) => {
    const next = [...xs]; next[i] = { ...next[i], [key]: v };
    onChange({ ...data, experience: next });
  };
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= xs.length) return;
    const next = [...xs]; [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...data, experience: next });
  };
  const add = () => onChange({ ...data, experience: [{ role: "New role", company: "Company", where: "City", when: "Year, Year", desc: "", tags: [] }, ...xs] });
  const remove = (i) => onChange({ ...data, experience: xs.filter((_, j) => j !== i) });
  return (
    <div className="editor-section">
      <div className="head">
        <div>
          <div className="section-ribbon"><span className="bar"></span>SECTION 04</div>
          <h2>Experience</h2>
        </div>
        <div className="num">experience[] · {xs.length}</div>
      </div>
      <div className="item-list">
        {xs.map((x, i) => (
          <div key={i} className="item-card">
            <div className="item-head">
              <span className="drag">::</span>
              <div className="item-title">{x.role || "Untitled"} <span className="item-meta">· {x.company}</span></div>
              <span className="item-meta">{x.when}</span>
              <button className="btn btn-sm" onClick={() => move(i, -1)} title="Move up">↑</button>
              <button className="btn btn-sm" onClick={() => move(i, +1)} title="Move down">↓</button>
              <button className="btn btn-danger btn-sm" onClick={() => remove(i)}>Remove</button>
            </div>
            <div className="body">
              <div className="field-grid">
                <TF label="Role" value={x.role} onChange={(v) => setX(i, "role", v)} />
                <TF label="Company" value={x.company} onChange={(v) => setX(i, "company", v)} />
                <TF label="Where" value={x.where} onChange={(v) => setX(i, "where", v)} />
                <TF label="When" hint="e.g. 07/2023, Present" value={x.when} onChange={(v) => setX(i, "when", v)} />
              </div>
              <TA label="Description" rows={3} value={x.desc} onChange={(v) => setX(i, "desc", v)} />
              <F label="Tags"><TG values={x.tags || []} onChange={(v) => setX(i, "tags", v)} /></F>
            </div>
          </div>
        ))}
      </div>
      <div className="add-row"><button className="btn" onClick={add}>+ Add role</button></div>
    </div>
  );
}

// === AI PRACTICE ===
function AiEditor({ data, onChange }) {
  const a = data.aiPractice || {};
  const set = (k, v) => onChange(setDeep(data, `aiPractice.${k}`, v));
  const setPillar = (i, key, v) => {
    const next = [...(a.pillars || [])]; next[i] = { ...next[i], [key]: v };
    set("pillars", next);
  };
  const addPillar = () => set("pillars", [...(a.pillars || []), { n: `${(a.pillars || []).length + 1}.`, title: "New pillar", body: "" }]);
  const removePillar = (i) => set("pillars", (a.pillars || []).filter((_, j) => j !== i));
  const setRow = (i, key, v) => {
    const next = [...(a.workflow || [])]; next[i] = { ...next[i], [key]: v };
    set("workflow", next);
  };
  const addRow = () => set("workflow", [...(a.workflow || []), { k: "Step", v: "" }]);
  const removeRow = (i) => set("workflow", (a.workflow || []).filter((_, j) => j !== i));

  return (
    <div className="editor-section">
      <div className="head">
        <div>
          <div className="section-ribbon"><span className="bar"></span>SECTION 05</div>
          <h2>AI-Assisted Development</h2>
        </div>
        <div className="num">aiPractice</div>
      </div>
      <TF label="Eyebrow" value={a.eyebrow} onChange={(v) => set("eyebrow", v)} />
      <div style={{ height: 12 }}></div>
      <TF label="Headline" value={a.headline} onChange={(v) => set("headline", v)} />
      <div style={{ height: 12 }}></div>
      <TA label="Intro" rows={3} value={a.intro} onChange={(v) => set("intro", v)} />

      <h3 style={H3}>Pillars</h3>
      <div className="item-list">
        {(a.pillars || []).map((p, i) => (
          <div key={i} className="item-card">
            <div className="item-head">
              <span className="item-meta" style={{ width: 24 }}>{p.n || `${i + 1}.`}</span>
              <input value={p.title || ""} onChange={(e) => setPillar(i, "title", e.target.value)}
                style={{ flex: 1, background: "transparent", border: 0, color: "var(--fg)", fontWeight: 500, outline: "none", fontSize: 15 }} />
              <button className="btn btn-danger btn-sm" onClick={() => removePillar(i)}>Remove</button>
            </div>
            <div className="body">
              <div className="field-grid">
                <TF label="Roman / number" value={p.n} onChange={(v) => setPillar(i, "n", v)} mono />
                <TF label="Title" value={p.title} onChange={(v) => setPillar(i, "title", v)} />
              </div>
              <TA label="Body" rows={2} value={p.body} onChange={(v) => setPillar(i, "body", v)} />
            </div>
          </div>
        ))}
      </div>
      <div className="add-row"><button className="btn btn-sm" onClick={addPillar}>+ Add pillar</button></div>

      <h3 style={H3}>Workflow rows</h3>
      <div className="item-list">
        {(a.workflow || []).map((r, i) => (
          <div key={i} className="item-card">
            <div className="item-head">
              <input value={r.k || ""} onChange={(e) => setRow(i, "k", e.target.value)}
                style={{ width: 160, background: "transparent", border: 0, color: "var(--fg)", fontWeight: 500, outline: "none" }} />
              <span className="item-meta" style={{ flex: 1 }}>{r.v}</span>
              <button className="btn btn-danger btn-sm" onClick={() => removeRow(i)}>Remove</button>
            </div>
            <div className="body">
              <div className="field-grid">
                <TF label="Phase (k)" value={r.k} onChange={(v) => setRow(i, "k", v)} />
                <TF label="Note (v)" value={r.v} onChange={(v) => setRow(i, "v", v)} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="add-row"><button className="btn btn-sm" onClick={addRow}>+ Add row</button></div>
    </div>
  );
}

// === FOOTER ===
function FooterEditor({ data, onChange }) {
  const f = data.footer || {};
  const set = (k, v) => onChange(setDeep(data, `footer.${k}`, v));
  return (
    <div className="editor-section">
      <div className="head">
        <div>
          <div className="section-ribbon"><span className="bar"></span>SECTION 06</div>
          <h2>Footer</h2>
        </div>
        <div className="num">footer</div>
      </div>
      <TF label="Display heading" value={f.heading} onChange={(v) => set("heading", v)} />
      <div style={{ height: 12 }}></div>
      <TA label="Copy" rows={3} value={f.copy} onChange={(v) => set("copy", v)} />
      <div style={{ height: 12 }}></div>
      <div className="field-grid">
        <TF label="Availability message" value={f.availability} onChange={(v) => set("availability", v)} />
        <TF label="Copyright line" value={f.copyright} onChange={(v) => set("copyright", v)} />
      </div>
    </div>
  );
}

// === SETTINGS / VISIBILITY ===
function SettingsEditor({ data, onChange }) {
  const s = data.settings || {};
  const set = (k, v) => onChange(setDeep(data, `settings.${k}`, v));
  const v = s.visibility || {};
  const setV = (k, val) => onChange(setDeep(data, `settings.visibility.${k}`, val));
  return (
    <div className="editor-section">
      <div className="head">
        <div>
          <div className="section-ribbon"><span className="bar"></span>SECTION 07</div>
          <h2>Site Settings</h2>
        </div>
        <div className="num">settings</div>
      </div>

      <h3 style={H3}>Theme</h3>
      <div className="field-grid">
        <F label="Default theme">
          <select value={s.defaultTheme || "system"} onChange={(e) => set("defaultTheme", e.target.value)}>
            <option value="system">Match visitor's system</option>
            <option value="dark">Always dark</option>
            <option value="light">Always light</option>
          </select>
        </F>
        <F label="Cinematic intro">
          <select value={s.intro === false ? "off" : "on"} onChange={(e) => set("intro", e.target.value === "on")}>
            <option value="on">Show on first visit</option>
            <option value="off">Disabled</option>
          </select>
        </F>
      </div>

      <h3 style={H3}>Section visibility</h3>
      <SW on={v.about !== false} onClick={() => setV("about", !(v.about !== false))} label="About" sub="Long bio paragraphs" />
      <SW on={v.skills !== false} onClick={() => setV("skills", !(v.skills !== false))} label="Skills" sub="Categorised grid" />
      <SW on={v.experience !== false} onClick={() => setV("experience", !(v.experience !== false))} label="Experience" sub="Timeline" />
      <SW on={v.aiPractice !== false} onClick={() => setV("aiPractice", !(v.aiPractice !== false))} label="AI Practice" sub="Pillars + workflow" />
      <SW on={v.projects !== false} onClick={() => setV("projects", !(v.projects !== false))} label="Project index" sub="Work list on home" />
    </div>
  );
}

const H3 = { fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--fg-mute)", marginTop: 32, marginBottom: 12 };

Object.assign(window, { HeroEditor, ContactEditor, SkillsEditor, ExperienceEditor, AiEditor, FooterEditor, SettingsEditor });
