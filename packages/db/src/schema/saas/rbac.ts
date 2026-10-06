import { and, eq, isNull, or } from "drizzle-orm"
import type { PgDatabase } from "drizzle-orm/pg-core"
import type { OrgMemberType, PermissionEffect } from "./enums.js"
import {
  organizationUserRoles,
  rolePermissions,
  roles,
} from "./access-control.js"

export type PermissionStatement = {
  effect: PermissionEffect
  resource: string
  action: string
  resourceId: string // '*' = any record
}

/** Loads every statement of every role held by a membership (system roles + the org's own). */
export async function loadStatements(
  db: PgDatabase<any, any, any>,
  orgId: string,
  orgUserId: string
): Promise<PermissionStatement[]> {
  return db
    .select({
      effect: rolePermissions.effect,
      resource: rolePermissions.resource,
      action: rolePermissions.action,
      resourceId: rolePermissions.resourceId,
    })
    .from(organizationUserRoles)
    .innerJoin(roles, eq(roles.id, organizationUserRoles.roleId))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .where(
      and(
        eq(organizationUserRoles.orgId, orgId),
        eq(organizationUserRoles.orgUserId, orgUserId),
        or(isNull(roles.orgId), eq(roles.orgId, orgId))
      )
    )
}

function matches(
  s: PermissionStatement,
  action: string,
  resource: string,
  resourceId?: string
) {
  return (
    (s.resource === "*" || s.resource === resource) &&
    (s.action === "*" || s.action === action) &&
    // A collection-level check (no resourceId, e.g. "list users") is only satisfied by '*'.
    (s.resourceId === "*" ||
      (resourceId !== undefined && s.resourceId === resourceId))
  )
}

/**
 * can(member, 'update', 'user')            -> may update users in general
 * can(member, 'update', 'warehouse', id)   -> may update this specific warehouse
 *
 * - owner: always allowed (plan features and org status are checked elsewhere).
 * - portal: always false here; portal endpoints authorize by record ownership.
 * - managed: deny beats allow, no match = deny.
 */
export function can(
  member: { type: OrgMemberType; statements: PermissionStatement[] },
  action: string,
  resource: string,
  resourceId?: string
): boolean {
  if (member.type === "owner") return true
  if (member.type !== "managed") return false
  const hits = member.statements.filter((s) =>
    matches(s, action, resource, resourceId)
  )
  if (hits.some((s) => s.effect === "deny")) return false
  return hits.some((s) => s.effect === "allow")
}
