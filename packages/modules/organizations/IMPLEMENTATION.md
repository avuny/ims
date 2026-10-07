# Implementation Plan: Organizations Module (`@avuny/organizations`)

This module handles the core multi-tenancy lifecycle: Organization creation, memberships (the organization switcher), and invitations. It delegates authorization and roles to the `@avuny/rbac` module.

## 1. Directory Structure

```text
packages/modules/organizations/
├─ package.json
├─ src/
│  ├─ index.ts
│  ├─ organization.container.ts
│  ├─ repositories/
│  │  ├─ organization-db.type.ts
│  │  ├─ organization.repository.ts
│  │  ├─ organization-user.repository.ts
│  │  └─ organization-invitation.repository.ts
│  ├─ services/
│  │  ├─ organization.service.ts
│  │  ├─ organization-user.service.ts
│  │  └─ organization-invitation.service.ts
│  ├─ errors/
│  │  ├─ errors.ts
│  │  └─ errors-map.ts
│  └─ intl/locales/organization/
│     ├─ en.json
│     └─ ar.json
```

## 2. Contracts Layer (`@avuny/contracts/src/organizations/`)
- `OrganizationResponse`, `CreateOrganizationInput`, `UpdateOrganizationInput`
- `MemberResponse`, `ListMembersResponse`, `UpdateMemberInput`
- `InvitationResponse`, `InviteMemberInput`, `AcceptInvitationInput`

## 3. Repository Layer (`src/repositories/`)
- **`OrganizationRepository`**: Handles `organizations` table. `insert`, `findById`, `findByCode`, `update`.
- **`OrganizationUserRepository`**: Handles `organization_users` table. `insert` (for owners/accepted invites), `findByUserId` (for switcher), `update` (active status, last accessed).
- **`OrganizationInvitationRepository`**: Handles `organization_invitations` table. `insert` (generating `tokenHash`), `findByTokenHash`, `updateStatus`.

## 4. Service Layer (`src/services/`)
- **`OrganizationService`**:
  - `create`: Wraps `repo.insert` inside a transaction. Creates the org, `organization_users` row ('owner'), and triggers billing account creation if needed.
  - `update`: Mutates org attributes (name, status).
- **`OrganizationUserService`**:
  - `transferOwnership`: Atomic transaction to swap owner/managed types between two users. Enforces `ux_org_one_owner`.
  - `listMyOrganizations`: Returns active memberships for the user, sorted by last accessed.
  - `touchMembership`: Updates `lastAccessedAt`.
- **`OrganizationInvitationService`**:
  - `invite`: Creates pending invites. Validates inviter is not inviting an 'owner'. Checks for verified existing users.
  - `accept`: Validates token, creates/reuses user, adds `organization_users` row, marks invite 'accepted'.

## 5. Error Handling
Defines error codes like `ORGANIZATION_CREATE_CODE_TAKEN`, `ORGANIZATION_INVITE_NOT_FOUND`, `ORGANIZATION_INVITE_EXPIRED`. Maps them to HTTP statuses in `errors-map.ts`.

## 6. Testing
- `organization.service.spec.ts` etc. testing success, failure branches, and transaction invariants. Fully mocked repositories.
