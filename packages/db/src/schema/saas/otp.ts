import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
} from "drizzle-orm/pg-core"
import { isNormalized, pk, timestamps, timestamptz } from "./_helpers.js"

export const otpTypeEnum = pgEnum("otp_type", [
  "SIGN_UP",
  "LOGIN",
  "FORGET_PASSWORD",
])
export type OtpType = (typeof otpTypeEnum.enumValues)[number]

/** OTPS: one-time codes for sign-up / login / password reset. Only an HMAC is stored. */
export const otps = pgTable(
  "otps",
  {
    id: pk(),
    type: otpTypeEnum("type").notNull(),
    // Not a foreign key because SIGN_UP can happen before the user/identifier exists.
    identifier: text("identifier").notNull(),
    // HMAC of the OTP using a server-side secret.
    otpHash: text("otp_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamptz("expires_at").notNull(),
    consumedAt: timestamptz("consumed_at"),
    ...timestamps(),
  },
  (t) => [
    index("otps_identifier_type_created_at_idx").on(
      t.identifier,
      t.type,
      t.createdAt
    ),
    index("otps_expires_at_idx").on(t.expiresAt),
    check("otps_identifier_normalized_chk", isNormalized(t.identifier)),
    check("otps_attempts_non_negative_chk", sql`${t.attempts} >= 0`),
  ]
)

export type Otp = typeof otps.$inferSelect
export type NewOtp = typeof otps.$inferInsert
