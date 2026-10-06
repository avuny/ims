import { sql } from "drizzle-orm"
import {
  bigint,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { createdAt, currency, money, pk, timestamps, ts } from "./_helpers.js"
import {
  billingProviderEnum,
  invoiceItemTypeEnum,
  invoiceStatusEnum,
} from "./enums.js"
import { orgRef } from "./organizations.js"
import { planPrices } from "./plans.js"
import type { BillingSnapshot } from "./shared-types.js"
import { subscriptions } from "./subscriptions.js"

/**
 * INVOICES: the bill the platform issues to an organization. The legal document.
 *
 * Real-world flow:
 *  1. Draft: the renewal job (or an admin) creates a 'draft' with items; totals are still
 *     editable and `number` is NULL.
 *  2. Finalize (draft -> open), in ONE transaction: allocate the gap-free number from
 *     `invoice_counters`, freeze `billing_snapshot`, set `issued_at` / `due_at`. From now
 *     on the invoice and its items are immutable (trigger).
 *  3. Collect: a payment attempt is made (gateway charge, or an admin records a bank
 *     transfer). Dunning uses `attempt_count` / `next_attempt_at`. When `amount_paid`
 *     reaches `total` -> 'paid'.
 *  4. Mistakes are never edited: 'void' the invoice (and issue a new one). Debt that will
 *     never be collected -> 'uncollectible'.
 *  The unique (subscription_id, period_start) index stops a renewal job that runs twice
 *  from billing the same period twice. `amount_due` is a generated column.
 */
export const invoices = pgTable(
  "invoices",
  {
    id: pk(),
    orgId: orgRef(),
    subscriptionId: uuid("subscription_id"),
    number: text("number"), // assigned at finalize (see invoice_counters); NULL while draft
    status: invoiceStatusEnum("status").notNull().default("draft"),
    currency: currency(),
    subtotal: money("subtotal").default(0),
    discountTotal: money("discount_total").default(0),
    taxTotal: money("tax_total").default(0),
    total: money("total").default(0),
    amountPaid: money("amount_paid").default(0),
    amountDue: bigint("amount_due", { mode: "number" }).generatedAlwaysAs(
      sql`total - amount_paid`
    ),
    periodStart: ts("period_start"),
    periodEnd: ts("period_end"),
    issuedAt: ts("issued_at"),
    dueAt: ts("due_at"),
    paidAt: ts("paid_at"),
    voidedAt: ts("voided_at"),
    attemptCount: integer("attempt_count").notNull().default(0), // dunning
    nextAttemptAt: ts("next_attempt_at"),
    billingSnapshot: jsonb("billing_snapshot").$type<BillingSnapshot>(), // frozen at finalize
    provider: billingProviderEnum("provider").notNull().default("manual"),
    providerInvoiceId: text("provider_invoice_id"),
    hostedUrl: text("hosted_url"),
    pdfUrl: text("pdf_url"),
    ...timestamps(),
  },
  (t) => [
    foreignKey({
      name: "fk_invoice_subscription",
      columns: [t.orgId, t.subscriptionId],
      foreignColumns: [subscriptions.orgId, subscriptions.id],
    }).onDelete("restrict"),
    unique("uq_invoice_org_id").on(t.orgId, t.id), // target of composite FKs (same-org guarantee)
    uniqueIndex("ux_invoice_number")
      .on(t.number)
      .where(sql`${t.number} IS NOT NULL`),
    uniqueIndex("ux_invoice_provider_id")
      .on(t.provider, t.providerInvoiceId)
      .where(sql`${t.providerInvoiceId} IS NOT NULL`),
    index("ix_invoice_org_created").on(t.orgId, t.createdAt.desc()),
    index("ix_invoice_status_due").on(t.status, t.dueAt),
    index("ix_invoice_subscription").on(t.subscriptionId),
    // A renewal job that runs twice must not bill the same period twice.
    uniqueIndex("ux_invoice_sub_period")
      .on(t.subscriptionId, t.periodStart)
      .where(
        sql`${t.subscriptionId} IS NOT NULL AND ${t.periodStart} IS NOT NULL AND ${t.status} <> 'void'`
      ),
    check(
      "ck_invoice_totals",
      sql`${t.total} = ${t.subtotal} - ${t.discountTotal} + ${t.taxTotal}`
    ),
    check(
      "ck_invoice_paid_range",
      sql`${t.amountPaid} >= 0 AND ${t.amountPaid} <= ${t.total}`
    ),
    check(
      "ck_invoice_number_when_issued",
      sql`${t.status} NOT IN ('open', 'paid', 'uncollectible') OR ${t.number} IS NOT NULL`
    ),
  ]
)

/**
 * INVOICE_ITEMS: the lines of an invoice.
 *
 * Real-world flow: while the invoice is a draft, lines are added: the plan charge
 * ('subscription'), a mid-cycle upgrade ('proration', can be negative for unused time),
 * metered extras ('usage'), or manual credits/discounts ('adjustment', negative amount).
 * `amount` is the authoritative line total; the invoice header totals must equal the sum
 * of lines when finalizing (checked by the finalize service). After finalize, lines are
 * frozen (trigger). `org_id` is repeated here so Row Level Security works without a join.
 */
export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: pk(),
    orgId: orgRef(),
    invoiceId: uuid("invoice_id").notNull(),
    type: invoiceItemTypeEnum("type").notNull().default("subscription"),
    description: text("description").notNull(),
    planPriceId: uuid("plan_price_id").references(() => planPrices.id, {
      onDelete: "set null",
    }),
    quantity: integer("quantity").notNull().default(1),
    unitAmount: money("unit_amount"),
    amount: money("amount"), // authoritative line total; negative for credits / discounts
    taxAmount: money("tax_amount").default(0),
    periodStart: ts("period_start"),
    periodEnd: ts("period_end"),
    createdAt: createdAt(),
  },
  (t) => [
    // Cascade only matters for draft invoices; finalized ones are protected by trigger.
    foreignKey({
      name: "fk_invoice_item_invoice",
      columns: [t.orgId, t.invoiceId],
      foreignColumns: [invoices.orgId, invoices.id],
    }).onDelete("cascade"),
    index("ix_invoice_items_invoice").on(t.invoiceId),
    check("ck_invoice_item_quantity", sql`${t.quantity} > 0`),
  ]
)

/**
 * INVOICE_COUNTERS: gap-free invoice numbering, one row per series + year (platform-wide,
 * NOT per organization, because the platform is the issuer).
 *
 * Real-world flow: when an invoice is finalized, inside the same transaction run
 *   INSERT ... ON CONFLICT (series, year) DO UPDATE SET last_number = last_number + 1 RETURNING last_number
 * and format it as e.g. 'INV-2026-000123'. The row lock is held until commit, so numbers
 * are race-free, and a rollback also rolls back the increment (no gaps).
 */
export const invoiceCounters = pgTable(
  "invoice_counters",
  {
    series: text("series").notNull().default("INV"),
    year: integer("year").notNull(),
    lastNumber: integer("last_number").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.series, t.year] })]
)

export type Invoice = typeof invoices.$inferSelect
export type InvoiceItem = typeof invoiceItems.$inferSelect
