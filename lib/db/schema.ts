import { boolean, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import type { AdapterAccountType } from 'next-auth/adapters';

/*
 * Drizzle schema for Auth.js v5.
 *
 * Mirrors the canonical Postgres table shape published at
 * https://authjs.dev/getting-started/adapters/drizzle (May 2026 revision).
 * The adapter expects column names verbatim, including the camelCase ones
 * that look out of place next to standard Postgres conventions; we keep the
 * runtime column names as authored upstream so the adapter joins work, and
 * lean on `text(...)` rather than `varchar(...)` because Postgres treats them
 * identically and Drizzle migrations stay legible.
 *
 * For the magic-link-only flow (one OAuth-less user), the `accounts` and
 * `authenticators` tables are unused at runtime. They still exist because
 * the adapter inspects the schema shape at construction time. Empty tables
 * cost nothing and keep the schema future-proof if a second auth method is
 * ever added.
 *
 * The user `id` defaults to a v4 UUID generated at insert time so the column
 * stays opaque (no incrementing integer for an attacker to enumerate).
 */

export const users = pgTable('user', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => globalThis.crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
});

export const accounts = pgTable(
  'account',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccountType>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (account) => [primaryKey({ columns: [account.provider, account.providerAccountId] })],
);

export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable(
  'verificationToken',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

export const authenticators = pgTable(
  'authenticator',
  {
    credentialID: text('credentialID').notNull().unique(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    providerAccountId: text('providerAccountId').notNull(),
    credentialPublicKey: text('credentialPublicKey').notNull(),
    counter: integer('counter').notNull(),
    credentialDeviceType: text('credentialDeviceType').notNull(),
    credentialBackedUp: boolean('credentialBackedUp').notNull(),
    transports: text('transports'),
  },
  (authenticator) => [primaryKey({ columns: [authenticator.userId, authenticator.credentialID] })],
);
