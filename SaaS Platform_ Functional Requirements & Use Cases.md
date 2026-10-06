# SaaS Platform: Functional Requirements & Use Cases

Derived from `packages/db/src/schema/saas` (tables, constraints, and comment blocks), then refined with improved business rules.

**Tags on every requirement**

| Tag | Meaning |
| --- | --- |
| **\[S\]** | Directly stated or enforced by the schema or its comments |
| **\[N\]** | New rule I propose (schema has no support yet) |
| **\[C\]** | Changes or resolves something in the schema (see the *Schema Review* section) |

**Actors**: *Visitor* (not signed in) · *User* (any authenticated person) · *Owner* (one per organization) · *Managed Member* (staff) · *Portal User* (external customer/supplier) · *Platform Admin* (your support/finance staff) · *System* (scheduled jobs) · *Gateway* (Stripe/Paymob).

## Module Map

| # | Module | Main tables |
| --- | --- | --- |
| M1 | Registration & Verification | `otps`, `users`, `user_identifiers`, `organizations` |
| M2 | Identity & Identifiers | `users`, `user_identifiers`, `user_providers` |
| M3 | Authentication & Sessions | `refresh_tokens`, `user_identifiers`, `organization_users` |
| M4 | Account Security & Recovery | `otps`, `users`, `refresh_tokens` |
| M5 | Organizations (Tenants) | `organizations` |
| M6 | Membership & Invitations | `organization_users` (+ proposed `invitations`) |
| M7 | Access Control (RBAC) | `roles`, `role_permissions`, `organization_user_roles` |
| M8 | Plans & Pricing Catalog | `plans`, `plan_prices` |
| M9 | Subscriptions & Entitlements | `subscriptions`, `subscription_events` |
| M10 | Billing Account | `billing_accounts` |
| M11 | Invoicing | `invoices`, `invoice_items`, `invoice_counters` |
| M12 | Payments & Refunds | `payment_methods`, `payments`, `refunds` |
| M13 | Gateway Webhooks | `billing_events` |
| M14 | Platform Administration | all (via `is_platform_admin`) |
| M15 | Cross-cutting Requirements | audit, notifications, security, tenancy |

---

## M1. Registration & Verification

**Purpose**: create a verified person, their first organization, and the owner membership in one atomic step.

### Functional requirements

| ID | Requirement | Tag |
| --- | --- | --- |
| REG-01 | A visitor can sign up only after proving ownership of **both an email and a phone number** via OTP of type `SIGN_UP`. | S, N |
| REG-02 | Identifiers are normalized (trim, lowercase; phone in E.164 format) before any lookup or storage. | S, N |
| REG-03 | OTP codes are stored only as an HMAC hash with a server secret. OTPs are single-use (`consumed_at`), expire (default 5 min), and are invalid after 5 wrong attempts. | S |
| REG-04 | OTP abuse controls: resend cooldown (60 s), a new OTP invalidates the previous active one for the same identifier+type, max 5 sends/hour per identifier, and per-IP limits. | N |
| REG-05 | The OTP request response is identical whether or not the identifier already has an account (prevents account enumeration). If it already has one, the identifier receives an "you already have an account" message instead of a code. | N |
| REG-06 | After each OTP is verified, the server issues a short-lived signed **proof token** (e.g. 15 min) for that identifier. The final sign-up call must present both proofs. (`otps.identifier` is not an FK because the user does not exist yet.) | N |
| REG-07 | Final sign-up collects: name, password, organization name, organization `code`, country, default currency, timezone. | S |
| REG-08 | Organization `code` must match `^[a-z0-9][a-z0-9-]{2,30}$`, be unique (including soft-deleted orgs), not be in a reserved list (`admin`, `api`, `www`, ...), and is immutable. | S, N |
| REG-09 | Sign-up is **one transaction** that creates: user, 2 verified primary identifiers (email + phone), organization, `owner` membership, billing account (provider `manual`, legal name = org name, currency = default currency), and the initial subscription (trial if the default plan has `trial_days > 0`). | S, N |
| REG-10 | Password policy: minimum 8 characters, rejected if in a common/breached list, hashed with Argon2id. | N |
| REG-11 | Sign-up with Google/Facebook: provider-verified email counts as the verified email; the phone must still be verified by OTP. The password stays `NULL` until the user sets one. | S, N |
| REG-12 | After sign-up the user is signed in immediately, with the new owner membership as the active organization. | N |

### Use cases

**UC-REG-01: Register a new owner (email + phone)**

- **Actor**: Visitor · **Pre**: neither identifier belongs to an account.
- **Flow**: (1) Visitor enters email → system sends OTP (`SIGN_UP`). (2) Visitor enters code → system returns proof token for the email. (3) Repeat for phone. (4) Visitor fills name, password, organization details. (5) System validates both proofs, org code, password policy. (6) System creates all records in one transaction. (7) System issues tokens and opens the dashboard.
- **Alt**: wrong code (attempt counter +1; at 5 the OTP is dead, user must request a new one) · expired proof (restart that step) · org code taken (inline error, nothing is created).
- **Post**: user active; both identifiers verified and primary; org `active`; subscription `trialing` or `incomplete`.

**UC-REG-02: Request / resend an OTP**

- **Actor**: Visitor or User · **Pre**: rate limits not exceeded.
- **Flow**: System normalizes identifier → checks cooldown and hourly cap → invalidates older OTP → generates code, stores HMAC, sends through the channel matching the identifier type.
- **Alt**: cooldown active (respond with seconds remaining) · delivery fails (log, show a generic "try again").

**UC-REG-03: Register with Google**

- **Flow**: Visitor authenticates with Google → system receives provider id + verified email → asks for phone → OTP verifies phone → visitor enters org details → transaction creates user (no password), email identifier (verified, from provider), `user_providers` row, phone identifier, org, membership.
- **Alt**: Google email already belongs to an account → redirect to login and offer to link (see UC-AUTH-03).

---

## M2. Identity & Identifiers

**Purpose**: one global person with multiple ways to sign in, all using the same password.

### Functional requirements

| ID | Requirement | Tag |
| --- | --- | --- |
| IDN-01 | A user has one or more identifiers of type `EMAIL`, `PHONE`, `USERNAME`. Any **verified** identifier can be used with the same password to sign in. | S |
| IDN-02 | A user can add identifiers after sign-up. `EMAIL` and `PHONE` require OTP verification before they are saved. `USERNAME` is saved immediately (stored as verified at creation). Adding requires a recent password confirmation. | S, N |
| IDN-03 | An identifier is globally unique. To prevent squatting, an identifier is **claimed only once verified**. Unverified rows never block anyone else. | S, C |
| IDN-04 | Limits per user (configurable): up to 3 emails, 3 phones, 1 username. | N |
| IDN-05 | Exactly one **primary** per type (email, phone). The first verified one becomes primary; the user may switch. Notifications go to the primary. | S, N |
| IDN-06 | Removing an identifier needs password confirmation. The user cannot remove their **last verified email/phone**, and cannot remove a primary without choosing a replacement. | N |
| IDN-07 | Changing an email/phone = add new + verify + remove old. The old address gets a notification. | N |
| IDN-08 | Username rules: 3–31 chars, lowercase letters, digits, `.`, `_`, `-`. It must never look like an email or phone (no `@`, not purely digits, no leading `+`), is not in a reserved list, and can be changed at most once per 30 days. | S, N |
| IDN-09 | The user can list identifiers with type, verified status, primary flag, and last login time. | S |
| IDN-10 | A user can link Google/Facebook to a verified email identifier (`user_providers`). A `(provider, provider_id)` pair is linked to at most one account. | S |
| IDN-11 | Unlinking a provider is blocked when it would leave the user with no way to sign in (no password and no other method). | N |
| IDN-12 | Profile: name and avatar are editable. Contact email for notifications is derived from the primary verified email (the separate `users.contact_email` is retired). | S, C |
| IDN-13 | Account deactivation (`is_active = false`) is done by a platform admin or the user (self-deactivate). Soft delete sets `deleted_at`, releases identifiers for reuse, and anonymizes personal data after the retention period. Financial and audit rows keep pointing at the user. | S, N |
| IDN-14 | A user cannot delete their account while they are the **sole owner** of an organization that is not `closed`. They must transfer ownership or close the org first. | N |

### Use cases

**UC-IDN-01: Add a phone number later**

- **Actor**: User · **Pre**: signed in; fewer than 3 phones.
- **Flow**: User enters phone → confirms password → system sends OTP (`VERIFY_IDENTIFIER`) → user enters code → system inserts the identifier as verified (`is_verified = true`, `verified_at = now`), sets primary if first.
- **Alt**: phone already verified on another account → generic "cannot be used" message · OTP failure → nothing inserted.
- **Post**: user can now sign in with this phone and the same password.

**UC-IDN-02: Add a username**

- **Flow**: User enters username → system validates format, reserved list, uniqueness (global, across all identifier types) → inserts identifier type `USERNAME`.
- **Alt**: taken → suggest alternatives.

**UC-IDN-03: Remove an identifier**

- **Flow**: User picks identifier → confirms password → system checks it is not the last verified email/phone and not the only primary → deletes it → sends a security notification to the remaining primary identifiers.
- **Alt**: it is primary → user must pick a new primary first.

**UC-IDN-04: Link Google to an account**

- **Pre**: user has a verified email identifier. **Flow**: user starts Google flow → provider returns `provider_id` + email → system requires that the Google email equals one of the user's verified emails (or adds it via OTP) → inserts `user_providers`.

**UC-IDN-05: Delete my account**

- **Flow**: user requests deletion → system checks sole-owner rule (IDN-14) → confirms with password/OTP → revokes all sessions → deactivates memberships → sets `deleted_at`, frees identifiers → schedules anonymization.
- **Alt**: blocked with the list of organizations to transfer or close.

---

## M3. Authentication & Sessions

**Purpose**: sign in with any identifier, then work inside one organization at a time.

### Functional requirements

| ID | Requirement | Tag |
| --- | --- | --- |
| AUTH-01 | **Password login**: identifier (email / phone / username) + password. Only verified identifiers work. Wrong identifier and wrong password return the same generic error. | S, C |
| AUTH-02 | **OTP login**: a verified email/phone can receive an OTP of type `LOGIN` as a passwordless alternative. | S |
| AUTH-03 | **Social login**: matched by `(provider, provider_id)`. If the provider email matches an existing account that has not linked that provider, the user must first prove access to the account (password or OTP) before linking. Never auto-link by email alone. | S, N |
| AUTH-04 | Login is rejected when `users.is_active = false` or `deleted_at` is set. | S |
| AUTH-05 | **Brute-force protection**: count failures per identifier and per IP; progressive delay; temporary lock after 5 failures in 15 min; notify the account's primary email. | N |
| AUTH-06 | On success, update `users.last_login_at` and `user_identifiers.last_login_at` (the identifier actually used). | S |
| AUTH-07 | Issue a short-lived access token (≈15 min) and a refresh token. Only the **hash** of the refresh token is stored, with `user_agent`, `ip_address`, `expires_at`. | S |
| AUTH-08 | **Rotation**: every refresh revokes the used token and issues a new one in the same `family_id`. Using an already-revoked token = theft signal → revoke the **entire family** and notify the user. | S |
| AUTH-09 | **Organization context**: after authentication, if the user has one active membership it is selected automatically; if several, show a picker. The session carries `organization_users.id`, so one person has a separate context per org. Switching org does not require re-login. | S, N |
| AUTH-10 | Entering an organization is allowed only when the membership is active **and** the org is not `closed`. `suspended` orgs follow the suspension policy (M5). | S |
| AUTH-11 | Optional **org-scoped staff login** (`org code + username`) for managed/portal members who have no email or phone. See open decision D1. | S, C |
| AUTH-12 | Logout current device (revoke that token) and logout everywhere (revoke all of the user's tokens). | S, N |
| AUTH-13 | Active sessions screen: device/browser, IP, created, last used; user can revoke any session. | S, N |
| AUTH-14 | Platform admins must use 2FA. Impersonation (if offered) is read-only, time-boxed, and audited. | N |
| AUTH-15 | Tokens expire: refresh tokens (e.g. 30 days, sliding up to an absolute cap); expired rows are purged by a job (`expires_at` index). | S, N |

### Use cases

**UC-AUTH-01: Sign in with email/phone/username + password**

- **Actor**: Visitor · **Pre**: identifier verified, user active.
- **Flow**: (1) Visitor submits identifier + password. (2) System normalizes and looks up the identifier. (3) Checks lockout. (4) Verifies hash. (5) Updates last-login timestamps. (6) Resolves memberships → picks org context. (7) Creates refresh token family and returns tokens.
- **Alt**: wrong password (counter +1) · user has no password (offer OTP login or "set password") · locked (show retry time) · no active memberships (user lands on "create organization / pending invitations").
- **Post**: session bound to a membership.

**UC-AUTH-02: Sign in with OTP**

- **Flow**: visitor enters email/phone → system sends `LOGIN` OTP (generic response if unknown) → visitor enters code → system consumes OTP → continues from step 5 of UC-AUTH-01.

**UC-AUTH-03: Sign in with Google**

- **Flow**: Google returns `provider_id` → system finds `user_providers` row → resolves user → continue as UC-AUTH-01 step 5.
- **Alt**: not found but email matches an existing verified email → ask for password/OTP, then link · not found at all → offer sign-up (UC-REG-03).

**UC-AUTH-04: Refresh session**

- **Flow**: client sends refresh token → system hashes and finds it → not revoked, not expired → revokes it and issues a new one (same family) with a new access token that reloads current role permissions.
- **Alt**: token already revoked → revoke whole family, force re-login, notify user.

**UC-AUTH-05: Switch organization**

- **Pre**: user has ≥ 2 active memberships. **Flow**: user picks org → system validates membership/org status → issues a new access token for that `organization_users.id` (and updates the refresh token context).

**UC-AUTH-06: Review and revoke sessions**

- **Flow**: user opens "Devices" → system lists non-revoked, non-expired tokens grouped by family → user revokes one → system sets `revoked_at` for the family.

---

## M4. Account Security & Recovery

### Functional requirements

| ID | Requirement | Tag |
| --- | --- | --- |
| SEC-01 | **Forgot password**: user submits any verified identifier → OTP `FORGET_PASSWORD` goes to that email/phone (generic response if unknown) → after verification the system issues a one-time reset proof → user sets a new password. | S |
| SEC-02 | A successful reset or change **revokes all refresh tokens** of the user and sends a notification to email and phone. | N |
| SEC-03 | **Change password** requires the current password; other sessions are revoked, the current one is kept. | N |
| SEC-04 | **Set password** for users with `password_hash = NULL` (social, OTP-only, invited): allowed after OTP re-authentication. | S, N |
| SEC-05 | Recovery never verifies or alters other identifiers. Unverified identifiers cannot be used to recover. | N |
| SEC-06 | Security notifications: new-device login, password changed, identifier added/removed/primary changed, refresh-token reuse, account lock. | N |
| SEC-07 | Sensitive operations (change password, add/remove identifier, transfer ownership, close org) require re-authentication within the last 5–10 minutes. | N |
| SEC-08 | Optional TOTP/WebAuthn second factor (later phase; mandatory for platform admins). | N |

### Use cases

**UC-SEC-01: Reset a forgotten password**

- **Flow**: visitor opens "Forgot password" → enters identifier → receives OTP → enters code → system consumes OTP, issues a reset proof (10 min) → visitor sets a new password → system saves the hash, revokes all tokens, notifies.
- **Alt**: user has only a username (no email/phone verified on that username) → system asks them to choose a verified email/phone from the masked list of their identifiers.

**UC-SEC-02: Change password**

- **Flow**: user enters current + new password → system verifies, enforces policy → saves → revokes other sessions → notification.

**UC-SEC-03: Set a password for a social-only account**

- **Flow**: user chooses "Set password" → OTP to primary email or phone → user enters new password → saved. User can now sign in with any identifier + password.

---

## M5. Organizations (Tenants)

**Purpose**: the tenant boundary. Every business row hangs off `org_id`.

### Functional requirements

| ID | Requirement | Tag |
| --- | --- | --- |
| ORG-01 | An organization has `code` (public, immutable), `name`, `country`, `default_currency`, `timezone`, `status`. Creating one always creates its owner membership and billing account in the same transaction. | S |
| ORG-02 | An existing user can create **additional organizations**. Each has its own owner membership, subscription, and billing account. | N |
| ORG-03 | Owner can edit name, country, and timezone. `default_currency` can change only until the first invoice is issued (then it is frozen with the billing currency). | S, C |
| ORG-04 | Status lifecycle: `active` ⇄ `suspended` → `closed` (terminal). Every transition records who, when, and why. | S, N |
| ORG-05 | **Suspension** (by platform admin, or automatically for non-payment): blocks sign-in or makes the app read-only; owner can still reach Billing to fix payment. Reinstating returns the org to `active`. | S |
| ORG-06 | **Closing**: owner requests; requires no `open` invoices (pay or void them); cancels the subscription; deactivates all memberships; keeps data read-only for an export window (e.g. 30 days). | S, N |
| ORG-07 | Organizations are never hard-deleted. `deleted_at` is a soft delete and the `code` stays reserved. Financial FKs are `RESTRICT`. | S |
| ORG-08 | Tenant isolation: every tenant row carries `org_id`, child rows reference parents with composite FKs `(org_id, parent_id)`, and Row Level Security is applied on every `org_id` table. | S |
| ORG-09 | The owner sees an **Usage vs Limits** panel (managed users, portal users, branches, warehouses vs the effective entitlements). | N |

### Use cases

**UC-ORG-01: Create an additional organization**

- **Actor**: User · **Flow**: user chooses "New organization" → enters name, code, country, currency, timezone → system creates org + owner membership + billing account + subscription (trial) → user switches into it.
- **Alt**: code taken or reserved.

**UC-ORG-02: Suspend and reinstate an organization**

- **Actor**: Platform Admin (or System on non-payment). **Flow**: admin picks org → selects reason → status `suspended` → active sessions are downgraded to read-only/blocked → owner is notified. Reinstate: after payment or admin decision, status returns to `active`.
- **Post**: event written to the audit log.

**UC-ORG-03: Close an organization**

- **Actor**: Owner · **Pre**: re-authenticated, no open invoices.
- **Flow**: owner confirms by typing the org code → system cancels subscription, sets `closed`, deactivates members, schedules data purge/anonymization.
- **Alt**: open invoices exist → list them with "Pay now".

---

## M6. Membership & Invitations

**Purpose**: control who belongs to an organization and in what capacity (`owner`, `managed`, `portal`).

### Functional requirements

| ID | Requirement | Tag |
| --- | --- | --- |
| MEM-01 | Membership types: **owner** (exactly one, implicit full access, owns billing), **managed** (staff, access via roles, counts toward `managedUsers`), **portal** (external customer/supplier, no roles, access scoped to records linked to them, counts toward `portalUsers`). | S |
| MEM-02 | One membership per user per organization. | S |
| MEM-03 | Each membership has an org-unique `username` (3–31 chars, lowercase, `[a-z0-9._-]`). | S |
| MEM-04 | **Invitations**: owner (or a managed member with the permission) invites by email or phone, choosing type and (for managed) roles. The invitation has a single-use token and expires (7 days). It can be resent or revoked. | S, N |
| MEM-05 | If the invited identifier already belongs to a verified user, that user is **reused**: they accept with their existing password. Otherwise they register via the invitation (verify the invited identifier, set name + password). No duplicate users. | S |
| MEM-06 | **Direct creation** for staff without email/phone: owner creates the membership with a username and a one-time temporary password; first login forces a password change. | S, N |
| MEM-07 | **Plan limits** are checked at invitation acceptance and on creation: active managed count `<` `managedUsers`; active portal count `<` `portalUsers`; `null` means unlimited. Inactive members do not count. | S |
| MEM-08 | **Deactivate** (`is_active = false`) instead of deleting. Deactivation revokes that member's sessions for the org immediately and keeps all history. **Reactivate** is subject to plan limits. The owner cannot be deactivated. | S |
| MEM-09 | **Ownership transfer**: the owner nominates an active managed member and confirms with re-authentication. In one transaction: current owner becomes `managed` (and receives the system role "Administrator"), nominee becomes `owner`. Both are notified. This is the only operation allowed to change `type`. | S, C |
| MEM-10 | A managed member can **leave** an organization voluntarily; the owner cannot (must transfer first). | N |
| MEM-11 | Member directory: list, search, and filter by type, active state, role. | N |
| MEM-12 | A membership's `type` is otherwise immutable. Converting managed ⇄ portal is out of scope for v1. | S |

### Use cases

**UC-MEM-01: Invite a managed staff member**

- **Actor**: Owner · **Pre**: plan limit not reached.
- **Flow**: owner enters email/phone, picks type `managed`, ticks roles → system creates invitation and sends link/OTP → status "pending".
- **Alt**: limit reached → show "Upgrade plan" (M9) · identifier already a member → error.

**UC-MEM-02: Accept an invitation (new person)**

- **Actor**: Invitee · **Flow**: opens link → proves the invited identifier via OTP → enters name, password, chooses username → system creates user + identifier (verified) + membership + role assignments in one transaction → invitee lands in the organization.
- **Alt**: expired or revoked → "ask for a new invitation" · limit reached between invite and accept → blocked with a message to the owner.

**UC-MEM-03: Accept an invitation (existing user)**

- **Flow**: invitee signs in with their normal credentials → sees invitation → accepts → membership is created and the org appears in the organization picker.

**UC-MEM-04: Deactivate a member**

- **Actor**: Owner · **Flow**: owner picks member → confirms → `is_active = false` → refresh-token contexts for that membership are revoked → seat is freed.
- **Alt**: target is owner → blocked.

**UC-MEM-05: Transfer ownership**

- **Actor**: Owner · **Flow**: pick nominee → re-authenticate → nominee must confirm in-app → transaction swaps types → system notifies both and logs the event.
- **Alt**: nominee inactive or not managed → blocked.

**UC-MEM-06: Create a portal user for a customer**

- **Actor**: Owner/authorized staff · **Flow**: pick a customer record → enter identifier → send portal invitation → on acceptance a `portal` membership is created and linked to that record.
- **Alt**: `portalUsers` limit reached.

---

## M7. Access Control (RBAC)

**Purpose**: IAM-style permission statements grouped into roles, assigned to managed members.

### Functional requirements

| ID | Requirement | Tag |
| --- | --- | --- |
| RBAC-01 | **System roles** (`org_id IS NULL`) are seeded by the platform (e.g. Administrator, Viewer, Cashier, Accountant, Warehouse Clerk), read-only, visible to every organization. | S |
| RBAC-02 | **Custom roles** (`org_id = org`) can be created only if the effective entitlement `customRoles` is on. Role names are 2–60 characters, unique inside the org (and unique among system roles). A new role can start from scratch or be cloned from an existing one. | S, N |
| RBAC-03 | A permission statement = `effect` (allow/deny) + `resource` + `action` + `resource_id`. Tokens are lowercase `[a-z][a-z0-9_]*` or `*`. `resource_id` defaults to `*` and can narrow to one record. | S |
| RBAC-04 | **Evaluation**: owner → always allowed (plan features and org status still checked). Portal → never via roles (authorized by record ownership). Managed → any matching **deny** wins; otherwise any matching **allow**; otherwise denied. A collection-level check (no record id) is satisfied only by `resource_id = *`. | S |
| RBAC-05 | **Assignment**: roles are assigned to **managed** members only (many-to-many). Effective permissions = union of all assigned roles. The role must be a system role or belong to the same org. `assigned_by_user_id` is recorded. | S |
| RBAC-06 | A role that is still assigned **cannot be deleted**; the UI shows who holds it and requires unassigning first. Deleting an unassigned custom role removes its statements. | S |
| RBAC-07 | The role editor writes one statement per ticked box; duplicates are impossible (unique role+effect+resource+action+id). | S |
| RBAC-08 | A **permission catalog** (registry of valid resources and actions per module) feeds the role editor, so admins cannot type invalid tokens. | N |
| RBAC-09 | **Escalation guard**: a managed member who can manage roles may grant only permissions they hold themselves. By default only the owner manages roles. | N |
| RBAC-10 | Permission changes take effect on the next access-token refresh (≤ 15 min) or immediately if the permission cache is invalidated. | S, N |
| RBAC-11 | Billing resources (subscription, invoices, payment methods, billing account) are owner-only by default and can be delegated with explicit permissions. | S, N |
| RBAC-12 | If an organization loses the `customRoles` feature (downgrade), existing custom roles keep working but cannot be created or edited. | N |
| RBAC-13 | Every role, statement, and assignment change is audit-logged. | N |

### Use cases

**UC-RBAC-01: Create a custom role**

- **Actor**: Owner · **Pre**: `customRoles` enabled.
- **Flow**: owner opens Roles → "New role" (blank or clone "Cashier") → names it → ticks permissions (e.g. allow read `invoice` `*`, allow update `warehouse` `8f3c…`, deny delete `*` `*`) → saves → system stores one statement per box.
- **Alt**: feature off → upsell to a higher plan · name already exists → validation error.

**UC-RBAC-02: Assign roles to a staff member**

- **Flow**: owner opens member → ticks "Cashier" and "Warehouse clerk" → system validates type is managed and roles are visible to the org → inserts assignments with `assigned_by`.

**UC-RBAC-03: Delete a role that is in use**

- **Flow**: owner clicks delete → system finds assignments → refuses and lists the members → owner unassigns them (or reassigns) → deletes the role.

**UC-RBAC-04: Authorize a request** (system flow)

- **Flow**: request arrives with membership id → load statements of all roles (system + org) → evaluate `can(member, action, resource, id?)` → deny wins → return 403 when no allow matches.

---

## M8. Plans & Pricing Catalog

### Functional requirements

| ID | Requirement | Tag |
| --- | --- | --- |
| PLN-01 | A plan defines limits (`managedUsers`, `branches`, `warehouses`, `portalUsers`; `null` = unlimited), feature flags (`multiWarehouse`, `customRoles`, `apiAccess`, `auditExport`, `prioritySupport`), `trial_days`, `is_public`, `is_active`, `sort_order`. | S |
| PLN-02 | Prices live in `plan_prices`: one row per plan × currency × interval (`month`/`year`) × interval count, in integer minor units. At most one **active** price per combination. | S |
| PLN-03 | Plans and prices are **immutable once sold**. Changes = new plan version (e.g. `pro_v2`) or a new price row; the old one is deactivated and existing subscribers keep their terms (grandfathering). | S |
| PLN-04 | Public pricing page shows active, public plans with prices in the visitor's currency (fallback to org default), monthly/yearly toggle, and the saving for yearly. | S, N |
| PLN-05 | **Private/custom plans** (`is_public = false`) are assigned only by platform admins for negotiated deals. | S |
| PLN-06 | Deactivating a plan stops new sales; existing subscriptions keep working. | S |
| PLN-07 | Each gateway's price id is mapped through `provider_refs`; adding a gateway needs no schema change. | S |
| PLN-08 | **Bulk migration**: admin selects a source plan/price and a target; subscribers move at their next renewal with a notification (no mid-period surprise). | S, N |

### Use cases

**UC-PLN-01: Publish a new plan with prices**

- **Actor**: Platform Admin · **Flow**: create plan (code, limits, features, trial) → add prices (USD monthly 49.00, USD yearly 490.00, EGP monthly 2,500) → register gateway price ids → mark active/public.
- **Alt**: duplicate active price for the same combination → rejected.

**UC-PLN-02: Release a new version and migrate subscribers**

- **Flow**: admin clones `pro` → `pro_v2` with new limits → deactivates old sale → schedules migration → system moves subscriptions at renewal and writes `plan_changed` events.

**UC-PLN-03: Browse pricing**

- **Actor**: Visitor · **Flow**: opens pricing page → sees public plans → picks a plan → goes to sign-up/checkout.

---

## M9. Subscriptions & Entitlements

### Functional requirements

| ID | Requirement | Tag |
| --- | --- | --- |
| SUB-01 | At most **one live subscription per organization** (any status except `canceled`/`expired`). | S |
| SUB-02 | **Start**: checkout creates the subscription as `trialing` (plan has `trial_days`) or `incomplete`; first successful payment → `active`. | S |
| SUB-03 | **Trial end**: reminders at 7, 3, and 1 day. At the end an invoice is generated and charged to the default payment method. If it cannot be paid the subscription follows the failed-payment path. | S, N |
| SUB-04 | **Renewal job** runs before `current_period_end`: creates a draft invoice → finalizes → charges → on payment advances `current_period_start/end`. The unique invoice per `(subscription, period_start)` makes reruns safe. | S |
| SUB-05 | **Failed payment**: `past_due`, `past_due_since` set, dunning retries (suggest day 1, 3, 5, 7), grace period (suggest 7 days) with full access, then **read-only**, then `expired` when retries are exhausted. Successful payment at any point returns to `active` and restores access. | S, N |
| SUB-06 | **Upgrade**: applied immediately; a `proration` invoice item charges the difference for the rest of the period; new entitlements apply at once. | S |
| SUB-07 | **Downgrade**: stored in `pending_plan_price_id`, applied at period end. The system blocks scheduling if current usage exceeds the target limits (shows what to reduce) and re-checks at application time. | S, N |
| SUB-08 | **Cancel**: `cancel_at_period_end = true` keeps access until the period ends, then `canceled` (terminal). The owner can undo before the end. Re-subscribing creates a **new** subscription row. | S |
| SUB-09 | **Pause/resume** (`paused`): platform admin (or owner once per year) pauses; org is read-only, no invoices are generated; resume restarts the billing period. | S, N |
| SUB-10 | **Custom deals**: platform admin sets `limits_override` / `features_override` with a recorded reason. Effective entitlements = plan defaults merged with overrides (`resolveEntitlements`). | S |
| SUB-11 | **Entitlement enforcement** is a single service: before creating a managed/portal member, branch, or warehouse, and before using a gated feature, check effective limits/features. Existing records above the limit are never deleted. They stay, but creating more is blocked. | S, N |
| SUB-12 | Every lifecycle change (`created`, `status_changed`, `plan_changed`, `renewed`, `canceled`, `resumed`) writes an append-only **subscription event** in the same transaction, with the actor (`NULL` for system/webhooks). | S |
| SUB-13 | Optional seat pricing via `quantity` (> 0). | S |
| SUB-14 | Notifications: trial ending, renewal upcoming, payment failed (each retry), grace ending, read-only started, canceled, expired. | N |

**Access by subscription status**

| Status | Organization access |
| --- | --- |
| `incomplete` | Onboarding and billing screens only |
| `trialing`, `active` | Full access within entitlements |
| `past_due` | Full during grace period, then read-only; billing always reachable |
| `paused` | Read-only |
| `canceled`, `expired` | Read-only/export window, then the org is suspended |

### Use cases

**UC-SUB-01: Start a trial**

- **Actor**: Owner · **Flow**: pick plan/price at sign-up → system creates `trialing` subscription (`trial_ends_at = now + trial_days`), writes `created` event → org gets the plan's entitlements.

**UC-SUB-02: Upgrade mid-cycle**

- **Flow**: owner picks a higher plan → system shows proration preview → owner confirms → `plan_price_id` changes → draft invoice with `proration` line (+ credit for unused time) is finalized and charged → `plan_changed` event.
- **Alt**: payment fails → upgrade rolls back, plan unchanged.

**UC-SUB-03: Schedule a downgrade**

- **Flow**: owner picks a lower plan → system checks usage vs target limits → if OK sets `pending_plan_price_id` → at period end the renewal job switches price and bills the lower amount.
- **Alt**: usage too high (e.g. 12 managed users vs limit 5) → blocked with the list of what to reduce.

**UC-SUB-04: Cancel at period end**

- **Flow**: owner clicks cancel → confirms → `cancel_at_period_end = true`, `canceled_at` set → at period end status `canceled`, `ended_at` set.
- **Alt**: owner clicks "keep subscription" before period end → flag cleared, `resumed` event.

**UC-SUB-05: Payment failure and recovery**

- **Flow**: renewal charge fails → `past_due` + `past_due_since` → retries per schedule with emails → grace expires → org read-only → owner updates card and pays → payment succeeds → `active`, period advanced, access restored.
- **Alt**: all retries fail → `expired`, invoice `uncollectible` (admin decision), org suspended.

**UC-SUB-06: Grant a custom limit**

- **Actor**: Platform Admin · **Flow**: opens subscription → sets `limits_override` (e.g. `managedUsers: 25`) with reason → saved → entitlements resolve immediately → event + audit log.

---

## M10. Billing Account

### Functional requirements

| ID | Requirement | Tag |
| --- | --- | --- |
| BAC-01 | Exactly one billing account per organization, created with the organization (provider `manual`). | S |
| BAC-02 | Owner (or a user with billing permission) edits legal name, billing email, tax id, and address. Edits never change issued invoices, because the details are snapshotted at finalize. | S |
| BAC-03 | Billing `currency` is chosen before the first invoice and **frozen** once the first invoice is issued. | S |
| BAC-04 | Linking a gateway stores `provider_customer_id`; unique per provider. | S |
| BAC-05 | Before the first non-trial invoice can be finalized, legal name, billing email, and country must be filled; the tax id is validated by country format. | N |
| BAC-06 | Gateway selection rule by country/currency (e.g. Paymob for EGP, Stripe for USD/EUR); platform config, overridable per org by admin. | N |
| BAC-07 | Invoice copies are emailed to the billing email (and optionally extra recipients). | N |

**UC-BAC-01: Complete billing details**: Owner opens Billing → fills legal name, email, tax id, address → system validates and saves → if the org has a draft invoice waiting, it can now be finalized.

**UC-BAC-02: Link a payment gateway**: Owner adds a card through the gateway's hosted form → system creates/links the gateway customer → saves `provider_customer_id` and the tokenized method (see M12).

---

## M11. Invoicing

### Functional requirements

| ID | Requirement | Tag |
| --- | --- | --- |
| INV-01 | Invoices are created as **draft** (by the renewal job or an admin) with line items. Draft totals are editable and `number` is `NULL`. | S |
| INV-02 | Item types: `subscription` (plan charge), `proration` (upgrade, may be negative for unused time), `usage` (metered extras), `adjustment` (manual credit/discount, negative). | S |
| INV-03 | Totals: `total = subtotal − discount_total + tax_total`; header totals must equal the sum of lines (checked at finalize); `amount_paid` is between 0 and `total`; `amount_due` is generated (`total − amount_paid`). | S |
| INV-04 | **Finalize** (draft → open) in ONE transaction: allocate a gap-free number from `invoice_counters` (`INV-2026-000123`), freeze `billing_snapshot`, set `issued_at` and `due_at`. After this the invoice and items are immutable. | S |
| INV-05 | Numbers are platform-wide per `(series, year)`. A rolled-back finalize leaves no gap. | S |
| INV-06 | **Collection**: an automatic gateway charge or a recorded manual payment (M12). Partial payments are allowed. When `amount_paid = total` → `paid`, `paid_at` set. | S |
| INV-07 | **Dunning**: `attempt_count` and `next_attempt_at` drive retries; stops when the invoice is paid or void. | S |
| INV-08 | **Void**: mistakes are never edited. An open invoice with no successful payments can be voided (reason + `voided_at`) and replaced by a new one. A voided invoice frees its billing period for re-invoicing. | S |
| INV-09 | **Uncollectible**: admin marks debt that will not be collected. Later payment is still accepted and moves it to `paid`. | S, N |
| INV-10 | A **paid** invoice is never voided. Corrections use a **credit note** (new document, negative, linked to the original) and, if money goes back, a refund. | N |
| INV-11 | Owner (or billing permission) lists invoices, filters by status/date, and downloads PDF or opens the hosted page. | S |
| INV-12 | One invoice per `(subscription, period_start)` unless voided, so a job that runs twice never double-bills. | S |
| INV-13 | Tax handling: tax rate rules per country (e.g. VAT), shown per line and in totals; invoice stores the rate used. | N |
| INV-14 | Invoice currency = billing account currency. | S |

**Invoice status transitions**

| From | To | Trigger |
| --- | --- | --- |
| draft | open | Finalize (number allocated) |
| draft | (deleted) | Discard (only drafts can be deleted) |
| open | paid | `amount_paid` reaches `total` |
| open | void | Admin/owner voids (no successful payments) |
| open | uncollectible | Admin after dunning exhausted |
| uncollectible | paid | Late payment received |
| paid, void | none | Terminal |

### Use cases

**UC-INV-01: Generate a renewal invoice** (System)

- **Flow**: job selects subscriptions near period end → creates a draft with a `subscription` line (+ pending downgrade/proration lines) → verifies totals → finalizes in one transaction → triggers a payment attempt.
- **Alt**: invoice for that period already exists → skip (idempotent).

**UC-INV-02: Finalize an invoice**

- **Pre**: billing account complete. **Flow**: lock invoice → validate line sums → increment counter row → write `number`, `billing_snapshot`, `issued_at`, `due_at`, status `open` → commit.
- **Alt**: validation fails → stays draft, error to admin.

**UC-INV-03: Void and reissue**

- **Actor**: Platform Admin/Finance · **Flow**: open invoice with a mistake → void with reason → create corrected draft for the same period → finalize.
- **Alt**: invoice has a payment → refund first, or issue a credit note.

**UC-INV-04: Download my invoice**

- **Actor**: Owner · **Flow**: open Billing → Invoices → pick one → download PDF / open hosted page.

---

## M12. Payments & Refunds

### Functional requirements

| ID | Requirement | Tag |
| --- | --- | --- |
| PAY-01 | **Payment methods** store only gateway tokens plus display data (brand, last4, expiry). Never PAN/CVV. | S |
| PAY-02 | Exactly one **default** method per organization; removing a method is a soft delete. A default method cannot be removed while a gateway-billed subscription is active, unless replaced. | S, N |
| PAY-03 | A reminder is sent 30 and 7 days before the default card expires. | N |
| PAY-04 | **Gateway payment**: create a `pending` payment with an `idempotency_key`; customer may go through `requires_action` (3-D Secure); the webhook marks it `succeeded` or `failed` with `failure_code`/`failure_message`. | S |
| PAY-05 | **Manual payment** (bank transfer, cash): owner declares a transfer with reference and proof upload → payment `pending` → finance verifies against the bank statement → `succeeded` with `reference` and `recorded_by_user_id`. Finance can also record one directly. | S, N |
| PAY-06 | On success, in the same transaction `invoices.amount_paid` increases; the invoice becomes `paid` when fully covered. A payment cannot exceed the invoice's amount due. | S, N |
| PAY-07 | Payment `amount > 0`; `refunded_amount` stays between 0 and `amount`. Payments are never hard-deleted. | S |
| PAY-08 | **Refund**: full or partial, with a reason, created by finance/admin. It starts `pending`, then `succeeded` or `failed`. The refund service locks the payment row, so the sum of successful refunds never exceeds the payment. | S |
| PAY-09 | On refund success `payments.refunded_amount` increases in the same transaction; the invoice stays `paid` and a credit note documents it (see INV-10). | S, N |
| PAY-10 | Refunds above a threshold need a second approver (four-eyes). | N |
| PAY-11 | Owner sees payment and refund history, with receipt download. | N |
| PAY-12 | Daily reconciliation report: gateway events vs local payments (missing, duplicated, amount mismatch). | N |

### Use cases

**UC-PAY-01: Pay an invoice by card**

- **Actor**: Owner · **Flow**: opens an open invoice → picks saved card or adds a new one via the gateway form → system creates a `pending` payment with an idempotency key → (3-D Secure if needed) → gateway webhook confirms → payment `succeeded`, invoice `paid`, subscription advances/reactivates.
- **Alt**: card declined → `failed`, reason shown, owner may retry with another method.

**UC-PAY-02: Pay by bank transfer**

- **Flow**: owner chooses "Bank transfer" → sees bank details and the invoice number as reference → uploads proof → system creates `pending` payment → finance confirms → `succeeded` → invoice `paid`.
- **Alt**: finance rejects (amount/reference mismatch) → payment `failed` with note, owner notified.

**UC-PAY-03: Add or change the default card**

- **Flow**: owner opens hosted form → gateway returns token → system stores method → sets default (previous default unset in same transaction).

**UC-PAY-04: Issue a refund**

- **Actor**: Finance/Admin · **Flow**: opens payment → enters amount (≤ remaining) and reason → system locks payment, creates `pending` refund → gateway or manual process confirms → `succeeded`, `refunded_amount` updated → customer notified.
- **Alt**: gateway failure → `failed`, no change to payment.

---

## M13. Gateway Webhooks

### Functional requirements

| ID | Requirement | Tag |
| --- | --- | --- |
| WHK-01 | The endpoint verifies the gateway **signature**, stores the event with `ON CONFLICT (provider, event_id) DO NOTHING`, and returns 200 immediately. | S |
| WHK-02 | A worker processes `received`/`failed` events idempotently, then marks them `processed`, or `ignored` for irrelevant types. | S |
| WHK-03 | Failures record `last_error`, increment `attempts`, and retry with exponential backoff. After N attempts the event is escalated to an alert (dead-letter). | S, N |
| WHK-04 | Raw payloads are kept so an event can be **replayed** by an admin after a bug fix. | S |
| WHK-05 | The worker resolves the organization from provider ids (customer, payment, invoice, subscription) and stores it on the event once known. | N |
| WHK-06 | Handlers tolerate out-of-order and duplicate events (state transitions check current status). | N |
| WHK-07 | Operations view: counts of pending/failed events and age of the oldest. | N |
| WHK-08 | Retention: processed payloads older than 12 months are archived or purged. | N |

**UC-WHK-01: Process a "payment succeeded" webhook**: Gateway posts event → endpoint verifies signature, inserts (duplicate ignored), returns 200 → worker loads payment by `provider_payment_id` → if not already `succeeded`, updates payment, invoice, subscription in one transaction → marks event `processed`.

**UC-WHK-02: Replay a failed event**: Admin opens failed events → fixes root cause → clicks Replay → status back to `received` → worker re-runs idempotently.

---

## M14. Platform Administration

### Functional requirements

| ID | Requirement | Tag |
| --- | --- | --- |
| ADM-01 | Platform staff are users with `is_platform_admin = true`, usually with no memberships in customer orgs, working in a **separate admin console**. | S |
| ADM-02 | Admin tiers: **Support** (read org, subscription timeline, invoices; read-only impersonation), **Finance** (record manual payments, void, uncollectible, refunds), **Super admin** (plans, overrides, suspensions, system roles). | N |
| ADM-03 | Organization management: search by code/name/email, view members and usage, suspend/reinstate/close with a mandatory reason. | S |
| ADM-04 | Catalog management: plans, prices, migrations (M8). Overrides and custom deals (M9). | S |
| ADM-05 | Manual-payment verification and refunds (M12). | S |
| ADM-06 | Seeding and updating **system roles** and the permission catalog. | S |
| ADM-07 | Every admin action is audit-logged with actor, target, before/after, reason. Admin accounts require 2FA. | N |
| ADM-08 | Business dashboard: trials, MRR/ARR, churn, failed payments, expiring subscriptions (derived from `subscription_events`, invoices, payments). | N |

**UC-ADM-01: Investigate "why was this account suspended?"**: Support searches the org → opens subscription timeline (events with actor/system) → sees `past_due` → `expired` → reads the audit log entry for suspension → replies to customer.

**UC-ADM-02: Record a manual payment**: Finance picks the open invoice → enters amount, bank reference, received date → payment `succeeded` with `recorded_by_user_id` → invoice `paid` → subscription reactivated if it was `past_due`.

---

## M15. Cross-cutting Requirements

| ID | Requirement | Tag |
| --- | --- | --- |
| X-01 | **Audit log**: append-only record (`org_id`, actor, action, entity, before/after, IP, time) for identity, membership, role, billing, and admin actions. Required for the `auditExport` feature. | N |
| X-02 | **Notifications**: templated, multi-language, via email and SMS, with user preferences for non-critical messages. Security and billing messages cannot be disabled. | N |
| X-03 | **Row Level Security** on every `org_id` table (special cases: `roles` allow `org_id IS NULL OR current org`; `role_permissions` through `roles`). No RLS on `users`, plans, prices, counters, `billing_events`. | S |
| X-04 | **Money** is integer minor units + ISO-4217 currency; never floats. | S |
| X-05 | **Immutability** guarantees (triggers): org `code`; membership `org_id/user_id/type`; finalized invoices and items; sold plans and prices; billing currency after first invoice; `subscription_events` append-only. | S |
| X-06 | **Rate limiting** on OTP, login, password reset, and invitation endpoints. | N |
| X-07 | **Time**: all timestamps in UTC; billing periods and reminders displayed in the org's timezone. | S |
| X-08 | **Idempotency** for payment creation, renewal jobs, and webhooks. | S |
| X-09 | **Privacy**: users can export their data; deletion follows IDN-13; OTPs and expired tokens are purged by jobs. | N |
| X-10 | **Cleanup jobs**: expired OTPs, expired/revoked refresh tokens, stale invitations, processed webhook payloads. | N |

---

## Schema Review: Issues Found & Recommended Changes

| # | Finding | Recommendation |
| --- | --- | --- |
| 1 | `index.ts` does not export `otp.ts`, `refresh-token.ts`, or `shared.ts`. | Export them (resolve the name clash in #2 first). |
| 2 | `_helpers.ts` and `shared.ts` both define `pk` and `timestamps`; `users.ts` imports from both. | Merge into one helpers file. Move enums to `enums.ts`. |
| 3 | **Two login models**: `users.ts` comment says sign-in is `org code + username` (username on the membership) and `contact_email` is non-unique, but `user_identifiers` makes email/phone/username **globally unique** logins. | Choose one primary model (see D1). Recommended: global identifier login → organization picker. |
| 4 | `users.contact_email` duplicates the primary email identifier. | Drop it; read the primary verified email identifier. |
| 5 | `organization_users.type` is "immutable (trigger)" yet ownership transfer is described as "update this row's type". | Allow type change only inside a privileged transfer function; keep the unique-owner index (demote old owner first, then promote). |
| 6 | Membership "invite" is described, but there is **no invitations table**. | Add `invitations` (org, identifier, type, role ids, token hash, expires, status, invited_by). |
| 7 | `otp_type` has only `SIGN_UP`, `LOGIN`, `FORGET_PASSWORD`. Adding an identifier later and sensitive re-auth have no type. | Add `VERIFY_IDENTIFIER` and `REAUTH`. Add a delivery `channel` column. |
| 8 | After OTP verification there is nowhere to hold "verified" state before sign-up completes. | Use signed proof tokens (stateless) or a `verification_tickets` table. |
| 9 | `user_identifiers.identifier` is globally unique even when unverified (squatting risk). | Make uniqueness apply to **verified** rows, or insert only after verification. |
| 10 | No "one primary per type" constraint on identifiers. | Partial unique index on `(user_id, identifier_type) WHERE is_primary`. |
| 11 | `isNormalized` only lowercases and trims. Phones are not validated, and a username could collide with an email/phone pattern. | Add type-specific checks (E.164 for phone, email shape, username regex without `@`/leading `+`). |
| 12 | `USERNAME` identifiers need `is_verified` because of the consistency check. | Document the rule: usernames are stored as verified at creation. |
| 13 | `refresh_tokens` has no org context, last-used time, device label, or revoke reason. | Add `org_user_id`, `last_used_at`, `revoked_reason`, `replaced_by_id`. |
| 14 | No brute-force tracking. | Add `login_attempts` (identifier, ip, success, at) or counters + `locked_until`. |
| 15 | `organizations` has no suspension/closure metadata. | Add `suspended_at`, `suspended_reason`, `closed_at`, plus a status history table (or rely on audit log). |
| 16 | No audit log, although the plan feature `auditExport` exists. | Add `audit_logs`. |
| 17 | `subscription_events.type` is free text. | Convert to an enum. Add `grace_ends_at` on subscriptions for clarity. |
| 18 | Invoice items have type `usage` but there is no usage metering table; `discount_total` exists but there are no coupons; `tax_total` has no tax-rate rules. | Add `usage_records`, `coupons`/`discounts`, `tax_rates` when needed. |
| 19 | No credit notes: refunds do not adjust the invoice. | Add `credit_notes` (+ lines) linked to invoices. |
| 20 | `payments` has no proof/attachment for manual transfers and no overpayment/credit-balance handling. | Add `payment_proofs` (file ref) and reject overpayments (v1). |
| 21 | `billing_events` has no `org_id` even after processing. | Add nullable `org_id` filled by the worker. |
| 22 | Plan limits mention `branches` and `warehouses`, which are not in this schema (ERP domain). | Define an entitlement-check interface the ERP modules call. |
| 23 | `refresh_tokens.user_id` cascades on delete while users are soft-deleted. | Fine; on soft delete explicitly revoke all tokens. |

## Open Decisions

| ID | Decision | Suggested default |
| --- | --- | --- |
| D1 | Login model: global identifier + org picker, or `org code + username`, or both | Global identifier as the main path; org-code login only for staff without email/phone |
| D2 | Must every user have both email **and** phone, or at least one? | Both at sign-up (as you described); only one required for invited staff |
| D3 | Does a trial require a payment method up front? | No; reminders instead |
| D4 | Grace period and dunning schedule | 7 days grace, retries on day 1/3/5/7 |
| D5 | After a downgrade, what happens to usage above the new limits? | Block the downgrade until usage fits |
| D6 | Refund approval threshold for four-eyes | Set per currency, e.g. above 100 USD |
| D7 | Can an owner pause their own subscription? | Once per year, max 3 months |