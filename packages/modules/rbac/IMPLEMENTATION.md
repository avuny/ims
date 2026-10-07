# Implementation Plan: RBAC Module (`@avuny/rbac`)

This module manages system and custom roles, role assignments to members, and provides the core capability to check user permissions across the system. It relies on the `@avuny/organizations` module for the concept of memberships.

## 1. Directory Structure

```text
packages/modules/rbac/
├─ package.json
├─ src/
│  ├─ index.ts
│  ├─ rbac.container.ts
│  ├─ repositories/
│  │  ├─ rbac-db.type.ts
│  │  ├─ role.repository.ts
│  │  └─ role-assignment.repository.ts
│  ├─ services/
│  │  ├─ role.service.ts
│  │  ├─ role-assignment.service.ts
│  │  └─ permission.service.ts
│  ├─ errors/
│  │  ├─ errors.ts
│  │  └─ errors-map.ts
│  └─ intl/locales/rbac/
│     ├─ en.json
│     └─ ar.json
```

## 2. Contracts Layer (`@avuny/contracts/src/rbac/`)
- `RoleResponse`, `CreateRoleInput`, `UpdateRoleInput`
- `AssignRoleInput` (orgUserId, roleId)

## 3. Repository Layer (`src/repositories/`)
- **`RoleRepository`**: Handles `roles` and `role_permissions` tables. `insert` (creates role and permissions in a transaction), `findSystemRoles` (`orgId IS NULL`), `findOrgRoles` (`orgId = tenant ID`).
- **`RoleAssignmentRepository`**: Handles `organization_user_roles` table. `assignRole` (inserts mapping), `unassignRole`.

## 4. Service Layer (`src/services/`)
- **`RoleService`**:
  - `createCustomRole`: Validates inputs and writes `roles` and `role_permissions` in a transaction.
  - `listRoles`: Returns both system roles and the tenant's custom roles.
- **`RoleAssignmentService`**:
  - `assignRole`: Assigns a role to a 'managed' user. Validates the role belongs to the same org or is a system role.
  - `unassignRole`: Removes a role from a user.
- **`PermissionService`**:
  - `checkPermission`: Interacts with `loadStatements` and `can(...)` from `packages/db/src/schema/saas/rbac.ts`. Consumed by the host app (middlewares) and other modules to verify user actions.

## 5. Error Handling
Defines error codes like `RBAC_ROLE_NOT_FOUND`, `RBAC_UNAUTHORIZED`, `RBAC_INVALID_ASSIGNMENT`. Maps them to HTTP statuses in `errors-map.ts`.

## 6. Testing
- `role.service.spec.ts` etc. testing permission evaluation, bounds checking (users can't assign cross-tenant roles), and invariants. Fully mocked repositories.
