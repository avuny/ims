import { sql, type SQL } from "drizzle-orm"
import {
  bigint,
  char,
  timestamp,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core"

/**
 * SHARED COLUMNS & UTILS: the ONLY cross-cutting file of the schema.
 * Enums and jsonb types are NOT here; each lives in the table file that owns it.
 */

/* ---------- primary key ---------- */

// Swap defaultRandom() for an app-side UUIDv7 ($defaultFn) for better index locality.
export const pk = () => uuid("id").primaryKey().defaultRandom()

/* ---------- timestamps ---------- */

export const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true })

export const createdAt = () => timestamptz("created_at").notNull().defaultNow()

// $onUpdate is app-side only: raw SQL updates will not bump it (add a trigger if that matters).
export const updatedAt = () =>
  timestamptz("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())

/** Spread into a table: `...timestamps()` */
export const timestamps = () => ({
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

/** Spread into a table: `...softDelete()` (nullable `deleted_at`). */
export const softDelete = () => ({ deletedAt: timestamptz("deleted_at") })

/* ---------- money ---------- */

// Money = integer minor units (bigint) + ISO-4217 currency. Never float/numeric.
export const money = (name: string) => bigint(name, { mode: "number" }).notNull()
export const currency = () => char("currency", { length: 3 }).notNull()

/* ---------- check-constraint helpers ---------- */

/** Value is already trimmed + lowercase and not empty. */
export const isNormalized = (col: AnyPgColumn): SQL =>
  sql`${col} = lower(btrim(${col})) AND ${col} <> ''`

/** `col ~ 'pattern'` with the pattern inlined (check constraints cannot use bind params). */
export const matchesRegex = (col: AnyPgColumn, pattern: string): SQL =>
  sql`${col} ~ ${sql.raw(`'${pattern}'`)}`

/** Per-organization sign-in handle: lowercase, 3-31 chars, no ':' or '@'. */
export const USERNAME_PATTERN = "^[a-z0-9][a-z0-9._-]{2,30}$"
export const isUsername = (col: AnyPgColumn): SQL =>
  matchesRegex(col, USERNAME_PATTERN)
