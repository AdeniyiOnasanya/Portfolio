// Content store: layers DRAFT/PUBLISHED overrides on top of data.js defaults.
// Public pages read merged content; admin writes drafts and publishes.
// Used by both public pages (read-only) and the admin (read + write).

(function () {
  const DEFAULTS_KEY = "__defaults_loaded";
  const PUB_KEY = "portfolio.published";
  const DRAFT_KEY = "portfolio.draft";
  const FILES_KEY = "portfolio.files"; // base64 uploads keyed by id

  // Deep merge plain objects; arrays are replaced wholesale.
  function merge(base, over) {
    if (over === undefined || over === null) return base;
    if (Array.isArray(base) || Array.isArray(over)) return over ?? base;
    if (typeof base !== "object" || typeof over !== "object") return over;
    const out = { ...base };
    for (const k of Object.keys(over)) out[k] = merge(base[k], over[k]);
    return out;
  }

  function readJSON(key) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
    catch { return null; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.warn("store write failed", e); }
  }

  function getPublished() { return readJSON(PUB_KEY); }
  function getDraft() { return readJSON(DRAFT_KEY); }
  function getFiles() { return readJSON(FILES_KEY) || {}; }

  function applyMode(mode) {
    const defaults = window.__PORTFOLIO_DEFAULTS;
    if (!defaults) return;
    if (mode === "draft") {
      const d = getDraft();
      window.PORTFOLIO_DATA = d ? merge(defaults, d) : merge(defaults, getPublished() || {});
    } else {
      const p = getPublished();
      window.PORTFOLIO_DATA = p ? merge(defaults, p) : defaults;
    }
    // Resolve uploaded files: any string starting with "file:" is replaced with stored base64.
    const files = getFiles();
    JSON.stringify(window.PORTFOLIO_DATA, (k, v) => {
      if (typeof v === "string" && v.startsWith("file:") && files[v.slice(5)]) {
        // mutate? we can't from JSON.stringify directly. Walk separately.
      }
      return v;
    });
    function walk(o) {
      if (Array.isArray(o)) o.forEach(walk);
      else if (o && typeof o === "object") {
        for (const k of Object.keys(o)) {
          const v = o[k];
          if (typeof v === "string" && v.startsWith("file:")) {
            const id = v.slice(5);
            if (files[id]) o[k] = files[id];
          } else walk(v);
        }
      }
    }
    walk(window.PORTFOLIO_DATA);
  }

  // Snapshot the as-shipped defaults the first time data.js loads.
  if (window.PORTFOLIO_DATA && !window.__PORTFOLIO_DEFAULTS) {
    window.__PORTFOLIO_DEFAULTS = JSON.parse(JSON.stringify(window.PORTFOLIO_DATA));
  }

  // Public pages always render the published version, unless the URL has ?preview=draft.
  // Admin pages set window.__STORE_MODE = "draft" before loading this script.
  let mode = window.__STORE_MODE === "draft" ? "draft" : "published";
  try {
    const params = new URLSearchParams(location.search);
    if (params.get("preview") === "draft") mode = "draft";
  } catch {}
  applyMode(mode);

  // Expose API for the admin app.
  window.PortfolioStore = {
    getDefaults() { return window.__PORTFOLIO_DEFAULTS; },
    getDraft() { return getDraft() || JSON.parse(JSON.stringify(getPublished() || window.__PORTFOLIO_DEFAULTS)); },
    getPublished() { return getPublished(); },
    saveDraft(data) {
      writeJSON(DRAFT_KEY, data);
      applyMode("draft");
      window.dispatchEvent(new CustomEvent("portfolio:draft-saved"));
    },
    publish() {
      const d = getDraft();
      if (!d) return false;
      writeJSON(PUB_KEY, d);
      window.dispatchEvent(new CustomEvent("portfolio:published"));
      return true;
    },
    discardDraft() {
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      applyMode("published");
      window.dispatchEvent(new CustomEvent("portfolio:draft-discarded"));
    },
    resetAll() {
      try {
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(PUB_KEY);
        localStorage.removeItem(FILES_KEY);
      } catch {}
      applyMode("published");
    },
    hasDraft() { return !!getDraft(); },
    isDirty() {
      const d = getDraft();
      if (!d) return false;
      const p = getPublished() || window.__PORTFOLIO_DEFAULTS;
      return JSON.stringify(d) !== JSON.stringify(p);
    },
    // File handling
    saveFile(id, base64) {
      const files = getFiles();
      files[id] = base64;
      writeJSON(FILES_KEY, files);
    },
    deleteFile(id) {
      const files = getFiles();
      delete files[id];
      writeJSON(FILES_KEY, files);
    },
    getFiles,
    applyMode,
  };
})();
