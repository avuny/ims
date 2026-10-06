import { bigint, char, timestamp, uuid } from 'drizzle-orm/pg-core';

// Swap defaultRandom() for an app-side UUIDv7 ($defaultFn) for better index locality.
export const pk = () => uuid('id').primaryKey().defaultRandom();

export const ts = (name: string) => timestamp(name, { withTimezone: true });
export const createdAt = () => ts('created_at').notNull().defaultNow();
// $onUpdate is app-side only: raw SQL updates will not bump it (add a trigger if that matters).
export const updatedAt = () => ts('updated_at').notNull().defaultNow().$onUpdate(() => new Date());

/** Spread into a table: `...timestamps()` */
export const timestamps = () => ({ createdAt: createdAt(), updatedAt: updatedAt() });

// Money = integer minor units (bigint) + ISO-4217 currency. Never float/numeric.
export const money = (name: string) => bigint(name, { mode: 'number' }).notNull();
export const currency = () => char('currency', { length: 3 }).notNull();

// NOTE: `orgRef()` lives in ./organizations.ts (it needs the organizations table).
