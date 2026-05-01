export default function HomePage() {
  return (
    <main
      className="min-h-screen px-md py-3xl mx-auto"
      style={{ maxWidth: 'var(--max-width-content)' }}
    >
      <p className="text-fg-muted tracking-eyebrow text-xs uppercase">Portfolio</p>
      <h1 className="font-serif tracking-display leading-tight mt-md text-5xl md:text-6xl">
        David <em className="text-accent">Onasanya</em>
      </h1>
      <p className="text-fg-secondary text-lg leading-relaxed mt-lg max-w-prose">
        Portfolio scaffold. Under construction.
      </p>
      <p className="text-fg-muted text-sm font-mono mt-2xl">
        theme: dark, fonts: Fraunces, Geist, JetBrains Mono
      </p>
    </main>
  );
}
