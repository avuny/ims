import type { PgDatabase } from "drizzle-orm/pg-core"
import {
  billingAccounts,
  type BillingAddress,
} from "./billing-accounts.js"
import {
  organizations,
  organizationUsers,
  type Organization,
  type OrganizationUser,
} from "./organizations.js"

/**
 * ONBOARDING: creating an organization for an already signed-in user.
 *
 * Used in two places with the same code path:
 *  1. First login: the dashboard has no organizations yet and asks the user to create one.
 *  2. Later: the organization switcher's "Create new organization" button.
 *
 * Sign-up itself never creates an organization.
 */

/** Codes that can never be used as an org code / subdomain. Extend as needed. */
export const RESERVED_ORG_CODES = new Set([
  "www", "api", "app", "admin", "mail", "static", "assets", "cdn", "docs",
  "help", "support", "status", "blog", "billing", "auth", "login", "signup",
  "dashboard", "portal", "root", "system", "staging", "dev", "test",
])

export type CreateOrganizationInput = {
  userId: string
  code: string // subdomain label, lowercase
  name: string
  defaultCurrency: string // ISO 4217, must exist in `currencies`
  timezone?: string // IANA name, defaults to UTC
  countryCode?: string
  stateId?: string
  ownerUsername: string // the owner's handle inside this organization
  billing: {
    legalName: string
    billingEmail: string
    taxId?: string
    address?: BillingAddress
  }
}

export class OrganizationCreateError extends Error {
  constructor(
    public reason: "reserved_code" | "code_taken" | "username_invalid",
    message: string
  ) {
    super(message)
  }
}

/**
 * In ONE transaction: organization + owner membership + billing account.
 * Starting the subscription / trial is the checkout service's job and runs right after.
 * Cap "organizations owned per user" here if your business needs it.
 */
export async function createOrganizationForUser(
  db: PgDatabase<any, any, any>,
  input: CreateOrganizationInput
): Promise<{ organization: Organization; membership: OrganizationUser }> {
  const code = input.code.trim().toLowerCase()
  if (RESERVED_ORG_CODES.has(code)) {
    throw new OrganizationCreateError("reserved_code", `"${code}" is reserved`)
  }

  return db.transaction(async (tx) => {
    // The unique index ux_org_code is the real guard; this gives a friendly error.
    const [organization] = await tx
      .insert(organizations)
      .values({
        code,
        name: input.name.trim(),
        defaultCurrency: input.defaultCurrency,
        timezone: input.timezone ?? "UTC",
        countryCode: input.countryCode,
        stateId: input.stateId,
      })
      .onConflictDoNothing({ target: organizations.code })
      .returning()

    if (!organization) {
      throw new OrganizationCreateError("code_taken", `"${code}" is already taken`)
    }

    const [membership] = await tx
      .insert(organizationUsers)
      .values({
        orgId: organization.id,
        userId: input.userId,
        type: "owner",
        username: input.ownerUsername.trim().toLowerCase(),
        lastAccessedAt: new Date(), // makes it the default org in the switcher
      })
      .returning()

    await tx.insert(billingAccounts).values({
      orgId: organization.id,
      legalName: input.billing.legalName,
      billingEmail: input.billing.billingEmail.trim().toLowerCase(),
      taxId: input.billing.taxId,
      address: input.billing.address,
      currency: input.defaultCurrency,
    })

    return { organization, membership }
  })
}
