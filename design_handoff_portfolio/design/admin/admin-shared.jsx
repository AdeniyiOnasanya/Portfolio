/* global React, ReactDOM */
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// === Shared admin building blocks ===

function useDirty() {
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const recheck = () => setDirty(window.PortfolioStore.isDirty());
    recheck();
    window.addEventListener("portfolio:draft-saved", recheck);
    window.addEventListener("portfolio:published", recheck);
    window.addEventListener("portfolio:draft-discarded", recheck);
    return () => {
      window.removeEventListener("portfolio:draft-saved", recheck);
      window.removeEventListener("portfolio:published", recheck);
      window.removeEventListener("portfolio:draft-discarded", recheck);
    };
  }, []);
  return dirty;
}

function useToast() {
  const [toast, setToast] = useState(null);
  const ref = useRef(null);
  const show = (msg, kind = "ok") => {
    setToast({ msg, kind });
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(() => setToast(null), 2200);
  };
  return [toast, show];
}

function Toast({ toast }) {
  if (!toast) return null;
  return <div className={`admin-toast ${toast.kind}`}>{toast.msg}</div>;
}

// Persisted form input that sets a deep path on the draft.
function setDeep(obj, path, value) {
  const next = JSON.parse(JSON.stringify(obj));
  const keys = path.split(".");
  let cur = next;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!(k in cur) || typeof cur[k] !== "object") cur[k] = {};
    cur = cur[k];
  }
  cur[keys[keys.length - 1]] = value;
  return next;
}
function getDeep(obj, path) {
  return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
}

function Field({ label, hint, children }) {
  return (
    <div className="f">
      <label>{label}{hint && <span className="hint">{hint}</span>}</label>
      {children}
    </div>
  );
}

function TextField({ label, hint, value, onChange, type = "text", placeholder, mono = false }) {
  return (
    <Field label={label} hint={hint}>
      <input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        className={mono ? "mono" : ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function TextArea({ label, hint, value, onChange, rows = 4, placeholder }) {
  return (
    <Field label={label} hint={hint}>
      <textarea
        value={value ?? ""}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

function Switch({ on, onClick, label, sub }) {
  return (
    <div className="toggle-row">
      <div className="label">
        <b>{label}</b>
        {sub && <span>{sub}</span>}
      </div>
      <div className={"switch" + (on ? " on" : "")} onClick={onClick} role="switch" aria-checked={on} tabIndex={0} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onClick(); } }} />
    </div>
  );
}

function TagInput({ values, onChange, placeholder = "Add tag, Enter" }) {
  const [draft, setDraft] = useState("");
  const arr = values || [];
  function commit() {
    const v = draft.trim();
    if (!v) return;
    if (arr.includes(v)) { setDraft(""); return; }
    onChange([...arr, v]);
    setDraft("");
  }
  return (
    <div className="tag-input">
      {arr.map((t, i) => (
        <span className="tag" key={t + i}>
          {t}
          <button type="button" onClick={() => onChange(arr.filter((_, j) => j !== i))} aria-label={`Remove ${t}`}>×</button>
        </span>
      ))}
      <input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); }
          else if (e.key === "Backspace" && !draft && arr.length) { onChange(arr.slice(0, -1)); }
        }}
        onBlur={commit}
      />
    </div>
  );
}

function ImageUpload({ value, onFile, onClear, hint }) {
  const inputRef = useRef(null);
  const handle = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onFile(reader.result, file.name);
    reader.readAsDataURL(file);
  };
  return (
    <div className="uploader">
      <div className={"preview" + (value ? "" : " empty")} style={value ? { backgroundImage: `url(${value})` } : {}}>
        {!value && <span>NO IMAGE</span>}
      </div>
      <div
        className="drop"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handle(e.dataTransfer.files?.[0]); }}
      >
        Drop image or click. {hint}
      </div>
      {value && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>Clear</button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => handle(e.target.files?.[0])}
      />
    </div>
  );
}

function Modal({ title, children, onClose, actions }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modal-mask" onClick={(e) => { if (e.target.classList.contains("modal-mask")) onClose(); }}>
      <div className="modal">
        <h3>{title}</h3>
        {children}
        <div className="row">{actions}</div>
      </div>
    </div>
  );
}

// Reorderable list helper. Items rendered with key=item.id (stable).
function useDragReorder(onReorder) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  return {
    dragProps: (id) => ({
      draggable: true,
      onDragStart: (e) => { setDragId(id); e.dataTransfer.effectAllowed = "move"; },
      onDragEnd: () => { setDragId(null); setOverId(null); },
    }),
    dropProps: (id) => ({
      onDragOver: (e) => { if (dragId && dragId !== id) { e.preventDefault(); setOverId(id); } },
      onDragLeave: () => { if (overId === id) setOverId(null); },
      onDrop: (e) => { e.preventDefault(); if (dragId && dragId !== id) onReorder(dragId, id); setDragId(null); setOverId(null); },
    }),
    dragId, overId,
  };
}

Object.assign(window, {
  AdminUtils: { setDeep, getDeep },
  useDirty, useToast,
  Toast, Field, TextField, TextArea, Switch, TagInput, ImageUpload, Modal, useDragReorder,
});
