/**
 * Organizations · Users · Access control · Plans · Subscriptions · Invoices · Payments
 * (PostgreSQL, Drizzle ORM). Requires drizzle-orm >= 0.36 (array-style table extras) and
 * generated columns. Full documentation: ./README.md
 *
 * FILES (each table file owns its enums, jsonb types and row types)
 *  _helpers.ts          shared columns & utils: pk, timestamptz, timestamps, softDelete,
 *                       money, currency, isNormalized, matchesRegex, isUsername
 *  geo.ts               currencies, timezones, countries, states, cities (read-only lookups)
 *  users.ts             users, user_identifiers, user_providers  (+ auth enums)
 *  otp.ts               otps                                     (+ otp enum)
 *  refresh-token.ts     refresh_tokens
 *  organizations.ts     organizations, organization_users, organization_invitations
 *                       (+ member/status/invitation enums, orgRef())
 *  access-control.ts    roles, role_permissions, organization_user_roles (+ effect enum)
 *  rbac.ts              can() + loadStatements(): permission evaluation
 *  memberships.ts       listMyOrganizations(), pickActiveOrganization(), touchMembership()
 *  onboarding.ts        createOrganizationForUser(): org + owner membership + billing account
 *  billing-accounts.ts  billing_accounts (+ billing provider enum, BillingAddress/Snapshot)
 *  plans.ts             plans, plan_prices (+ interval enum, PlanLimits/PlanFeatures)
 *  subscriptions.ts     subscriptions, subscription_events, resolveEntitlements()
 *  invoices.ts          invoices, invoice_items, invoice_counters
 *  payments.ts          payment_methods, payments, refunds
 *  webhooks.ts          billing_events
 *  relations.ts         every relations() definition (kept apart to avoid import cycles)
 *
 * CONVENTIONS
 *  - Sign-up creates a USER only. Organizations are created afterwards from the dashboard
 *    (first-run onboarding, or the switcher's "Create new organization").
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
 *     No RLS on users, user_identifiers, otps, refresh_tokens, plans, plan_prices,
 *     invoice_counters, billing_events, geo tables. organization_users also needs a
 *     policy that lets a user read THEIR OWN rows across orgs (the switcher query).
 *  5. Revoke UPDATE/DELETE on subscription_events (append-only).
 *  6. Trigger on organization_user_roles: member.type = 'managed', and the role is a system
 *     role or belongs to the same org.
 *  7. Trigger: plans (limits, features) and plan_prices (amount, currency, interval) are
 *     immutable once any subscription uses them.
 *  8. Trigger: billing_accounts.currency frozen after the first invoice is issued.
 *  9. Seed the system roles (org_id NULL) and their role_permissions.
 */
export * from "./_helpers.js"
export * from "./geo.js"
export * from "./users.js"
export * from "./otp.js"
export * from "./refresh-token.js"
export * from "./organizations.js"
export * from "./access-control.js"
export * from "./rbac.js"
export * from "./memberships.js"
export * from "./onboarding.js"
export * from "./billing-accounts.js"
export * from "./plans.js"
export * from "./subscriptions.js"
export * from "./invoices.js"
export * from "./payments.js"
export * from "./webhooks.js"
export * from "./relations.js"
