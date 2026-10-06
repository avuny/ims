import { sql } from "drizzle-orm"
import {
  boolean,
  char,
  check,
  index,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core"
import { pk, timestamps, ts } from "./_helpers.js"
import { orgMemberTypeEnum, orgStatusEnum } from "./enums.js"
import { users } from "./users.js"

/**
 * ORGANIZATIONS: the tenant. Every business row (subscriptions, invoices, payments,
 * roles, ...) hangs off an organization through `org_id`.
 *
 * Real-world flow:
 *  1. A person signs up: in ONE transaction create the user, the organization, and the
 *     `organization_users` row with type 'owner' (no circular FK, the owner is a membership).
 *  2. `code` is the public sign-in code ("acme-co"). It is lowercase and immutable, and it
 *     stays reserved after a soft delete.
 *  3. `status`: 'suspended' (e.g. unpaid, or by platform admin) makes the app read-only or
 *     blocks sign-in; 'closed' is the end state. Rows are never hard-deleted because
 *     financial history must survive. Use `deleted_at` for soft delete.
 *  4. `default_currency` seeds the billing account currency; `timezone` drives billing dates.
 */
export const organizations = pgTable(
  "organizations",
  {
    id: pk(),
    code: text("code").notNull(), // login code, lowercase, immutable (trigger)
    name: text("name").notNull(),
    status: orgStatusEnum("status").notNull().default("active"),
    country: char("country", { length: 2 }),
    defaultCurrency: char("default_currency", { length: 3 }).notNull(),
    timezone: text("timezone").notNull().default("UTC"),
    ...timestamps(),
    deletedAt: ts("deleted_at"), // soft delete; code stays reserved
  },
  (t) => [
    uniqueIndex("ux_org_code").on(t.code),
    check("ck_org_code_format", sql`${t.code} ~ '^[a-z0-9][a-z0-9-]{2,30}$'`),
  ]
)

/** FK helper: `org_id` -> organizations.id. RESTRICT because financial rows are never hard-deleted. */
export const orgRef = (onDelete: "restrict" | "cascade" = "restrict") =>
  uuid("org_id")
    .notNull()
    .references((): AnyPgColumn => organizations.id, { onDelete })

/**
 * ORGANIZATION_USERS: membership = "this user belongs to this organization as X".
 *
 * Types:
 *  - owner:   created at sign-up, exactly one per organization. Implicit full access,
 *             owns billing. Ownership transfer = update this row's type in a transaction.
 *  - managed: staff created/invited by the owner (accountant, cashier, warehouse clerk).
 *             Can do only what their roles allow (see `organization_user_roles`).
 *             Counts toward the plan's `managedUsers` limit.
 *  - portal:  external customer/supplier with limited self-service access. Has no roles;
 *             what they see is scoped by the records linked to them. Counts toward
 *             `portalUsers`.
 *
 * Real-world flow:
 *  - Invite/create: owner picks a username (per-organization sign-in handle) and a type;
 *    the user row is created or reused, then this row is inserted.
 *  - Sign-in: org code -> organization, username -> this row -> user -> verify password.
 *    The session should carry `organization_users.id`, so one person with several
 *    memberships has a separate session context in each organization.
 *  - Offboarding: set `is_active = false` (history and audit stay intact), never delete.
 */
export const organizationUsers = pgTable(
  "organization_users",
  {
    id: pk(),
    orgId: orgRef(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    type: orgMemberTypeEnum("type").notNull(), // immutable (trigger); use ownership transfer flow
    username: text("username").notNull(), // lowercase sign-in handle, unique inside the org
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("ux_org_user_member").on(t.orgId, t.userId), // one membership per person per org
    uniqueIndex("ux_org_user_username").on(t.orgId, t.username),
    uniqueIndex("ux_org_one_owner")
      .on(t.orgId)
      .where(sql`${t.type} = 'owner'`),
    unique("uq_org_users_org_id").on(t.orgId, t.id), // target of composite FKs (same-org guarantee)
    index("ix_org_user_user").on(t.userId), // "which organizations am I in?"
    check(
      "ck_org_user_username_format",
      sql`${t.username} ~ '^[a-z0-9][a-z0-9._-]{2,30}$'`
    ),
  ]
)

export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert
export type OrganizationUser = typeof organizationUsers.$inferSelect
export type NewOrganizationUser = typeof organizationUsers.$inferInsert
