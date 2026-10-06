/**
 * Organizations · Users · Access control · Plans · Subscriptions · Invoices · Payments
 * (PostgreSQL, Drizzle ORM). Requires drizzle-orm >= 0.36 (array-style table extras) and
 * generated columns.
 *
 * FILES
 *  users.ts             global identity (no organization on the user)
 *  organizations.ts     organizations + organization_users (membership: owner/managed/portal)
 *  access-control.ts    roles, role_permissions, organization_user_roles
 *  rbac.ts              can() + loadStatements(): permission evaluation
 *  billing-accounts.ts  billing_accounts
 *  plans.ts             plans, plan_prices
 *  subscriptions.ts     subscriptions, subscription_events, resolveEntitlements()
 *  invoices.ts          invoices, invoice_items, invoice_counters
 *  payments.ts          payment_methods, payments, refunds
 *  webhooks.ts          billing_events
 *  relations.ts         every relations() definition (kept apart to avoid import cycles)
 *
 * CONVENTIONS
 *  - Money = integer minor units (bigint) + ISO-4217 currency. Never float/numeric.
 *  - Provider-agnostic: `provider` + `provider_*_id` columns.
 *  - Financial rows are never hard-deleted: FKs to organizations are RESTRICT.
 *  - Plans & prices are immutable once sold: add a new row and migrate subscribers.
 *  - Invoices snapshot billing details at issue time and are immutable after finalize.
 *  - Webhooks are stored first, processed idempotently (provider + event_id).
 *  - Tenant-owned child rows carry org_id and reference their parent with a COMPOSITE FK
 *    (org_id, parent_id), so a row can never point at another tenant's parent.
 *
 * NOT EXPRESSIBLE IN DRIZZLE (add in a custom migration)
 *  1. Trigger: block UPDATE of organizations.code and organization_users.org_id / user_id / type.
 *  2. Trigger: reject UPDATE/DELETE on invoices + invoice_items once status <> 'draft'.
 *  3. Gap-free invoice numbers: allocate from invoice_counters in the same transaction that
 *     flips the invoice from draft to open, otherwise a rollback leaves gaps.
 *  4. Row Level Security on every table with org_id. Special cases: roles
 *     (org_id IS NULL OR org_id = current org), role_permissions (through roles).
 *     No RLS on users, plans, plan_prices, invoice_counters, billing_events.
 *  5. Revoke UPDATE/DELETE on subscription_events (append-only).
 *  6. Trigger on organization_user_roles: member.type = 'managed', and the role is a system
 *     role or belongs to the same org.
 *  7. Trigger: plans (limits, features) and plan_prices (amount, currency, interval) are
 *     immutable once any subscription uses them.
 *  8. Trigger: billing_accounts.currency frozen after the first invoice is issued.
 *  9. Seed the system roles (org_id NULL) and their role_permissions.
 */
export * from "./_helpers.js"
export * from "./enums.js"
export * from "./shared-types.js"
export * from "./users.js"
export * from "./organizations.js"
export * from "./access-control.js"
export * from "./rbac.js"
export * from "./billing-accounts.js"
export * from "./plans.js"
export * from "./subscriptions.js"
export * from "./invoices.js"
export * from "./payments.js"
export * from "./webhooks.js"
export * from "./relations.js"
