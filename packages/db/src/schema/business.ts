import { pgTable, uuid, varchar, boolean, jsonb, timestamp, primaryKey, uniqueIndex, index } from "drizzle-orm/pg-core";
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
