import { pgTable, uuid, varchar, text, boolean, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
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
