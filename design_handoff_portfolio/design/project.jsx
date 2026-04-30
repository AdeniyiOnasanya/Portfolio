/* global React, ReactDOM */
const { useEffect, useState, useRef } = React;

// === Flagship deep-dive (metrics + before-after slider + process timeline) ===
function DeepDive({ deepDive, hue }) {
  return (
    <>
      {/* Metrics */}
      <section className="proj-section reveal dd-section">
        <div className="label">- Impact</div>
        <div>
          <h3>By the <em>numbers</em>.</h3>
          <p>{deepDive.metricsIntro}</p>
          <div className="dd-metrics">
            {deepDive.metrics.map((m, i) => (
              <div className="dd-metric" key={i}>
                <div className="dd-metric-v">
                  {m.prefix && <span className="dd-metric-pre">{m.prefix}</span>}
                  <span>{m.value}</span>
                  {m.suffix && <span className="dd-metric-suf">{m.suffix}</span>}
                </div>
                <div className="dd-metric-l">{m.label}</div>
                {m.note && <div className="dd-metric-n">{m.note}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before / After */}
      {deepDive.beforeAfter && (
        <section className="proj-section reveal dd-section">
          <div className="label">- Before & After</div>
          <div>
            <h3>What <em>changed</em>.</h3>
            <p>{deepDive.beforeAfter.intro}</p>
            <BeforeAfter ba={deepDive.beforeAfter} hue={hue} />
          </div>
        </section>
      )}

      {/* Process timeline */}
      {deepDive.process && (
        <section className="proj-section reveal dd-section">
          <div className="label">- Process</div>
          <div>
            <h3>How it <em>came together</em>.</h3>
            <ol className="dd-process">
              {deepDive.process.map((step, i) => (
                <li key={i}>
                  <div className="dd-step-n">{String(i + 1).padStart(2, "0")}</div>
                  <div className="dd-step-body">
                    <div className="dd-step-t">{step.title}</div>
                    <div className="dd-step-d">{step.desc}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* Lessons / Reflections */}
      {deepDive.lessons && (
        <section className="proj-section reveal dd-section">
          <div className="label">- Reflections</div>
          <div>
            <h3>What I <em>took away</em>.</h3>
            <ul className="dd-lessons">
              {deepDive.lessons.map((l, i) => (
                <li key={i}>
                  <div className="dd-lesson-t">{l.title}</div>
                  <div className="dd-lesson-d">{l.body}</div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}

function BeforeAfter({ ba, hue }) {
  const [pos, setPos] = useState(50);
  const wrapRef = useRef(null);
  const dragging = useRef(false);

  const handleMove = (clientX) => {
    if (!wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const p = ((clientX - r.left) / r.width) * 100;
    setPos(Math.max(0, Math.min(100, p)));
  };

  useEffect(() => {
    const onMove = (e) => { if (dragging.current) handleMove(e.touches ? e.touches[0].clientX : e.clientX); };
    const onUp = () => { dragging.current = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  const onDown = (e) => {
    dragging.current = true;
    handleMove(e.touches ? e.touches[0].clientX : e.clientX);
  };

  return (
    <div className="dd-ba" ref={wrapRef} onMouseDown={onDown} onTouchStart={onDown}>
      {/* "Before" panel */}
      <div className="dd-ba-pane dd-ba-before">
        <div className="dd-ba-tag">BEFORE</div>
        <BAPlaceholder text={ba.beforeLabel} hue={hue} mode="before" />
      </div>
      {/* "After" panel, clipped */}
      <div className="dd-ba-pane dd-ba-after" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
        <div className="dd-ba-tag dd-ba-tag-after" style={{ left: `calc(${pos}% + 16px)` }}>AFTER</div>
        <BAPlaceholder text={ba.afterLabel} hue={hue} mode="after" />
      </div>
      {/* Slider handle */}
      <div className="dd-ba-handle" style={{ left: `${pos}%` }}>
        <div className="dd-ba-line" />
        <div className="dd-ba-knob">
          <span>‹</span><span>›</span>
        </div>
      </div>
      <div className="dd-ba-hint">drag to compare</div>
    </div>
  );
}

function BAPlaceholder({ text, hue, mode }) {
  // "before" reads stale: low saturation, dense rows of small text. "after" reads clean.
  if (mode === "before") {
    return (
      <div className="dd-ba-canvas dd-ba-canvas-before">
        <div className="dd-ba-chrome">
          <span className="dot" style={{background:"#ff5f56"}} />
          <span className="dot" style={{background:"#ffbd2e"}} />
          <span className="dot" style={{background:"#27c93f"}} />
          <span className="dd-ba-url">aws.console / azure.portal / billing.csv</span>
        </div>
        <div className="dd-ba-rows">
          {Array.from({length: 14}).map((_, i) => (
            <div className="dd-ba-row" key={i}>
              <span className="dd-ba-cell">i-{(0xa + i).toString(16)}f4{i}c2</span>
              <span className="dd-ba-cell">us-east-1</span>
              <span className="dd-ba-cell" style={{opacity:0.6}}>${(420 + i * 13).toFixed(2)}</span>
              <span className="dd-ba-cell" style={{color: i % 4 === 0 ? "#d97a5a" : "rgba(255,255,255,0.4)"}}>
                {i % 4 === 0 ? "OVER BUDGET" : "ok"}
              </span>
            </div>
          ))}
        </div>
        <div className="dd-ba-watermark">{text}</div>
      </div>
    );
  }
  return (
    <div className="dd-ba-canvas dd-ba-canvas-after" style={{
      background: `linear-gradient(135deg, oklch(0.18 0.04 ${hue}) 0%, oklch(0.1 0.02 ${hue}) 100%)`
    }}>
      <div className="dd-ba-after-grid">
        <div className="dd-ba-card big">
          <div className="dd-ba-card-l">Total cloud spend</div>
          <div className="dd-ba-card-v">$184.2k<span style={{color: `oklch(0.78 0.18 145)`, marginLeft: 12, fontSize: "0.5em"}}>↓ 18%</span></div>
          <div className="dd-ba-spark">
            <svg viewBox="0 0 200 40" preserveAspectRatio="none" width="100%" height="40">
              <polyline fill="none" stroke={`oklch(0.78 0.18 ${hue})`} strokeWidth="1.5" points="0,30 20,28 40,32 60,22 80,24 100,18 120,20 140,12 160,14 180,8 200,10"/>
            </svg>
          </div>
        </div>
        <div className="dd-ba-card">
          <div className="dd-ba-card-l">AWS</div>
          <div className="dd-ba-card-v small">$112.8k</div>
        </div>
        <div className="dd-ba-card">
          <div className="dd-ba-card-l">Azure</div>
          <div className="dd-ba-card-v small">$71.4k</div>
        </div>
        <div className="dd-ba-card wide">
          <div className="dd-ba-card-l">Auto-scaling rules · 14 active</div>
          <div className="dd-ba-bars">
            {[0.6, 0.4, 0.8, 0.5, 0.7, 0.3, 0.55].map((v, i) => (
              <div className="dd-ba-bar" key={i} style={{height: `${v * 100}%`, background: `oklch(0.78 0.13 ${hue} / ${0.4 + v * 0.6})`}} />
            ))}
          </div>
        </div>
      </div>
      <div className="dd-ba-watermark">{text}</div>
    </div>
  );
}

function ProjectPage({ slug }) {
  const D = window.PORTFOLIO_DATA;
  const idx = D.projects.findIndex(p => p.slug === slug);
  const p = D.projects[idx];
  const prev = D.projects[(idx - 1 + D.projects.length) % D.projects.length];
  const next = D.projects[(idx + 1) % D.projects.length];

  const hueByIdx = { "01": 145, "02": 28, "03": 210, "04": 280, "05": 180, "06": 340, "07": 60 };
  const hue = hueByIdx[p.n] ?? 145;

  return (
    <>
      <section className="proj-hero">
        <div className="container">
          <a className="back" href="../index.html#work">← Back to index</a>
          <div className="eyebrow-row reveal">
            <span>Project · {p.n} / 07</span>
            <span>·</span>
            <span>{p.year}</span>
            <span>·</span>
            <span>{p.kind}</span>
          </div>
          <h1>
            <span className="line-mask"><span>{p.title}</span></span>
            <span className="line-mask"><span><em style={{fontSize: "0.5em", letterSpacing: "-0.01em"}}>{p.tagline}</em></span></span>
          </h1>
        </div>
      </section>

      <div className="container">
        <div className="proj-meta reveal">
          {Object.entries(p.meta).map(([k, v]) => (
            <div className="item" key={k}>
              <div className="l">{k}</div>
              <div className="v">{v}</div>
            </div>
          ))}
        </div>

        {/* Visual hero */}
        <section className="proj-section">
          <div className="label">- Cover</div>
          <div>
            <div className="viz wide" style={{
              aspectRatio: "16 / 8",
              background: `linear-gradient(135deg, oklch(0.18 0.04 ${hue}) 0%, oklch(0.1 0.02 ${hue}) 100%)`,
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: `repeating-linear-gradient(-45deg, transparent 0, transparent 22px, oklch(0.78 0.13 ${hue} / 0.05) 22px, oklch(0.78 0.13 ${hue} / 0.05) 23px)`,
              }} />
              <div className="label">{p.subtitle.toUpperCase()}</div>
              <div style={{
                position: "absolute",
                bottom: 32, left: 32, right: 32,
                fontFamily: "var(--serif)",
                fontStyle: "italic",
                fontWeight: 300,
                fontSize: "clamp(40px, 7vw, 88px)",
                lineHeight: 0.95,
                letterSpacing: "-0.03em",
                color: `oklch(0.92 0.13 ${hue})`,
                fontVariationSettings: '"SOFT" 100, "WONK" 1, "opsz" 144',
                textShadow: "0 4px 40px rgba(0,0,0,0.4)",
              }}>{p.title}</div>
              <div style={{
                position: "absolute",
                top: 32, right: 32,
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.4)",
              }}>{p.n} / 07</div>
            </div>
          </div>
        </section>

        <section className="proj-section reveal">
          <div className="label">- Overview</div>
          <div>
            <h3>The <em>brief</em>.</h3>
            <p>{p.summary}</p>
            <div style={{marginTop: 32, display: "flex", gap: 8, flexWrap: "wrap"}}>
              {p.stack.map(s => (
                <span key={s} style={{
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--fg-dim)",
                  padding: "8px 14px",
                  border: "1px solid var(--line-strong)",
                  borderRadius: 999,
                }}>{s}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="proj-section reveal">
          <div className="label">- Problem</div>
          <div>
            <h3>What was <em>broken</em>.</h3>
            <p>{p.problem}</p>
          </div>
        </section>

        <section className="proj-section reveal">
          <div className="label">- Approach</div>
          <div>
            <h3>How I <em>built it</em>.</h3>
            <ul>
              {p.approach.map((a, i) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        </section>

        {/* Visual gallery */}
        <section className="proj-section reveal">
          <div className="label">- Screens</div>
          <div>
            <h3>The <em>surface</em>.</h3>
            <div className="gallery" style={{marginTop: 32}}>
              {p.visuals.map((v, i) => (
                <div key={i} className={`viz ${v.span === 2 ? "span-2" : ""}`} style={{
                  aspectRatio: v.w === "wide" ? "16 / 9" : v.w === "tall" ? "4 / 5" : "1",
                  background: `linear-gradient(${135 + i * 30}deg, oklch(0.16 0.03 ${hue}) 0%, oklch(0.1 0.02 ${hue}) 100%)`,
                }}>
                  <div className="label">{v.label}</div>
                </div>
              ))}
            </div>
            <p style={{marginTop: 24, fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-mute)", letterSpacing: "0.12em", textTransform: "uppercase"}}>
              · placeholder treatments, actual screens available on request
            </p>
          </div>
        </section>

        <section className="proj-section reveal">
          <div className="label">- Outcome</div>
          <div>
            <h3>What <em>shipped</em>.</h3>
            <p>{p.outcome}</p>
          </div>
        </section>

        {/* Deep dive only renders if data has it (flagship project) */}
        {p.deepDive && <DeepDive deepDive={p.deepDive} hue={hue} />}

        <div className="proj-nav">
          <a className="nav-card" href={`${prev.slug}.html`}>
            <div className="l">← Previous · {prev.n}</div>
            <div className="t">{prev.title}</div>
          </a>
          <a className="nav-card right" href={`${next.slug}.html`}>
            <div className="l">Next · {next.n} →</div>
            <div className="t">{next.title}</div>
          </a>
        </div>
      </div>
    </>
  );
}

function ProjectApp() {
  const [theme, setTheme] = useTheme();
  useReveal();

  const slug = window.PROJECT_SLUG;

  return (
    <>
      <CustomCursor />
      <PortfolioEnhancements />
      <div className="grain" />
      <Nav theme={theme} setTheme={setTheme} />
      <main className="app-enter in">
        <ProjectPage slug={slug} />
      </main>
      <footer className="footer">
        <div className="container">
          <div className="reveal">
            <div className="eyebrow" style={{marginBottom: 32}}>- Have a similar problem?</div>
            <div className="big">
              <span>Let's <em>talk</em>.</span>
              <a href={`mailto:${window.PORTFOLIO_DATA.person.email}`}>↗ {window.PORTFOLIO_DATA.person.email}</a>
            </div>
          </div>
          <div className="foot-row">
            <span>© {new Date().getFullYear()} David Onasanya</span>
            <a href="../index.html">← Index</a>
          </div>
        </div>
      </footer>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<ProjectApp />);
