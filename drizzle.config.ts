import type { Config } from 'drizzle-kit';

/**
 * Drizzle Kit configuration.
 *
 * Used only by `pnpm drizzle-kit generate` and `pnpm drizzle-kit migrate`.
 * The CLI reads `DATABASE_URL` from the environment at command time, so a
 * developer running migrations needs `.env.local` populated. The committed
 * config never reaches into the runtime app: route handlers and middleware
 * use the lazy client in `lib/db/index.ts` instead.
 */
export default {
  schema: './lib/db/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
} satisfies Config;
