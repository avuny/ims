import { sql } from "drizzle-orm"
import { check, index, integer, pgTable, text } from "drizzle-orm/pg-core"

import {
  isNormalized,
  otpTypeEnum,
  pk,
  timestamptz,
  timestamps,
} from "./shared.js"

export const otps = pgTable(
  "otps",
  {
    id: pk(),

    type: otpTypeEnum("type").notNull(),

    // Not a foreign key because SIGN_UP can happen before
    // the user/identifier exists.
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

// --- Types -------------------------------------------------------------------

export type Otp = typeof otps.$inferSelect
export type NewOtp = typeof otps.$inferInsert
