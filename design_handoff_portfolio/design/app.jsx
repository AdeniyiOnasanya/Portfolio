/* global React, ReactDOM */
const { useEffect, useRef, useState } = React;

function Hero() {
  const D = window.PORTFOLIO_DATA;
  return (
    <section className="hero">
      <div className="container">
        <div className="meta-row">
          <span>Available · Q2 2026</span>
          <span>Stafford · UK · GMT</span>
          <span>v6.0, six years shipping</span>
        </div>
        <h1>
          <span className="row line-mask"><span>{D.person.name.split(" ")[0]}</span></span>
          <span className="row line-mask"><span><em>Onasanya.</em></span></span>
        </h1>
        <div className="sub-row">
          <p className="reveal">
            Full-stack software engineer designing & building web and mobile applications across healthcare, social care, cloud, and commerce, with a sharp eye for the interface and a respect for the API behind it.
          </p>
          <div className="stats">
            <div className="stat reveal"><div className="v"><em>06</em></div><div className="l">Years shipping</div></div>
            <div className="stat reveal"><div className="v">07</div><div className="l">Production projects</div></div>
            <div className="stat reveal"><div className="v">∞</div><div className="l">CSS rewrites</div></div>
          </div>
        </div>
        <div className="hero-actions reveal">
          <a className="btn-primary" href={D.person.cvUrl} download="David-Onasanya-CV.pdf" data-magnetic>
            <span>Download CV</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M7 2v8M3.5 6.5L7 10l3.5-3.5M2.5 12h9"/></svg>
          </a>
          <a className="btn-ghost" href={D.person.github} target="_blank" rel="noopener noreferrer" data-magnetic>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38v-1.34c-2.22.48-2.69-1.07-2.69-1.07-.36-.93-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.23 1.88.87 2.34.67.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.13 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.11.16 1.93.08 2.13.51.56.82 1.27.82 2.15 0 3.07-1.87 3.74-3.65 3.94.29.25.54.74.54 1.5v2.22c0 .21.15.46.55.38A8 8 0 0 0 8 0z"/></svg>
            <span>GitHub</span>
          </a>
          <a className="btn-ghost" href={D.person.linkedin} target="_blank" rel="noopener noreferrer" data-magnetic>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13.6 0H2.4A2.4 2.4 0 0 0 0 2.4v11.2A2.4 2.4 0 0 0 2.4 16h11.2a2.4 2.4 0 0 0 2.4-2.4V2.4A2.4 2.4 0 0 0 13.6 0zM4.8 13.6H2.4V6h2.4v7.6zM3.6 5a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8zm10 8.6h-2.4V9.7c0-.9 0-2.1-1.3-2.1s-1.5 1-1.5 2v4H6V6h2.3v1c.3-.6 1.1-1.2 2.3-1.2 2.4 0 2.9 1.6 2.9 3.6v4.2z"/></svg>
            <span>LinkedIn</span>
          </a>
          <a className="btn-ghost" href={`mailto:${D.person.email}`} data-magnetic>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="1.5" y="3" width="11" height="8" rx="1"/><path d="M1.5 4l5.5 4 5.5-4"/></svg>
            <span>Email</span>
          </a>
        </div>
      </div>
      <Marquee />
    </section>
  );
}

function Marquee() {
  const items = [
    "Laravel", "React", "TypeScript", "React Native (Expo)", "Vue", "Nuxt",
    "AWS", "Azure", "MySQL", "GraphQL", "Tailwind CSS",
    "Figma", "Claude Code", "Node.js", "Inertia", "PHPUnit", "Jest", "Docker"
  ];
  const track = [...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="track">
        {track.map((t, i) => (
          <span className="m-item" key={i}>{t}</span>
        ))}
      </div>
    </div>
  );
}

function About() {
  const D = window.PORTFOLIO_DATA;
  return (
    <section id="about">
      <div className="container">
        <div className="section-head reveal">
          <div className="num">01 / About</div>
          <h2>I build the <em>thing</em>,<br/>and the thing <em>around</em> it.</h2>
        </div>
        <div className="about-grid reveal">
          <div className="label">- Statement</div>
          <p>{D.person.statement}</p>
          <div className="narrow">
            {D.person.longBio.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function Skills() {
  const D = window.PORTFOLIO_DATA;
  return (
    <section id="skills">
      <div className="container">
        <div className="section-head reveal">
          <div className="num">02 / Stack</div>
          <h2>Tools I reach<br/>for <em>without</em> thinking.</h2>
        </div>
        <div className="skills-grid skills-block reveal">
          <div className="label" style={{fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--fg-mute)"}}>- Categories</div>
          <div className="skills-list">
            {D.skills.map((cat, i) => (
              <div className="skill-cat" key={i}>
                <div className="cat-label">{cat.label}</div>
                <ul>
                  {cat.items.map(s => <li key={s}>{s}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Experience() {
  const D = window.PORTFOLIO_DATA;
  return (
    <section id="cv">
      <div className="container">
        <div className="section-head reveal">
          <div className="num">03 / CV</div>
          <h2>Six years.<br/>Three <em>chapters</em>.</h2>
        </div>
        <div className="exp-list">
          {D.experience.map((e, i) => (
            <div className="exp-item reveal" key={i}>
              <div className="when">{e.when}<br/><span style={{color:"var(--fg-mute)"}}>{e.where}</span></div>
              <div className="role">{e.role}<span className="co">{e.company}</span></div>
              <div className="desc">
                {e.desc}
                <div className="tags">{e.tags.map(t => <span key={t}>{t}</span>)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Education + Certs */}
        <div className="exp-list" style={{paddingBottom: 0}}>
          <div className="exp-item reveal">
            <div className="when">Education</div>
            <div className="role">
              {D.education[0].degree}
              <span className="co">{D.education[0].school}</span>
            </div>
            <div className="desc">
              {D.education[0].result}
              <div style={{marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--line)"}}>
                <div className="role" style={{fontSize: 22}}>
                  {D.education[1].degree}
                  <span className="co" style={{fontSize: 18}}>{D.education[1].school}</span>
                </div>
                <div style={{marginTop: 8, color: "var(--fg-mute)", fontSize: 14}}>{D.education[1].result}</div>
              </div>
            </div>
          </div>
          <div className="exp-item reveal">
            <div className="when">Certifications</div>
            <div className="role">Cloud<span className="co">& Networking</span></div>
            <div className="desc">
              <ul style={{listStyle: "none"}}>
                {D.certs.map((c, i) => (
                  <li key={i} style={{padding: "8px 0", borderTop: i ? "1px solid var(--line)" : "none"}}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AIPractice() {
  const D = window.PORTFOLIO_DATA;
  const a = D.aiPractice;
  if (!a) return null;
  return (
    <section id="ai">
      <div className="container">
        <div className="section-head reveal">
          <div className="num">04 / {a.eyebrow}</div>
          <h2>I ship faster,<br/>and better, with <em>AI</em><br/>in the loop.</h2>
        </div>
        <div className="ai-block reveal">
          <p className="ai-intro">{a.intro}</p>

          <div className="ai-pillars">
            {a.pillars.map((p, i) => (
              <div className="ai-pillar" key={i}>
                <span className="ai-pillar-n">{p.n}</span>
                <h4>{p.title}</h4>
                <p>{p.body}</p>
              </div>
            ))}
          </div>

          <div className="ai-workflow">
            <div className="ai-workflow-label">- Workflow</div>
            <div className="ai-workflow-grid">
              {a.workflow.map((w, i) => (
                <div className="ai-flow-step" key={i}>
                  <div className="ai-flow-num">0{i + 1}</div>
                  <div className="ai-flow-k">{w.k}</div>
                  <div className="ai-flow-v">{w.v}</div>
                  {i < a.workflow.length - 1 && <div className="ai-flow-arrow">→</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProjectIndex() {
  const D = window.PORTFOLIO_DATA;
  const previewRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(-1);
  useEffect(() => {
    const onMove = (e) => {
      if (!previewRef.current) return;
      previewRef.current.style.left = e.clientX + "px";
      previewRef.current.style.top = e.clientY + "px";
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section id="work">
      <div className="container">
        <div className="section-head reveal">
          <div className="num">05 / Selected work</div>
          <h2>Seven things<br/>I'm <em>proud</em> of.</h2>
        </div>
        <div className="projects-index">
          {D.projects.map((p, i) => (
            <a
              className="project-row"
              key={p.slug}
              href={`projects/${p.slug}.html`}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseLeave={() => setActiveIdx(-1)}
            >
              <span className="num">{p.n}</span>
              <span className="year">{p.year}</span>
              <span className="title">{p.title} <span style={{color:"var(--fg-mute)", fontSize:"0.5em", fontStyle:"normal", marginLeft: 16, letterSpacing: "0.02em"}}>- {p.subtitle}</span></span>
              <span className="meta">{p.kind}</span>
              <span className="arrow">↗</span>
            </a>
          ))}
        </div>

        <div ref={previewRef} className={`preview-thumb ${activeIdx >= 0 ? "show" : ""}`}>
          {activeIdx >= 0 && <ProjectThumb project={D.projects[activeIdx]} />}
        </div>
      </div>
    </section>
  );
}

function ProjectThumb({ project }) {
  // Create a small abstract preview based on slug, colored bands + monospace label
  const hueByIdx = {
    "01": 145, "02": 28, "03": 210, "04": 280, "05": 180, "06": 340, "07": 60
  };
  const hue = hueByIdx[project.n] ?? 145;
  return (
    <div className="thumb-inner" style={{
      background: `linear-gradient(135deg, oklch(0.18 0.03 ${hue}) 0%, oklch(0.12 0.02 ${hue}) 100%)`,
      padding: 20,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}>
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `repeating-linear-gradient(-45deg, transparent 0, transparent 18px, oklch(0.78 0.13 ${hue} / 0.06) 18px, oklch(0.78 0.13 ${hue} / 0.06) 19px)`,
      }} />
      <div style={{position: "relative", display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)"}}>
        <span>{project.n}</span>
        <span>{project.year}</span>
      </div>
      <div style={{position: "relative"}}>
        <div style={{fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 300, fontSize: 36, lineHeight: 1, letterSpacing: "-0.02em", color: `oklch(0.85 0.13 ${hue})`, fontVariationSettings: '"SOFT" 100, "opsz" 144'}}>{project.title}</div>
        <div style={{fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginTop: 8}}>{project.kind}</div>
      </div>
    </div>
  );
}

function Footer() {
  const D = window.PORTFOLIO_DATA;
  return (
    <footer id="contact" className="footer">
      <div className="container">
        <div className="reveal">
          <div className="eyebrow" style={{marginBottom: 32}}>- Available for work · Q2 2026</div>
          <div className="big">
            <span>Let's <em>talk</em>.</span>
            <a href={`mailto:${D.person.email}`}>↗ {D.person.email}</a>
          </div>
        </div>
        <div className="footer-actions reveal">
          <a className="btn-primary" href={D.person.cvUrl} download="David-Onasanya-CV.pdf" data-magnetic>
            <span>Download CV (PDF)</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M7 2v8M3.5 6.5L7 10l3.5-3.5M2.5 12h9"/></svg>
          </a>
          <a className="btn-ghost" href={D.person.github} target="_blank" rel="noopener noreferrer" data-magnetic>GitHub <span>↗</span></a>
          <a className="btn-ghost" href={D.person.linkedin} target="_blank" rel="noopener noreferrer" data-magnetic>LinkedIn <span>↗</span></a>
        </div>
        <div className="foot-row">
          <span>© {new Date().getFullYear()} David Onasanya. Hand-built in Stafford.</span>
          <span>{D.person.phone}</span>
          <a href={`mailto:${D.person.email}`}>{D.person.email}</a>
          <span>v6.0</span>
        </div>
      </div>
    </footer>
  );
}

function App() {
  const D = window.PORTFOLIO_DATA;
  const settings = (D && D.settings) || {};
  const vis = settings.visibility || {};
  const introEnabled = settings.intro !== false; // default on

  const [theme, setTheme] = useTheme();
  const [introDone, setIntroDone] = useState(() => !introEnabled || sessionStorage.getItem("introSeen") === "1");

  useEffect(() => {
    if (introDone) sessionStorage.setItem("introSeen", "1");
  }, [introDone]);

  useReveal([introDone]);

  const show = (key, dflt = true) => (vis[key] === undefined ? dflt : !!vis[key]);

  return (
    <>
      <CustomCursor />
      <PortfolioEnhancements />
      <div className="grain" />
      {introEnabled && !introDone && <Intro onDone={() => setIntroDone(true)} />}
      <div className={`app-enter ${introDone ? "in" : ""}`}>
        <Nav theme={theme} setTheme={setTheme} />
        <main>
          <Hero />
          {show("about") && <About />}
          {show("skills") && <Skills />}
          {show("experience") && <Experience />}
          {show("aiPractice") && <AIPractice />}
          {show("projects") && <ProjectIndex />}
        </main>
        <Footer />
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
