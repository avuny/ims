import { sql } from "drizzle-orm"
import {
  char,
  check,
  doublePrecision,
  foreignKey,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { pk } from "./_helpers.js"

/**
 * GEO REFERENCE DATA: read-only lookup tables seeded from the dr5hn
 * countries-states-cities dataset (see seed-geo.ts). Nothing here is edited by users.
 *
 * Design:
 *  - Tables that have a real-world code use it as the PRIMARY KEY (ISO 3166-1 alpha-2
 *    for countries, ISO 4217 for currencies, IANA name for time zones). The seed needs
 *    no id maps, and `organizations` can reference them with the char(2) / char(3) /
 *    text columns it already has.
 *  - Only states and cities use a surrogate uuid (no stable public code).
 *  - Region / subregion are plain text columns on `countries`: they are display grouping
 *    only, nothing references them.
 *  - Phone code is a column on `countries` (one value per country, not a shared entity).
 *  - Translations are a jsonb map `{ "ar": "...", "fr": "..." }` on the row itself, read
 *    with `coalesce(translations ->> locale, name)`.
 */

/** CURRENCIES: ISO 4217. `organizations.default_currency` references `code`. */
export const currencies = pgTable(
  "currencies",
  {
    code: char("code", { length: 3 }).primaryKey(), // "EGP"
    name: text("name").notNull(),
    symbol: text("symbol"),
  },
  (t) => [check("ck_currency_code", sql`${t.code} ~ '^[A-Z]{3}$'`)]
)

/** TIMEZONES: IANA names ("Africa/Cairo", plus "UTC"). `organizations.timezone` references `name`. */
export const timezones = pgTable("timezones", {
  name: text("name").primaryKey(),
})

/** COUNTRIES: ISO 3166-1. */
export const countries = pgTable(
  "countries",
  {
    code: char("code", { length: 2 }).primaryKey(), // "EG"
    iso3: char("iso3", { length: 3 }),
    numericCode: char("numeric_code", { length: 3 }),
    name: text("name").notNull(),
    native: text("native"),
    translations: jsonb("translations")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    capital: text("capital"),
    tld: text("tld"),
    phoneCode: text("phone_code"), // dial prefix as in the dataset, without "+"
    currencyCode: char("currency_code", { length: 3 }).references(
      () => currencies.code
    ),
    region: text("region"),
    subregion: text("subregion"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    emoji: text("emoji"),
    wikiDataId: text("wiki_data_id"),
  },
  (t) => [check("ck_country_code", sql`${t.code} ~ '^[A-Z]{2}$'`)]
)

/**
 * COUNTRY_TIMEZONES: which zones a country uses (many-to-many). Used to suggest a
 * timezone once the country is picked.
 */
export const countryTimezones = pgTable(
  "country_timezones",
  {
    countryCode: char("country_code", { length: 2 })
      .notNull()
      .references(() => countries.code, { onDelete: "cascade" }),
    timezoneName: text("timezone_name")
      .notNull()
      .references(() => timezones.name, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.countryCode, t.timezoneName] }),
    index("ix_country_tz_zone").on(t.timezoneName),
  ]
)

/**
 * STATES: first-level subdivisions (governorates, provinces, states).
 * `code` is the dataset's subdivision code and is not always present or unique, so the
 * natural key is (country_code, name).
 */
export const states = pgTable(
  "states",
  {
    id: pk(),
    countryCode: char("country_code", { length: 2 })
      .notNull()
      .references(() => countries.code, { onDelete: "cascade" }),
    name: text("name").notNull(),
    native: text("native"),
    translations: jsonb("translations")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    code: text("code"),
    fipsCode: text("fips_code"),
    type: text("type"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    wikiDataId: text("wiki_data_id"),
  },
  (t) => [
    uniqueIndex("ux_state_country_name").on(t.countryCode, t.name),
    unique("uq_state_country_id").on(t.countryCode, t.id), // target of composite FKs (same-country guarantee)
    index("ix_state_country").on(t.countryCode),
  ]
)

/**
 * CITIES: optional (about 150k rows), not seeded unless SEED_CITIES=1.
 * The composite FK guarantees the state belongs to the city's country.
 */
export const cities = pgTable(
  "cities",
  {
    id: pk(),
    countryCode: char("country_code", { length: 2 }).notNull(),
    stateId: uuid("state_id").notNull(),
    name: text("name").notNull(),
    native: text("native"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    wikiDataId: text("wiki_data_id"),
  },
  (t) => [
    foreignKey({
      name: "fk_city_state",
      columns: [t.countryCode, t.stateId],
      foreignColumns: [states.countryCode, states.id],
    }).onDelete("cascade"),
    uniqueIndex("ux_city_state_name").on(t.stateId, t.name),
    index("ix_city_country").on(t.countryCode),
  ]
)

export type Currency = typeof currencies.$inferSelect
export type Timezone = typeof timezones.$inferSelect
export type Country = typeof countries.$inferSelect
export type State = typeof states.$inferSelect
export type City = typeof cities.$inferSelect
