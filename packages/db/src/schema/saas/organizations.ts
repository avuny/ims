import { sql } from "drizzle-orm"
import {
  boolean,
  char,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core"
import { pk, timestamps, ts } from "./_helpers.js"
import {
  invitationChannelEnum,
  invitationStatusEnum,
  orgMemberTypeEnum,
  orgStatusEnum,
} from "./enums.js"
import { countries, currencies, states, timezones } from "./geo.js"
import { users } from "./users.js"

/**
 * ORGANIZATIONS: the tenant. Every business row (subscriptions, invoices, payments,
 * roles, ...) hangs off an organization through `org_id`.
 *
 * Real-world flow:
 *  1. A person signs up: in ONE transaction create the user, the organization, and the
 *     `organization_users` row with type 'owner' (no circular FK, the owner is a membership).
 *  2. `code` is the public org code AND the subdomain label ("acme" -> acme.yourapp.com).
 *     Lowercase, immutable, a valid DNS label (3-31 chars, no leading/trailing hyphen,
 *     no "--" which also blocks punycode "xn--"). Reserved codes (www, api, app, admin,
 *     mail, static, ...) are rejected in the service layer. Stays reserved after soft delete.
 *  3. `status`: 'suspended' (e.g. unpaid, or by platform admin) makes the app read-only or
 *     blocks sign-in; 'closed' is the end state. Rows are never hard-deleted because
 *     financial history must survive. Use `deleted_at` for soft delete.
 *  4. `default_currency` seeds the billing account currency; `timezone` drives billing dates.
 *  5. `country_code`, `state_id`, `default_currency` and `timezone` reference the geo
 *     tables (./geo.ts). Names are never copied here; join to get them in the user's locale.
 *
 * Sign-in: the subdomain resolves the organization, the form asks only for username +
 * password. On the root domain, normal users sign in with email, and org members may use
 * the fallback `orgcode:username`.
 */
export const organizations = pgTable(
  "organizations",
  {
    id: pk(),
    code: text("code").notNull(), // org code = subdomain, lowercase, immutable (trigger)
    name: text("name").notNull(),
    status: orgStatusEnum("status").notNull().default("active"),
    countryCode: char("country_code", { length: 2 }).references(
      () => countries.code
    ), // was `country`; make NOT NULL if billing/tax needs it
    stateId: uuid("state_id"), // optional; must belong to countryCode (composite FK below)
    defaultCurrency: char("default_currency", { length: 3 })
      .notNull()
      .references(() => currencies.code),
    timezone: text("timezone")
      .notNull()
      .default("UTC")
      .references(() => timezones.name),
    ...timestamps(),
    deletedAt: ts("deleted_at"), // soft delete; code stays reserved
  },
  (t) => [
    uniqueIndex("ux_org_code").on(t.code),
    check(
      "ck_org_code_format",
      sql`${t.code} ~ '^[a-z0-9][a-z0-9-]{1,29}[a-z0-9]$'`
    ),
    check("ck_org_code_no_double_hyphen", sql`position('--' in ${t.code}) = 0`),
    foreignKey({
      name: "fk_org_state",
      columns: [t.countryCode, t.stateId],
      foreignColumns: [states.countryCode, states.id],
    }), // the state must belong to the chosen country
    check(
      "ck_org_state_needs_country",
      sql`${t.stateId} is null or ${t.countryCode} is not null`
    ),
  ]
)

/** FK helper: `org_id` -> organizations.id. RESTRICT because financial rows are never hard-deleted. */
export const orgRef = (onDelete: "restrict" | "cascade" = "restrict") =>
  uuid("org_id")
    .notNull()
    .references((): AnyPgColumn => organizations.id, { onDelete })

/**
 * ORGANIZATION_USERS: membership = "this user belongs to this organization as X".
 * Only real, accepted members live here. Pending / declined / revoked people live in
 * `organization_invitations`.
 *
 * Types:
 *  - owner:   created at sign-up, exactly one per organization. Implicit full access,
 *             owns billing. Ownership transfer = update this row's type in a transaction
 *             (strict, audited process).
 *  - managed: staff either invited (existing user, or new user via email/WhatsApp) or
 *             created directly by the org with a username + password (the user row then
 *             has `managed_by_org_id` set). Can do only what their roles allow (see
 *             `organization_user_roles`). Counts toward the plan's `managedUsers` limit.
 *  - portal:  external customer/supplier with limited self-service access. Same two ways in
 *             (invite or created by the org). Has no roles; what they see is scoped by the
 *             records linked to them. Counts toward `portalUsers`.
 *
 * `username` is the per-organization sign-in handle. It cannot contain ':' or '@', so the
 * `orgcode:username` fallback is unambiguous and never looks like an email.
 *
 * Offboarding: set `is_active = false` (history and audit stay intact), never delete.
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

/**
 * ORGANIZATION_INVITATIONS: an offer to join an organization as 'managed' or 'portal'.
 * Owners are never invited. History is kept (declined / revoked / expired rows stay), so
 * the same person can be invited again later.
 *
 * Real-world flow:
 *  - Invite: a member with permission picks type + a target. The target is an email, a
 *    phone (WhatsApp, paid plans only, checked in the service), or an existing user.
 *    If the email/phone matches a VERIFIED existing user, set `invitee_user_id` and send
 *    an in-app notification plus email. Otherwise send a link carrying a one-time token;
 *    only `token_hash` is stored.
 *  - Accept (ONE transaction): create or reuse the user, re-check username uniqueness in
 *    the org (it may have been taken while the invite sat there), insert
 *    `organization_users`, set status 'accepted' + `accepted_org_user_id` + `responded_at`.
 *  - Sign-up auto-link: when someone verifies an email/phone, attach pending invitations
 *    that match it. Never match unverified contact details.
 *  - Resend bumps `send_count` / `last_sent_at`. Revoke/decline set `responded_at`.
 *  - A pending invite past `expires_at` must be flipped to 'expired' (job, or when
 *    re-inviting) because the partial unique indexes only look at status = 'pending'.
 */
export const organizationInvitations = pgTable(
  "organization_invitations",
  {
    id: pk(),
    orgId: orgRef(),
    type: orgMemberTypeEnum("type").notNull(), // 'managed' | 'portal' (never 'owner')
    channel: invitationChannelEnum("channel").notNull(), // how a not-yet-user is reached
    email: text("email"), // lowercase
    phone: text("phone"), // E.164, e.g. +201001234567
    inviteeUserId: uuid("invitee_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    username: text("username"), // proposed handle; the invitee can pick another at accept
    tokenHash: text("token_hash").notNull(), // hash of the one-time token, never the token
    status: invitationStatusEnum("status").notNull().default("pending"),
    invitedBy: uuid("invited_by").notNull(), // organization_users.id (same org, composite FK)
    expiresAt: ts("expires_at").notNull(),
    respondedAt: ts("responded_at"), // accepted / declined / revoked
    acceptedOrgUserId: uuid("accepted_org_user_id"), // the membership this invite produced
    sendCount: integer("send_count").notNull().default(1),
    lastSentAt: ts("last_sent_at")
      .notNull()
      .default(sql`now()`),
    ...timestamps(),
  },
  (t) => [
    foreignKey({
      name: "fk_org_invitation_inviter",
      columns: [t.orgId, t.invitedBy],
      foreignColumns: [organizationUsers.orgId, organizationUsers.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "fk_org_invitation_accepted_member",
      columns: [t.orgId, t.acceptedOrgUserId],
      foreignColumns: [organizationUsers.orgId, organizationUsers.id],
    }).onDelete("restrict"),

    uniqueIndex("ux_org_invitation_token").on(t.tokenHash),
    // one OPEN invite per target per org; old ones stay as history
    uniqueIndex("ux_org_invitation_pending_email")
      .on(t.orgId, t.email)
      .where(sql`${t.status} = 'pending'`),
    uniqueIndex("ux_org_invitation_pending_phone")
      .on(t.orgId, t.phone)
      .where(sql`${t.status} = 'pending'`),
    uniqueIndex("ux_org_invitation_pending_user")
      .on(t.orgId, t.inviteeUserId)
      .where(sql`${t.status} = 'pending'`),
    // sign-up auto-link and "my invitations" inbox
    index("ix_org_invitation_email_pending")
      .on(t.email)
      .where(sql`${t.status} = 'pending'`),
    index("ix_org_invitation_phone_pending")
      .on(t.phone)
      .where(sql`${t.status} = 'pending'`),
    index("ix_org_invitation_user_pending")
      .on(t.inviteeUserId)
      .where(sql`${t.status} = 'pending'`),
    index("ix_org_invitation_org_status").on(t.orgId, t.status),

    check("ck_org_invitation_not_owner", sql`${t.type} <> 'owner'`),
    check(
      "ck_org_invitation_target",
      sql`num_nonnulls(${t.email}, ${t.phone}, ${t.inviteeUserId}) >= 1`
    ),
    check(
      "ck_org_invitation_channel",
      sql`(${t.channel} = 'email' and ${t.email} is not null)
        or (${t.channel} = 'whatsapp' and ${t.phone} is not null)`
    ),
    check(
      "ck_org_invitation_email_lower",
      sql`${t.email} is null or ${t.email} = lower(${t.email})`
    ),
    check(
      "ck_org_invitation_phone_format",
      sql`${t.phone} is null or ${t.phone} ~ '^\\+[1-9][0-9]{7,14}$'`
    ),
    check(
      "ck_org_invitation_username_format",
      sql`${t.username} is null or ${t.username} ~ '^[a-z0-9][a-z0-9._-]{2,30}$'`
    ),
    check(
      "ck_org_invitation_accepted_link",
      sql`(${t.status} = 'accepted') = (${t.acceptedOrgUserId} is not null)`
    ),
    check("ck_org_invitation_expiry", sql`${t.expiresAt} > ${t.createdAt}`),
  ]
)

export type Organization = typeof organizations.$inferSelect
export type NewOrganization = typeof organizations.$inferInsert
export type OrganizationUser = typeof organizationUsers.$inferSelect
export type NewOrganizationUser = typeof organizationUsers.$inferInsert
export type OrganizationInvitation = typeof organizationInvitations.$inferSelect
export type NewOrganizationInvitation =
  typeof organizationInvitations.$inferInsert
