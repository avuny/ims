import { sql } from "drizzle-orm"
import { jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core"
import { currency, pk, timestamps } from "./_helpers.js"
import { billingProviderEnum } from "./enums.js"
import { orgRef } from "./organizations.js"
import type { BillingAddress } from "./shared-types.js"

/**
 * BILLING_ACCOUNTS: who gets invoiced and how, 1:1 with an organization.
 *
 * Real-world flow:
 *  - Created together with the organization (provider 'manual' until a gateway is linked).
 *  - The owner fills in legal name, billing email, tax id and address. These are COPIED
 *    into `invoices.billing_snapshot` when an invoice is finalized, so later edits never
 *    change old invoices.
 *  - When a gateway is linked (Stripe, Paymob, ...), `provider_customer_id` stores the
 *    customer id on that provider.
 *  - `currency` is chosen before the first invoice and is then frozen (custom trigger).
 */
export const billingAccounts = pgTable(
  "billing_accounts",
  {
    id: pk(),
    orgId: orgRef(),
    provider: billingProviderEnum("provider").notNull().default("manual"),
    providerCustomerId: text("provider_customer_id"),
    legalName: text("legal_name").notNull(),
    billingEmail: text("billing_email").notNull(),
    taxId: text("tax_id"),
    address: jsonb("address").$type<BillingAddress>(),
    currency: currency(), // fixed once the first invoice is issued (trigger)
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("ux_billing_account_org").on(t.orgId),
    uniqueIndex("ux_billing_account_provider_customer")
      .on(t.provider, t.providerCustomerId)
      .where(sql`${t.providerCustomerId} IS NOT NULL`),
  ]
)

export type BillingAccount = typeof billingAccounts.$inferSelect
