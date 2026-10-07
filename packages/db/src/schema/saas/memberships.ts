import { and, eq, ne, sql } from "drizzle-orm"
import type { PgDatabase } from "drizzle-orm/pg-core"
import {
  organizations,
  organizationUsers,
  type OrgMemberType,
  type OrgStatus,
} from "./organizations.js"

/**
 * MEMBERSHIPS: queries behind the dashboard gate and the organization switcher.
 *
 * Dashboard flow after sign-in:
 *   const orgs = await listMyOrganizations(db, user.id)
 *   - orgs.length === 0 -> show onboarding "Create your organization" (./onboarding.ts)
 *   - otherwise         -> open `pickActiveOrganization(orgs, requestedOrgId)`, render the
 *                          switcher with ALL entries (owner / managed / portal) plus a
 *                          "Create new organization" button, and call `touchMembership`.
 */

export type MyOrganization = {
  orgId: string
  orgUserId: string
  code: string
  name: string
  status: OrgStatus
  memberType: OrgMemberType
  lastAccessedAt: Date | null
}

/** Active memberships of a user, most recently used first. Closed / deleted orgs are hidden. */
export async function listMyOrganizations(
  db: PgDatabase<any, any, any>,
  userId: string
): Promise<MyOrganization[]> {
  return db
    .select({
      orgId: organizations.id,
      orgUserId: organizationUsers.id,
      code: organizations.code,
      name: organizations.name,
      status: organizations.status,
      memberType: organizationUsers.type,
      lastAccessedAt: organizationUsers.lastAccessedAt,
    })
    .from(organizationUsers)
    .innerJoin(organizations, eq(organizations.id, organizationUsers.orgId))
    .where(
      and(
        eq(organizationUsers.userId, userId),
        eq(organizationUsers.isActive, true),
        ne(organizations.status, "closed"),
        sql`${organizations.deletedAt} IS NULL`
      )
    )
    .orderBy(
      sql`${organizationUsers.lastAccessedAt} DESC NULLS LAST`,
      organizations.name
    )
}

/** True when the dashboard must show the "create your first organization" step. */
export const needsOnboarding = (orgs: MyOrganization[]) => orgs.length === 0

/** The requested org if the user is a member of it, else the most recently used one. */
export function pickActiveOrganization(
  orgs: MyOrganization[],
  requestedOrgId?: string | null
): MyOrganization | null {
  return (
    orgs.find((o) => o.orgId === requestedOrgId) ?? orgs[0] ?? null
  )
}

/** Call when the user opens an organization; keeps the switcher order and default org fresh. */
export async function touchMembership(
  db: PgDatabase<any, any, any>,
  orgUserId: string
) {
  await db
    .update(organizationUsers)
    .set({ lastAccessedAt: new Date() })
    .where(eq(organizationUsers.id, orgUserId))
}
