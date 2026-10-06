import {
  boolean,
  check,
  index,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { pk, timestamps, ts } from "./_helpers.js"
import {
  identifierTypeEnum,
  timestamptz,
  isNormalized,
  authProviderTypeEnum,
} from "./shared.js"
import { organizationUsers } from "./organizations.js"

/**
 * USERS: a global person/identity. It does NOT belong to an organization.
 *
 * Real-world flow:
 *  - A person is created once: owner signing up, an owner/admin inviting a staff member,
 *    or an organization creating a portal account for a customer/supplier.
 *  - What the person may do, and in which organization, is decided by `organization_users`
 *    (membership) and the roles attached to it, never by this table.
 *  - The same person can belong to several organizations (e.g. an accountant serving many
 *    clients) with one password and several memberships.
 *  - Sign-in is `org code + username` (the username lives on the membership), then the
 *    password is verified here. `contact_email` is for notifications and recovery only,
 *    so it is NOT unique (a shared mailbox is allowed).
 *  - Users are soft-deleted (`deleted_at`) because invoices, payments and audit rows
 *    point at them. Use `is_active = false` to block sign-in without deleting.
 *  - `password_hash` is nullable: passwordless portal users, SSO, or "invited, not yet set".
 *  - `is_platform_admin` marks YOUR staff (support/finance) who suspend orgs or record
 *    manual payments. They usually have no membership in customer organizations.
 */
export const users = pgTable(
  "users",
  {
    id: pk(),
    name: text("name").notNull(),
    passwordHash: text("password_hash"),
    avatarUrl: text("avatar_url"),
    contactEmail: text("contact_email"),
    isActive: boolean("is_active").notNull().default(true),
    isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
    lastLoginAt: ts("last_login_at"),
    deletedAt: ts("deleted_at"),
    ...timestamps(),
  },
  (t) => [
    // Case-insensitive lookup for "forgot password" / support search.
    index("ix_users_contact_email").on(sql`lower(${t.contactEmail})`),
  ]
)

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

    isPrimary: boolean("is_primary").notNull().default(false),

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

// --- Types -------------------------------------------------------------------

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type UserIdentifier = typeof userIdentifiers.$inferSelect
export type NewUserIdentifier = typeof userIdentifiers.$inferInsert

export type UserProvider = typeof userProviders.$inferSelect
export type NewUserProvider = typeof userProviders.$inferInsert
