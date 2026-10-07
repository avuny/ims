# SaaS schema (Drizzle ORM, PostgreSQL)

Users, organizations, access control, plans, subscriptions, invoices and payments.
Folder: `packages/db/src/schema/saas/`. Requires `drizzle-orm >= 0.36`.

## What changed in this refactor

1. **No shared enums / types file.** `shared.ts`, `enums.ts` and `shared-types.ts` are deleted.
   Each table file now owns its enums, jsonb types and row types:

   | Enum / type | Lives in |
   |---|---|
   | `auth_provider_type`, `identifier_type` | `users.ts` |
   | `otp_type` | `otp.ts` |
   | `org_member_type`, `org_status`, `invitation_status`, `invitation_channel` | `organizations.ts` |
   | `permission_effect` | `access-control.ts` |
   | `billing_provider`, `BillingAddress`, `BillingSnapshot` | `billing-accounts.ts` |
   | `billing_interval`, `PlanLimits`, `PlanFeatures` | `plans.ts` |
   | `subscription_status` | `subscriptions.ts` |
   | `invoice_status`, `invoice_item_type` | `invoices.ts` |
   | `payment_status`, `payment_method_type`, `refund_status` | `payments.ts` |
   | `webhook_status` | `webhooks.ts` |

   `billing_provider` is the one cross-cutting enum; it sits in `billing-accounts.ts` and the
   other billing files import it from there.

2. **One helpers file.** `_helpers.ts` replaces the duplicated `ts` / `timestamptz` /
   `timestamps` / `pk` that existed in both `_helpers.ts` and `shared.ts`:
   `pk`, `timestamptz`, `createdAt`, `updatedAt`, `timestamps()`, `softDelete()`,
   `money`, `currency`, `isNormalized`, `matchesRegex`, `isUsername`.
   The old `ts()` is gone: use `timestamptz()`.

3. **Organizations are no longer created at sign-up** (see below).

4. Housekeeping: `otp.ts` and `refresh-token.ts` are exported from `index.ts`;
   `refreshTokensRelations` moved to `relations.ts`; relations for
   `organization_invitations` were added; the unused `organizationUsers` import in `users.ts`
   was removed; the duplicated username regex is now `isUsername()`.

## Sign-up and organization flow

```
sign up  ->  user + verified user_identifiers row   (NO organization)
         ->  redirect to /dashboard
dashboard:
  orgs = listMyOrganizations(db, userId)            // memberships.ts
  orgs.length === 0  -> onboarding "Create your organization"
  otherwise          -> organization switcher listing every membership
                        (owner / managed / portal) + "Create new organization" button
create (both places) -> createOrganizationForUser(db, input)   // onboarding.ts
                        ONE transaction: organization + owner membership + billing account
open an org          -> pickActiveOrganization(), then touchMembership(db, orgUserId)
```

- A user can **own several organizations** and also be managed / portal in others. Roles,
  permissions and subscriptions are per organization / per membership.
- Invited users (managed / portal) never create an organization: after accepting an
  invitation they simply have a membership and see it in the switcher.
- Schema change that supports this: `organization_users.last_accessed_at` and the index
  `ix_org_user_user_recent (user_id, last_accessed_at DESC)` (replaces `ix_org_user_user`).
  It orders the switcher and chooses the default organization after sign-in.
- Not in the schema, handle in the service: reserved org codes (`RESERVED_ORG_CODES`),
  an optional cap on organizations owned per user, and starting the trial / subscription
  right after `createOrganizationForUser`.

## Files

| File | Contents |
|---|---|
| `_helpers.ts` | shared columns and check helpers |
| `geo.ts` | currencies, timezones, countries, states, cities (unchanged) |
| `users.ts` | users, user_identifiers, user_providers |
| `otp.ts` | otps |
| `refresh-token.ts` | refresh_tokens |
| `organizations.ts` | organizations, organization_users, organization_invitations, `orgRef()` |
| `access-control.ts` | roles, role_permissions, organization_user_roles |
| `rbac.ts` | `can()`, `loadStatements()` |
| `memberships.ts` | `listMyOrganizations`, `needsOnboarding`, `pickActiveOrganization`, `touchMembership` |
| `onboarding.ts` | `createOrganizationForUser`, `RESERVED_ORG_CODES` |
| `billing-accounts.ts` | billing_accounts |
| `plans.ts` | plans, plan_prices |
| `subscriptions.ts` | subscriptions, subscription_events, `resolveEntitlements()` |
| `invoices.ts` | invoices, invoice_items, invoice_counters |
| `payments.ts` | payment_methods, payments, refunds |
| `webhooks.ts` | billing_events |
| `relations.ts` | all `relations()` |
| `index.ts` | barrel export + schema conventions |

Import order has no cycles: `_helpers` <- `geo`, `users` <- `organizations` <-
`access-control` / `billing-accounts` <- `plans` <- `subscriptions` <- `invoices` <- `payments`.

## Migrating an existing database

- Enum names and values are unchanged, so moving them between files generates **no SQL**.
- The only DB changes are `organization_users.last_accessed_at` (nullable) and the index swap.
  Run `drizzle-kit generate` and review.
- Code changes: replace imports from `./shared.js`, `./enums.js`, `./shared-types.js` with the
  owning file (table above) or `./_helpers.js`; replace `ts(` with `timestamptz(`.
- Delete `shared.ts`, `enums.ts`, `shared-types.ts`.

## Key conventions

- Money is integer minor units (bigint) + ISO-4217 currency, never float.
- Financial rows are never hard-deleted (FKs to organizations are RESTRICT).
- Tenant child rows carry `org_id` and use composite FKs `(org_id, parent_id)`.
- Plans and prices are immutable once sold; invoices are immutable after finalize.
- Webhooks are stored first and processed idempotently.

## Needs a custom migration (not expressible in Drizzle)

See the list at the top of `index.ts` (triggers for immutability, gap-free invoice numbers,
Row Level Security, append-only events, system role seeds). New note for RLS: add a policy
on `organization_users` that lets a user read **their own** rows across organizations,
otherwise the switcher query cannot see them.
