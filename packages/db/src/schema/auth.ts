import { pgTable, uuid, varchar, text, boolean, integer, timestamp, inet, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { oauthProviderEnum, authChallengePurposeEnum, authChallengeChannelEnum } from "./enums";

export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    provider: oauthProviderEnum("provider").notNull(),
    providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
    providerEmail: varchar("provider_email", { length: 320 }),
    providerEmailVerified: boolean("provider_email_verified"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("oauth_provider_account_uq").on(table.provider, table.providerAccountId),
    index("oauth_accounts_user_id_idx").on(table.userId),
  ]
);

export const authChallenges = pgTable(
  "auth_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    purpose: authChallengePurposeEnum("purpose").notNull(),
    channel: authChallengeChannelEnum("channel"),
    identifier: varchar("identifier", { length: 320 }),
    secretHash: text("secret_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("auth_challenges_user_id_idx").on(table.userId),
    index("auth_challenges_identifier_idx").on(table.identifier),
    index("auth_challenges_expires_at_idx").on(table.expiresAt),
    index("auth_challenges_purpose_idx").on(table.purpose),
  ]
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    refreshTokenHash: text("refresh_token_hash").notNull(),
    tokenFamilyId: uuid("token_family_id").notNull(),
    replacedBySessionId: uuid("replaced_by_session_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokeReason: varchar("revoke_reason", { length: 100 }),
    userAgent: text("user_agent"),
    ipAddress: inet("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("auth_sessions_refresh_token_hash_uq").on(table.refreshTokenHash),
    index("auth_sessions_user_id_idx").on(table.userId),
    index("auth_sessions_token_family_idx").on(table.tokenFamilyId),
    index("auth_sessions_expires_at_idx").on(table.expiresAt),
    index("auth_sessions_revoked_at_idx").on(table.revokedAt),
  ]
);
