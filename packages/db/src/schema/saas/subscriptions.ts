import { sql } from "drizzle-orm"
import {
  boolean,
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
import { createdAt, pk, timestamps, timestamptz } from "./_helpers.js"
import { billingProviderEnum } from "./billing-accounts.js"
import { orgRef } from "./organizations.js"
import {
  planPrices,
  type Plan,
  type PlanFeatures,
  type PlanLimits,
} from "./plans.js"
import { users } from "./users.js"

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "incomplete", // created, first payment pending
  "trialing",
  "active",
  "past_due", // renewal payment failed; grace period running
  "paused",
  "canceled", // terminal
  "expired", // terminal
])
export type SubscriptionStatus =
  (typeof subscriptionStatusEnum.enumValues)[number]

/**
 * SUBSCRIPTIONS: an organization's live contract with a plan price.
 * The subscription belongs to the ORGANIZATION (not the user): a user who owns three
 * organizations pays for three subscriptions.
 *
 * Real-world flow:
 *  1. Right after the organization is created, checkout creates the row as 'incomplete'
 *     (or 'trialing' if the plan has a trial). First successful payment -> 'active'.
 *  2. A renewal job runs near `current_period_end`: it creates the next invoice, then
 *     advances `current_period_start/end` when paid. A failed payment -> 'past_due' and
 *     `past_due_since` starts the grace period; after it the org turns read-only; after
 *     retries run out -> 'expired'.
 *  3. Upgrade: change `plan_price_id` now (with a proration invoice item). Downgrade: store
 *     the target in `pending_plan_price_id`; it is applied at period end.
 *  4. Cancel: `cancel_at_period_end = true` keeps access until the period ends, then
 *     'canceled' (terminal). A new subscription is a new row.
 *  5. Custom deals: `limits_override` / `features_override` are merged over the plan
 *     (see resolveEntitlements below).
 *  At most ONE live subscription per organization (partial unique index).
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: pk(),
    orgId: orgRef(),
    planPriceId: uuid("plan_price_id")
      .notNull()
      .references(() => planPrices.id, { onDelete: "restrict" }),
    pendingPlanPriceId: uuid("pending_plan_price_id").references(
      () => planPrices.id,
      { onDelete: "restrict" }
    ), // downgrade applied at period end
    status: subscriptionStatusEnum("status").notNull(),
    quantity: integer("quantity").notNull().default(1), // seats, if you price per seat
    limitsOverride: jsonb("limits_override").$type<Partial<PlanLimits>>(),
    featuresOverride: jsonb("features_override").$type<PlanFeatures>(),
    currentPeriodStart: timestamptz("current_period_start").notNull(),
    currentPeriodEnd: timestamptz("current_period_end").notNull(),
    trialEndsAt: timestamptz("trial_ends_at"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamptz("canceled_at"),
    endedAt: timestamptz("ended_at"),
    pastDueSince: timestamptz("past_due_since"), // drives grace period -> read-only mode
    provider: billingProviderEnum("provider").notNull().default("manual"),
    providerSubscriptionId: text("provider_subscription_id"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    ...timestamps(),
  },
  (t) => [
    // At most one live subscription per organization.
    uniqueIndex("ux_sub_one_live_per_org")
      .on(t.orgId)
      .where(sql`${t.status} NOT IN ('canceled', 'expired')`),
    uniqueIndex("ux_sub_provider_id")
      .on(t.provider, t.providerSubscriptionId)
      .where(sql`${t.providerSubscriptionId} IS NOT NULL`),
    unique("uq_sub_org_id").on(t.orgId, t.id), // target of composite FKs (same-org guarantee)
    index("ix_sub_status_period_end").on(t.status, t.currentPeriodEnd), // renewal / expiry jobs
    index("ix_sub_plan_price").on(t.planPriceId),
    check(
      "ck_sub_period",
      sql`${t.currentPeriodEnd} > ${t.currentPeriodStart}`
    ),
    check("ck_sub_quantity", sql`${t.quantity} > 0`),
  ]
)

/**
 * SUBSCRIPTION_EVENTS: append-only history of lifecycle changes.
 *
 * Real-world flow: every status change, plan change, renewal, cancel and resume writes one
 * row (in the same transaction as the change). Support reads it to answer "why was this
 * account suspended?", and analytics reads it for churn. Never updated or deleted
 * (REVOKE UPDATE/DELETE). `actor_user_id` is NULL for system jobs and webhooks.
 */
export const subscriptionEvents = pgTable(
  "subscription_events",
  {
    id: pk(),
    orgId: orgRef(),
    subscriptionId: uuid("subscription_id").notNull(),
    type: text("type").notNull(), // created | status_changed | plan_changed | renewed | canceled | resumed
    fromStatus: subscriptionStatusEnum("from_status"),
    toStatus: subscriptionStatusEnum("to_status"),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    actorUserId: uuid("actor_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "fk_sub_events_subscription",
      columns: [t.orgId, t.subscriptionId],
      foreignColumns: [subscriptions.orgId, subscriptions.id],
    }).onDelete("restrict"),
    index("ix_sub_events_sub_created").on(t.subscriptionId, t.createdAt),
  ]
)

export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert
export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect

/** Effective entitlements = plan defaults merged with the subscription's custom overrides. */
export function resolveEntitlements(
  plan: Pick<Plan, "limits" | "features">,
  sub: Pick<Subscription, "limitsOverride" | "featuresOverride">
) {
  return {
    limits: { ...plan.limits, ...sub.limitsOverride } as PlanLimits,
    features: { ...plan.features, ...sub.featuresOverride } as PlanFeatures,
  }
}
