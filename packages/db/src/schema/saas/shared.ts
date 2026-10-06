import { sql } from "drizzle-orm"
import { type AnyPgColumn, pgEnum, timestamp, uuid } from "drizzle-orm/pg-core"

// --- Enums -------------------------------------------------------------------

export const authProviderTypeEnum = pgEnum("auth_provider_type", [
  "GOOGLE",
  "FACEBOOK",
])

export const identifierTypeEnum = pgEnum("identifier_type", [
  "EMAIL",
  "PHONE",
  "USERNAME",
])

export const otpTypeEnum = pgEnum("otp_type", [
  "SIGN_UP",
  "LOGIN",
  "FORGET_PASSWORD",
])

export type AuthProviderType = (typeof authProviderTypeEnum.enumValues)[number]
export type IdentifierType = (typeof identifierTypeEnum.enumValues)[number]
export type OtpType = (typeof otpTypeEnum.enumValues)[number]

// --- Shared helpers ----------------------------------------------------------

export const pk = () => uuid("id").primaryKey().defaultRandom()

export const timestamptz = (name: string) =>
  timestamp(name, { withTimezone: true })

export const timestamps = () => ({
  createdAt: timestamptz("created_at").notNull().defaultNow(),
  updatedAt: timestamptz("updated_at")
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export const isNormalized = (col: AnyPgColumn) =>
  sql`${col} = lower(btrim(${col})) AND ${col} <> ''`
