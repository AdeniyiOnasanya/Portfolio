import Link from 'next/link';

export default function ProjectNotFound() {
  return (
    <section aria-labelledby="not-found-heading" className="pt-3xl pb-2xl">
      <p className="text-fg-muted tracking-eyebrow text-xs uppercase">404</p>
      <h1
        id="not-found-heading"
        className="font-serif tracking-display leading-tight mt-md text-5xl md:text-6xl"
      >
        Project not found
      </h1>
      <p className="text-fg-secondary text-lg leading-relaxed mt-lg max-w-prose">
        That slug is not in the work index. The list on the home page has every project that
        currently has a case study.
      </p>
      <p className="mt-xl">
        <Link
          href="/"
          className="text-fg-primary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-sm"
        >
          Back to selected work
        </Link>
      </p>
    </section>
  );
}
