import {
  index,
  inet,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { pk, timestamps, timestamptz } from "./_helpers.js"
import { users } from "./users.js"

/** REFRESH_TOKENS: rotating refresh tokens; only the hash is stored. (Relations: ./relations.ts) */
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: pk(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    // Shared by all tokens in one rotation chain (reuse of a revoked token revokes the family).
    familyId: uuid("family_id").notNull().defaultRandom(),
    userAgent: text("user_agent"),
    ipAddress: inet("ip_address"),
    expiresAt: timestamptz("expires_at").notNull(),
    revokedAt: timestamptz("revoked_at"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("refresh_tokens_token_hash_uidx").on(t.tokenHash),
    index("refresh_tokens_user_id_idx").on(t.userId),
    index("refresh_tokens_family_id_idx").on(t.familyId),
    index("refresh_tokens_expires_at_idx").on(t.expiresAt),
  ]
)

export type RefreshToken = typeof refreshTokens.$inferSelect
export type NewRefreshToken = typeof refreshTokens.$inferInsert
