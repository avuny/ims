import { sql } from "drizzle-orm"
import {
  check,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { createdAt, pk, timestamps } from "./_helpers.js"
import { permissionEffectEnum } from "./enums.js"
import { organizations, organizationUsers, orgRef } from "./organizations.js"
import { users } from "./users.js"

/**
 * ROLES: a named bundle of permissions, like an AWS IAM role/policy.
 *
 * Two kinds, told apart by `org_id`:
 *  - org_id IS NULL     -> SYSTEM role shipped by the platform (e.g. "Administrator",
 *                          "Viewer", "Cashier"). Seeded by migration, read-only, visible
 *                          to every organization.
 *  - org_id = <org>     -> CUSTOM role created by that organization's owner
 *                          (gated by the plan feature `customRoles`).
 *
 * Real-world flow: the owner opens "Roles", starts from a system role or from scratch,
 * adds permission statements, then assigns the role to managed users. A role that is
 * still assigned cannot be deleted (RESTRICT) and must be unassigned first.
 */
export const roles = pgTable(
  "roles",
  {
    id: pk(),
    orgId: uuid("org_id").references(() => organizations.id, {
      onDelete: "restrict",
    }), // NULL = system role
    name: text("name").notNull(),
    description: text("description"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("ux_role_org_name")
      .on(t.orgId, t.name)
      .where(sql`${t.orgId} IS NOT NULL`),
    uniqueIndex("ux_role_system_name")
      .on(t.name)
      .where(sql`${t.orgId} IS NULL`),
    check("ck_role_name_len", sql`char_length(${t.name}) BETWEEN 2 AND 60`),
  ]
)

/**
 * ROLE_PERMISSIONS: policy statements of a role: "ALLOW|DENY <action> on <resource> [<id>]".
 *
 * Examples (effect, action, resource, resource_id):
 *   allow  update  user       *        -> may update any user
 *   allow  read    invoice    *        -> may view all invoices
 *   allow  update  warehouse  8f3c..   -> may update only this warehouse
 *   deny   delete  *          *        -> may never delete anything
 *
 * Rules (implemented in ./rbac.ts):
 *  - `resource` / `action` are lowercase tokens; '*' is a wildcard.
 *  - `resource_id` defaults to '*' (all records). A specific id narrows the statement to
 *    one record. It is text, so it can hold UUIDs or any other key.
 *  - Explicit DENY beats any ALLOW; no match = implicit deny.
 *
 * Real-world flow: the role editor writes one row per checked box. Permissions are
 * loaded when the session starts (or cached per membership) and checked on each request.
 * RLS note: this table has no org_id; its policy goes through `roles`.
 */
export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: pk(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    effect: permissionEffectEnum("effect").notNull().default("allow"),
    resource: text("resource").notNull(),
    action: text("action").notNull(),
    resourceId: text("resource_id").notNull().default("*"),
    createdAt: createdAt(),
  },
  (t) => [
    unique("ux_role_permission").on(
      t.roleId,
      t.effect,
      t.resource,
      t.action,
      t.resourceId
    ),
    index("ix_role_permission_role").on(t.roleId),
    check(
      "ck_role_permission_resource",
      sql`${t.resource} ~ '^([a-z][a-z0-9_]*|\\*)$'`
    ),
    check(
      "ck_role_permission_action",
      sql`${t.action} ~ '^([a-z][a-z0-9_]*|\\*)$'`
    ),
  ]
)

/**
 * ORGANIZATION_USER_ROLES: which roles a MANAGED member holds (many-to-many).
 * The effective permissions of a member = union of all their roles' statements.
 *
 * Real-world flow: the owner opens a staff member and ticks roles ("Cashier" +
 * "Warehouse clerk"). Owners do not need rows (implicit full access) and portal users
 * never get rows.
 *
 * Integrity:
 *  - The composite FK (org_id, org_user_id) guarantees the assignment's org matches the
 *    membership's org.
 *  - Not expressible here (custom trigger): the member must be type 'managed', and the
 *    role must be a system role or belong to the same org.
 */
export const organizationUserRoles = pgTable(
  "organization_user_roles",
  {
    orgId: orgRef(),
    orgUserId: uuid("org_user_id").notNull(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "restrict" }),
    assignedByUserId: uuid("assigned_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.orgUserId, t.roleId] }),
    foreignKey({
      name: "fk_org_user_roles_member",
      columns: [t.orgId, t.orgUserId],
      foreignColumns: [organizationUsers.orgId, organizationUsers.id],
    }).onDelete("cascade"),
    index("ix_org_user_roles_role").on(t.roleId),
  ]
)

export type Role = typeof roles.$inferSelect
export type RolePermission = typeof rolePermissions.$inferSelect
