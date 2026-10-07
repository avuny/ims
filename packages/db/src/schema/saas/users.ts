import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { isNormalized, pk, softDelete, timestamps, timestamptz } from "./_helpers.js"

/* ---------- enums (owned by this file) ---------- */

export const authProviderTypeEnum = pgEnum("auth_provider_type", [
  "GOOGLE",
  "FACEBOOK",
])
export const identifierTypeEnum = pgEnum("identifier_type", [
  "EMAIL",
  "PHONE",
  "USERNAME",
])

export type AuthProviderType = (typeof authProviderTypeEnum.enumValues)[number]
export type IdentifierType = (typeof identifierTypeEnum.enumValues)[number]

/**
 * USERS: a global person/identity. It does NOT belong to an organization, and sign-up
 * does NOT create one.
 *
 * Real-world flow:
 *  - Sign-up creates ONLY the user (+ a verified `user_identifiers` row). The person is
 *    sent to the dashboard; if `listMyOrganizations()` (./memberships.ts) is empty the
 *    dashboard shows the "Create your organization" onboarding step (./onboarding.ts).
 *  - A user can also arrive through an invitation (managed / portal member) or because an
 *    organization created an account for them. Then they already have memberships.
 *  - What the person may do, and in which organization, is decided by `organization_users`
 *    (membership) and the roles attached to it, never by this table.
 *  - The same person can own several organizations, and also be managed/portal in others
 *    (the organization switcher lists all of them).
 *  - `contact_email` is for notifications and recovery only, so it is NOT unique.
 *  - Soft-deleted (`deleted_at`) because invoices, payments and audit rows point at them.
 *    `is_active = false` blocks sign-in without deleting.
 *  - `password_hash` is nullable: passwordless portal users, SSO, or "invited, not yet set".
 *  - `is_platform_admin` marks YOUR staff (support/finance); they usually have no memberships.
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
    lastLoginAt: timestamptz("last_login_at"),
    ...softDelete(),
    ...timestamps(),
  },
  (t) => [
    // Case-insensitive lookup for "forgot password" / support search.
    index("ix_users_contact_email").on(sql`lower(${t.contactEmail})`),
  ]
)

/**
 * USER_IDENTIFIERS: global ways to sign in (email, phone, username). Normalized
 * (lowercase, trimmed) and unique across the platform. The per-organization username used
 * for subdomain sign-in lives on `organization_users`, not here.
 */
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

/** USER_PROVIDERS: social logins (Google, Facebook) linked to an identifier. */
export const userProviders = pgTable(
  "user_providers",
  {
    id: pk(),
    identifierId: uuid("identifier_id")
      .notNull()
      .references(() => userIdentifiers.id, { onDelete: "cascade" }),
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

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type UserIdentifier = typeof userIdentifiers.$inferSelect
export type NewUserIdentifier = typeof userIdentifiers.$inferInsert
export type UserProvider = typeof userProviders.$inferSelect
export type NewUserProvider = typeof userProviders.$inferInsert
