import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

/**
 * Lazy Drizzle / Neon HTTP client.
 *
 * Why lazy: importing this module from a unit test (or from Next during
 * static prerender) must not trigger a database connection or even a
 * `DATABASE_URL` env-var assertion. The Auth.js Drizzle adapter is wired in
 * `lib/auth.ts` which itself is referenced from middleware, route handlers,
 * and admin pages. Eager construction would mean every test that even
 * transitively imports `lib/auth.ts` would crash without `DATABASE_URL`.
 *
 * The first call site that actually needs the database (a route handler at
 * request time, or `pnpm drizzle-kit migrate`) gets the connection; before
 * then, the module is inert.
 */

let _db: NeonHttpDatabase<typeof schema> | null = null;

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not configured');
  }
  _db = drizzle(neon(url), { schema });
  return _db;
}

export type Db = ReturnType<typeof getDb>;
