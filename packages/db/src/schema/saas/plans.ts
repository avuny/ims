import { sql } from "drizzle-orm"
import {
  boolean,
  check,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { createdAt, currency, money, pk, timestamps } from "./_helpers.js"
import type { BillingProvider } from "./billing-accounts.js"

/* ---------- enum + jsonb types (owned by this file) ---------- */

export const billingIntervalEnum = pgEnum("billing_interval", ["month", "year"])
export type BillingInterval = (typeof billingIntervalEnum.enumValues)[number]

// null = unlimited
export type PlanLimits = {
  managedUsers: number | null
  branches: number | null
  warehouses: number | null
  portalUsers: number | null
}
export type PlanFeatures = Partial<
  Record<
    | "multiWarehouse"
    | "customRoles"
    | "apiAccess"
    | "auditExport"
    | "prioritySupport",
    boolean
  >
>

/**
 * PLANS: what a customer gets (limits + feature flags), independent of price.
 *
 * Real-world flow:
 *  - The platform team defines "Starter", "Pro", ... (`code` is the stable key used in code).
 *  - Plans are IMMUTABLE once sold. To change limits, create a new plan (e.g. 'pro_v2')
 *    and migrate subscribers; old subscribers keep what they bought (grandfathering).
 *  - `is_public = false` hides custom/legacy plans from the pricing page.
 *    `is_active = false` stops new sales while existing subscriptions keep working.
 *  - `trial_days` > 0 makes new subscriptions start in 'trialing'.
 *  - Per-customer exceptions go in `subscriptions.limits_override`, not in the plan.
 */
export const plans = pgTable(
  "plans",
  {
    id: pk(),
    code: text("code").notNull(), // stable key, e.g. 'starter', 'pro_v2'
    name: text("name").notNull(),
    description: text("description"),
    limits: jsonb("limits").$type<PlanLimits>().notNull(),
    features: jsonb("features").$type<PlanFeatures>().notNull().default({}),
    trialDays: integer("trial_days").notNull().default(0),
    isPublic: boolean("is_public").notNull().default(true), // false = custom / legacy plan
    isActive: boolean("is_active").notNull().default(true), // false = not sellable; existing subs keep working
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("ux_plans_code").on(t.code),
    check("ck_plans_trial_days", sql`${t.trialDays} >= 0`),
  ]
)

/**
 * PLAN_PRICES: how much a plan costs per currency and billing interval.
 *
 * Real-world flow:
 *  - "Pro" costs 49.00 USD monthly, 490.00 USD yearly, 2,500 EGP monthly: one row each.
 *  - A sold price is never edited. Deactivate it (`is_active = false`) and add a new row;
 *    existing subscriptions keep pointing at the old row at the old amount.
 *  - `provider_refs` maps each gateway to its price id ({"stripe": "price_123"}), so adding
 *    a gateway needs no schema change.
 *  - Amounts are integer minor units (cents/piasters).
 */
export const planPrices = pgTable(
  "plan_prices",
  {
    id: pk(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    currency: currency(),
    unitAmount: money("unit_amount"), // minor units
    interval: billingIntervalEnum("interval").notNull(),
    intervalCount: integer("interval_count").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true), // never edit a sold price: deactivate + add new
    providerRefs: jsonb("provider_refs")
      .$type<Partial<Record<BillingProvider, string>>>()
      .notNull()
      .default({}),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("ux_plan_price_active")
      .on(t.planId, t.currency, t.interval, t.intervalCount)
      .where(sql`${t.isActive}`),
    check("ck_plan_price_amount", sql`${t.unitAmount} >= 0`),
    check("ck_plan_price_interval_count", sql`${t.intervalCount} > 0`),
  ]
)

export type Plan = typeof plans.$inferSelect
export type PlanPrice = typeof planPrices.$inferSelect
