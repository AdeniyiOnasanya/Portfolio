import { type NeonQueryFunction, neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// The Drizzle client is constructed eagerly so `is(db, PgDatabase)` succeeds
// in `@auth/drizzle-adapter`'s dialect detection (it uses an instanceof-style
// brand check that doesn't traverse Proxies). The underlying neon HTTP client
// is the lazy boundary: it resolves `DATABASE_URL` only when a query actually
// runs, so build-time page-data collection in Next can load route modules
// without the env var present in CI.
function makeLazyNeon(): NeonQueryFunction<false, false> {
  let real: NeonQueryFunction<false, false> | null = null;
  function resolve(): NeonQueryFunction<false, false> {
    if (real) return real;
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not configured');
    }
    real = neon(url);
    return real;
  }
  const fn = ((strings: TemplateStringsArray, ...params: unknown[]) =>
    // biome-ignore lint/suspicious/noExplicitAny: forwarding tagged-template args
    resolve()(strings, ...(params as any[]))) as NeonQueryFunction<false, false>;
  fn.query = ((sql: string, params?: unknown[], opts?: unknown) =>
    // biome-ignore lint/suspicious/noExplicitAny: forwarding driver method shapes
    (resolve().query as any)(sql, params, opts)) as NeonQueryFunction<false, false>['query'];
  fn.unsafe = ((raw: string) => resolve().unsafe(raw)) as NeonQueryFunction<false, false>['unsafe'];
  fn.transaction = ((queries: unknown, opts?: unknown) =>
    // biome-ignore lint/suspicious/noExplicitAny: forwarding driver method shapes
    (resolve().transaction as any)(queries, opts)) as NeonQueryFunction<
    false,
    false
  >['transaction'];
  return fn;
}

const _db: NeonHttpDatabase<typeof schema> = drizzle(makeLazyNeon(), { schema });

export const db = _db;
export function getDb(): NeonHttpDatabase<typeof schema> {
  return _db;
}

export type Db = NeonHttpDatabase<typeof schema>;
