import { sql } from "drizzle-orm"
import {
  boolean,
  char,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import {
  createdAt,
  currency,
  money,
  pk,
  softDelete,
  timestamps,
  timestamptz,
} from "./_helpers.js"
import { billingProviderEnum } from "./billing-accounts.js"
import { invoices } from "./invoices.js"
import { orgRef } from "./organizations.js"
import { users } from "./users.js"

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "requires_action",
  "succeeded",
  "failed",
  "canceled",
])
export const paymentMethodTypeEnum = pgEnum("payment_method_type", [
  "card",
  "wallet",
  "bank_transfer",
  "cash",
  "other",
])
export const refundStatusEnum = pgEnum("refund_status", [
  "pending",
  "succeeded",
  "failed",
])
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number]
export type PaymentMethodType =
  (typeof paymentMethodTypeEnum.enumValues)[number]
export type RefundStatus = (typeof refundStatusEnum.enumValues)[number]

/**
 * PAYMENT_METHODS: saved ways to pay (tokens + display info only; never PAN/CVV, which
 * keeps you out of PCI scope).
 *
 * Real-world flow: the owner adds a card through the gateway's hosted form; the gateway
 * returns a token that is stored here with brand / last4 / expiry for display. The
 * default method is charged on renewals (one default per org). Removing a card is a soft
 * delete. Cash and bank transfer need no stored method.
 */
export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: pk(),
    orgId: orgRef("cascade"),
    provider: billingProviderEnum("provider").notNull(),
    providerPaymentMethodId: text("provider_payment_method_id").notNull(),
    type: paymentMethodTypeEnum("type").notNull(),
    brand: text("brand"),
    last4: char("last4", { length: 4 }),
    expMonth: integer("exp_month"),
    expYear: integer("exp_year"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: createdAt(),
    ...softDelete(),
  },
  (t) => [
    uniqueIndex("ux_pm_provider_id").on(t.provider, t.providerPaymentMethodId),
    uniqueIndex("ux_pm_one_default_per_org")
      .on(t.orgId)
      .where(sql`${t.isDefault} AND ${t.deletedAt} IS NULL`),
    index("ix_pm_org").on(t.orgId),
    check(
      "ck_pm_exp_month",
      sql`${t.expMonth} IS NULL OR ${t.expMonth} BETWEEN 1 AND 12`
    ),
  ]
)

/**
 * PAYMENTS: one attempt to collect money, typically against an invoice.
 *
 * Real-world flow:
 *  - Gateway: a 'pending' row is created with an `idempotency_key` (safe retries), the
 *    customer may go through 'requires_action' (3-D Secure), then the webhook marks it
 *    'succeeded' or 'failed' (`failure_code` / `failure_message`).
 *  - Manual: finance receives a bank transfer or cash, records it as 'succeeded' with a
 *    `reference` (receipt/transfer number) and `recorded_by_user_id`.
 *  - On success, `invoices.amount_paid` is increased and the invoice becomes 'paid' when
 *    fully covered (same transaction).
 *  `refunded_amount` is a running total kept in sync with the refunds table.
 */
export const payments = pgTable(
  "payments",
  {
    id: pk(),
    orgId: orgRef(),
    invoiceId: uuid("invoice_id"),
    paymentMethodId: uuid("payment_method_id").references(
      () => paymentMethods.id,
      { onDelete: "set null" }
    ),
    status: paymentStatusEnum("status").notNull().default("pending"),
    amount: money("amount"),
    currency: currency(),
    refundedAmount: money("refunded_amount").default(0),
    provider: billingProviderEnum("provider").notNull(),
    providerPaymentId: text("provider_payment_id"),
    idempotencyKey: text("idempotency_key"), // safe retries of "create payment"
    reference: text("reference"), // bank transfer / receipt number for manual payments
    recordedByUserId: uuid("recorded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    failureCode: text("failure_code"),
    failureMessage: text("failure_message"),
    paidAt: timestamptz("paid_at"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    ...timestamps(),
  },
  (t) => [
    // invoice_id is nullable: with a NULL the composite FK is skipped (MATCH SIMPLE).
    foreignKey({
      name: "fk_payment_invoice",
      columns: [t.orgId, t.invoiceId],
      foreignColumns: [invoices.orgId, invoices.id],
    }).onDelete("restrict"),
    unique("uq_payment_org_id").on(t.orgId, t.id), // target of composite FKs (same-org guarantee)
    uniqueIndex("ux_payment_provider_id")
      .on(t.provider, t.providerPaymentId)
      .where(sql`${t.providerPaymentId} IS NOT NULL`),
    uniqueIndex("ux_payment_idempotency")
      .on(t.orgId, t.idempotencyKey)
      .where(sql`${t.idempotencyKey} IS NOT NULL`),
    index("ix_payment_invoice").on(t.invoiceId),
    index("ix_payment_org_created").on(t.orgId, t.createdAt.desc()),
    check("ck_payment_amount", sql`${t.amount} > 0`),
    check(
      "ck_payment_refunded",
      sql`${t.refundedAmount} >= 0 AND ${t.refundedAmount} <= ${t.amount}`
    ),
  ]
)

/**
 * REFUNDS: money returned for a payment (full or partial).
 *
 * Real-world flow: support/finance issues a refund with a `reason`; it starts 'pending',
 * the gateway (or the manual process) confirms it, and it becomes 'succeeded' or
 * 'failed'. On success, `payments.refunded_amount` is increased in the same transaction.
 * The sum of successful refunds must never exceed the payment amount (enforced by the
 * refund service inside a transaction that locks the payment row).
 */
export const refunds = pgTable(
  "refunds",
  {
    id: pk(),
    orgId: orgRef(),
    paymentId: uuid("payment_id").notNull(),
    amount: money("amount"),
    status: refundStatusEnum("status").notNull().default("pending"),
    reason: text("reason"),
    provider: billingProviderEnum("provider").notNull(),
    providerRefundId: text("provider_refund_id"),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "fk_refund_payment",
      columns: [t.orgId, t.paymentId],
      foreignColumns: [payments.orgId, payments.id],
    }).onDelete("restrict"),
    uniqueIndex("ux_refund_provider_id")
      .on(t.provider, t.providerRefundId)
      .where(sql`${t.providerRefundId} IS NOT NULL`),
    index("ix_refund_payment").on(t.paymentId),
    check("ck_refund_amount", sql`${t.amount} > 0`),
  ]
)

export type PaymentMethod = typeof paymentMethods.$inferSelect
export type Payment = typeof payments.$inferSelect
export type Refund = typeof refunds.$inferSelect
