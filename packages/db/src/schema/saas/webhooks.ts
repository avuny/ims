import { sql } from "drizzle-orm"
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { pk, ts } from "./_helpers.js"
import { billingProviderEnum, webhookStatusEnum } from "./enums.js"

/**
 * BILLING_EVENTS: inbox for gateway webhooks (Stripe, Paymob, ...). Not tenant-scoped:
 * the organization is only resolved while processing.
 *
 * Real-world flow:
 *  1. The webhook endpoint verifies the signature, runs
 *     INSERT ... ON CONFLICT (provider, event_id) DO NOTHING, and returns 200 immediately.
 *  2. A worker picks rows in 'received' / 'failed', applies them idempotently (update the
 *     payment, invoice, subscription) and marks them 'processed' (or 'ignored' for
 *     events we do not care about). Failures keep `last_error`, bump `attempts` and retry.
 *  Because the raw payload is stored, an event can be replayed after a bug fix.
 */
export const billingEvents = pgTable(
  "billing_events",
  {
    id: pk(),
    provider: billingProviderEnum("provider").notNull(),
    eventId: text("event_id").notNull(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: webhookStatusEnum("status").notNull().default("received"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    receivedAt: ts("received_at").notNull().defaultNow(),
    processedAt: ts("processed_at"),
  },
  (t) => [
    uniqueIndex("ux_billing_event").on(t.provider, t.eventId),
    index("ix_billing_event_pending")
      .on(t.status, t.receivedAt)
      .where(sql`${t.status} IN ('received', 'failed')`),
  ]
)

export type BillingEvent = typeof billingEvents.$inferSelect
