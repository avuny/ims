import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Target directory: src/db/schema
const schemaDir = path.join(__dirname, "src", "schema")

if (!fs.existsSync(schemaDir)) {
  fs.mkdirSync(schemaDir, { recursive: true })
}

const files = {
  "enums.ts": `import { pgEnum } from "drizzle-orm/pg-core";

export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "SUSPENDED", "DELETED"]);
export const organizationMemberRoleEnum = pgEnum("organization_member_role", ["OWNER", "ADMIN", "MEMBER"]);
export const oauthProviderEnum = pgEnum("oauth_provider", ["GOOGLE", "FACEBOOK", "APPLE"]);
export const authChallengePurposeEnum = pgEnum("auth_challenge_purpose", [
  "SIGN_UP", "LOGIN", "VERIFY_EMAIL", "VERIFY_PHONE", "PASSWORD_RESET", "CHANGE_EMAIL", "CHANGE_PHONE"
]);
export const authChallengeChannelEnum = pgEnum("auth_challenge_channel", ["EMAIL", "SMS"]);
export const businessPartyRoleEnum = pgEnum("business_party_role", ["CUSTOMER", "SUPPLIER"]);
`,

  "users.ts": `import { pgTable, uuid, varchar, text, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { userStatusEnum } from "./enums";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    username: varchar("username", { length: 50 }),
    usernameNormalized: varchar("username_normalized", { length: 50 }),
    passwordHash: text("password_hash"),
    displayName: varchar("display_name", { length: 120 }),
    avatarUrl: text("avatar_url"),
    status: userStatusEnum("status").notNull().default("ACTIVE"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("users_username_normalized_uq").on(table.usernameNormalized),
    index("users_status_idx").on(table.status),
    index("users_created_at_idx").on(table.createdAt),
  ]
);

export const userEmails = pgTable(
  "user_emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 320 }).notNull(),
    emailNormalized: varchar("email_normalized", { length: 320 }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("user_emails_normalized_uq").on(table.emailNormalized),
    index("user_emails_user_id_idx").on(table.userId),
    index("user_emails_verified_idx").on(table.verifiedAt),
  ]
);

export const userPhones = pgTable(
  "user_phones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 20 }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("user_phones_phone_uq").on(table.phone),
    index("user_phones_user_id_idx").on(table.userId),
    index("user_phones_verified_idx").on(table.verifiedAt),
  ]
);
`,

  "auth.ts": `import { pgTable, uuid, varchar, text, boolean, integer, timestamp, inet, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
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
`,

  "organizations.ts": `import { pgTable, uuid, varchar, timestamp, primaryKey, uniqueIndex, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { organizationMemberRoleEnum } from "./enums";

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("organizations_slug_uq").on(table.slug),
  ]
);

export const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: organizationMemberRoleEnum("role").notNull().default("MEMBER"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index("organization_members_user_id_idx").on(table.userId),
    index("organization_members_role_idx").on(table.role),
  ]
);
`,

  "business.ts": `import { pgTable, uuid, varchar, boolean, jsonb, timestamp, primaryKey, uniqueIndex, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { organizations } from "./organizations";
import { businessPartyRoleEnum } from "./enums";

export const businessParties = pgTable(
  "business_parties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 200 }).notNull(),
    code: varchar("code", { length: 50 }),
    legalName: varchar("legal_name", { length: 200 }),
    taxNumber: varchar("tax_number", { length: 100 }),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("business_parties_organization_id_idx").on(table.organizationId),
    index("business_parties_name_idx").on(table.name),
    uniqueIndex("business_parties_org_code_uq").on(table.organizationId, table.code),
  ]
);

export const businessPartyRoles = pgTable(
  "business_party_roles",
  {
    partyId: uuid("party_id").notNull().references(() => businessParties.id, { onDelete: "cascade" }),
    role: businessPartyRoleEnum("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.partyId, table.role] }),
  ]
);

export const partyUsers = pgTable(
  "party_users",
  {
    partyId: uuid("party_id").notNull().references(() => businessParties.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 100 }),
    isPrimaryContact: boolean("is_primary_contact").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.partyId, table.userId] }),
    index("party_users_user_id_idx").on(table.userId),
  ]
);
`,

  "relations.ts": `import { relations } from "drizzle-orm";
import { users, userEmails, userPhones } from "./users";
import { oauthAccounts, authChallenges, authSessions } from "./auth";
import { organizations, organizationMembers } from "./organizations";
import { businessParties, businessPartyRoles, partyUsers } from "./business";

export const usersRelations = relations(users, ({ many }) => ({
  emails: many(userEmails),
  phones: many(userPhones),
  oauthAccounts: many(oauthAccounts),
  challenges: many(authChallenges),
  sessions: many(authSessions),
  organizationMemberships: many(organizationMembers),
  partyMemberships: many(partyUsers),
}));

export const userEmailsRelations = relations(userEmails, ({ one }) => ({
  user: one(users, { fields: [userEmails.userId], references: [users.id] }),
}));

export const userPhonesRelations = relations(userPhones, ({ one }) => ({
  user: one(users, { fields: [userPhones.userId], references: [users.id] }),
}));

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, { fields: [oauthAccounts.userId], references: [users.id] }),
}));

export const authChallengesRelations = relations(authChallenges, ({ one }) => ({
  user: one(users, { fields: [authChallenges.userId], references: [users.id] }),
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, { fields: [authSessions.userId], references: [users.id] }),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  parties: many(businessParties),
}));

export const organizationMembersRelations = relations(organizationMembers, ({ one }) => ({
  organization: one(organizations, { fields: [organizationMembers.organizationId], references: [organizations.id] }),
  user: one(users, { fields: [organizationMembers.userId], references: [users.id] }),
}));

export const businessPartiesRelations = relations(businessParties, ({ one, many }) => ({
  organization: one(organizations, { fields: [businessParties.organizationId], references: [organizations.id] }),
  roles: many(businessPartyRoles),
  users: many(partyUsers),
}));

export const businessPartyRolesRelations = relations(businessPartyRoles, ({ one }) => ({
  party: one(businessParties, { fields: [businessPartyRoles.partyId], references: [businessParties.id] }),
}));

export const partyUsersRelations = relations(partyUsers, ({ one }) => ({
  party: one(businessParties, { fields: [partyUsers.partyId], references: [businessParties.id] }),
  user: one(users, { fields: [partyUsers.userId], references: [users.id] }),
}));
`,

  "index.ts": `export * from "./enums";
export * from "./users";
export * from "./auth";
export * from "./organizations";
export * from "./business";
export * from "./relations";
`,
}

for (const [filename, content] of Object.entries(files)) {
  const filePath = path.join(schemaDir, filename)
  fs.writeFileSync(filePath, content, "utf8")
  console.log(`Created: \${filePath}`)
}

console.log("✅ All schema files successfully generated.")
