import { relations, sql } from "drizzle-orm"
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

import {
  authProviderTypeEnum,
  identifierTypeEnum,
  isNormalized,
  pk,
  timestamptz,
  timestamps,
} from "./shared.js"
import { refreshTokens } from "./refresh-token.js"

export const users = pgTable("users", {
  id: pk(),
  name: text("name").notNull(),
  passwordHash: text("password_hash"),
  avatarUrl: text("avatar_url"),
  contactEmail: text("contact_email"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps(),
})

export const userIdentifiers = pgTable(
  "user_identifiers",
  {
    id: pk(),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    identifier: text("identifier").notNull(),

    identifierType: identifierTypeEnum("identifier_type").notNull(),

    isVerified: boolean("is_verified").notNull().default(false),

    verifiedAt: timestamptz("verified_at"),

    lastLoginAt: timestamptz("last_login_at"),

    ...timestamps(),
  },
  (t) => [
    uniqueIndex("user_identifiers_identifier_uidx").on(t.identifier),

    index("user_identifiers_user_id_type_idx").on(t.userId, t.identifierType),

    check(
      "user_identifiers_identifier_normalized_chk",
      isNormalized(t.identifier)
    ),

    check(
      "user_identifiers_verified_consistent_chk",
      sql`${t.isVerified} = (${t.verifiedAt} IS NOT NULL)`
    ),
  ]
)

export const userProviders = pgTable(
  "user_providers",
  {
    id: pk(),

    identifierId: uuid("identifier_id")
      .notNull()
      .references(() => userIdentifiers.id, {
        onDelete: "cascade",
      }),

    provider: authProviderTypeEnum("provider").notNull(),

    providerId: text("provider_id").notNull(),

    ...timestamps(),
  },
  (t) => [
    uniqueIndex("user_providers_provider_provider_id_uidx").on(
      t.provider,
      t.providerId
    ),

    index("user_providers_identifier_id_idx").on(t.identifierId),
  ]
)

// --- Relations ---------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  identifiers: many(userIdentifiers),
  refreshTokens: many(refreshTokens),
}))

export const userIdentifiersRelations = relations(
  userIdentifiers,
  ({ one, many }) => ({
    user: one(users, {
      fields: [userIdentifiers.userId],
      references: [users.id],
    }),

    providers: many(userProviders),
  })
)

export const userProvidersRelations = relations(userProviders, ({ one }) => ({
  identifier: one(userIdentifiers, {
    fields: [userProviders.identifierId],
    references: [userIdentifiers.id],
  }),
}))

// --- Types -------------------------------------------------------------------

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type UserIdentifier = typeof userIdentifiers.$inferSelect
export type NewUserIdentifier = typeof userIdentifiers.$inferInsert

export type UserProvider = typeof userProviders.$inferSelect
export type NewUserProvider = typeof userProviders.$inferInsert
