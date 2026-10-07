# AGENTS.md — `packages/modules/`

Rules for AI coding agents working in `packages/modules/*` of the `@avuny` monorepo
(Turborepo · pnpm workspaces · TypeScript ESM · Drizzle · Hono · Zod · Vitest · i18next).

**Reference module: `users/` (`@avuny/users`).** The conventions below are taken from it. When unsure, open the
matching file there and mirror it; where the reference contradicts itself, §12 says which pattern wins.
A closer `AGENTS.md` / `CLAUDE.md` inside a module overrides this file.

Placeholders: `<domain>` / `<Domain>` is the domain prefix used in names. The reference's prefix is `auth` / `Auth`
(`AuthService`, `AuthDatabase`, `createAuthContainer`, `AUTH_*` codes); a `billing` module would use `billing` /
`Billing` / `BILLING_*`. `Foo` in snippets stands for any entity.

If you change a convention, update this file in the same change.

---

## 1. Architecture

| Layer | Does | Must not |
| --- | --- | --- |
| Repositories | All database access (Drizzle); return rows or `null` | hold business rules, return `Result`, know about HTTP or i18n |
| Services | Business logic; return `Result` via `ok` / `fail` | write SQL, import Drizzle, touch HTTP objects |
| Container | Constructor-injection wiring: `create<Domain>Container(db, config)` | read `process.env`, create DB clients, keep global state |
| Middlewares | The only place framework (Hono) code lives | contain business logic |
| Errors + intl | Typed error codes → HTTP status → localized message | |
| Utils | Small internal helpers | be exported from `index.ts` |

Owned by other packages — import them, never redefine them inside a module:

- Tables, enums, DB types, migrations, base `DrizzleRepository` → `@avuny/db`
- Request/response Zod schemas and their inferred types → `@avuny/contracts` (folder `packages/modules/contract`)
- `ok`, `fail`, `Result`, `ErrorMeta` → `@avuny/utils`
- `z` (Zod + OpenAPI helpers) → `@avuny/zod` — never import `zod` directly

## 2. Hard rules

1. **ESM.** Every relative import ends in `.js` (`./x.js`), including paths inside `vi.mock(...)`. JSON imports use `with { type: "json" }`.
2. **One params object.** Public repository and service methods are arrow-function class fields taking a single object (`{ data, where, context, db }`) — no positional arguments. (Small pure utils may take positional args, like `hashPassword(password)`.)
3. **Services return `Result` and don't throw for expected outcomes:** `ok({ data, msg })` / `fail({ error, msg, meta })`. Branch on `result.success`.
4. **Repositories: reads return `null` when nothing is found; writes throw `Error` on invariant failure** (`"User not found"`, `"Failed to create user record"`).
5. **No `!` non-null assertions, no `any`, no `@ts-ignore`.** Handle the missing case (usually with `fail(...)`).
6. **Never return database rows from a service.** Map to explicit fields. Never expose `passwordHash` or other secrets, and never put secrets in `msg`, `meta` or logs.
7. **Inject everything.** `db` and `config` come from the host app via the container: no `process.env`, no module-level singletons, no `new` of a collaborator inside a service.
8. **Public API = `src/index.ts`.** Re-export every public file there (`export * from "./…/x.js"`); `utils/` stays internal. Other packages import only the package name (e.g. `@avuny/users`), never deep paths.
9. **Don't invent.** No new dependencies, DI frameworks, validators, ORMs or folder layouts unless asked. For anything not covered here, follow the closest pattern in `users/`, or ask.

ESLint enforces rules 5, 7 and 8, type-only imports, and the layer boundaries in §1 (no `drizzle-orm` in services, no Hono outside `middlewares/`, no direct `zod`). Fix the code; never silence a rule with `eslint-disable` unless asked.

## 3. Layout and naming

```text
packages/modules/<name>/
├─ package.json            # "name": "@avuny/<name>", "type": "module", main/types/exports → dist
├─ tsconfig.json           # { "extends": "@workspace/typescript-config/base.json" }
├─ tsconfig.build.json     # extends ./tsconfig.json; noEmit false, outDir dist, rootDir src, declaration + declarationMap, include ["src"]
└─ src/
   ├─ index.ts                       # public API
   ├─ <domain>.container.ts
   ├─ repositories/
   │  ├─ <domain>-db.type.ts         # <Domain>Database
   │  ├─ types.ts
   │  └─ foo.repository.ts
   ├─ services/
   │  ├─ types.ts
   │  ├─ foo.service.ts
   │  └─ foo.service.spec.ts         # spec lives next to the code it tests
   ├─ errors/
   │  ├─ errors.ts                   # error-code constants + types
   │  ├─ errors-map.ts               # code → { statusCode, responseMessage }
   │  └─ errors.spec.ts              # codes ↔ HTTP mapping ↔ locales
   ├─ intl/
   │  ├─ i18next.ts · i18next.d.ts · trans.ts
   │  └─ locales/<domain>/en.json · ar.json
   ├─ middlewares/<framework>-<name>-middleware.ts
   └─ utils/<name>.util.ts           # internal; not exported
```

| What | File | Symbol |
| --- | --- | --- |
| Repository | `repositories/foo.repository.ts` | `FooRepository` |
| DB type | `repositories/<domain>-db.type.ts` | `<Domain>Database` |
| Service | `services/foo.service.ts` | `FooService` |
| Error codes | `errors/errors.ts` | `<Domain><Feature>ErrorCode`, aggregate `<Domain>ErrorCode` |
| Error map | `errors/errors-map.ts` | `<domain><Feature>ErrorMapping`, aggregate `<domain>ErrorMapping` |
| Translator | `intl/trans.ts` | `<domain>Trans({ lang })` |
| Container | `<domain>.container.ts` | `create<Domain>Container`, type `<Domain>Container` |
| Middleware | `middlewares/hono-foo-middleware.ts` | `createHonoFooMiddleware(deps)` |
| Util | `utils/foo.util.ts` | `export const fooBar = …` |

Style:

- Files are kebab-case, one class per file. Named exports only; `type` aliases over `interface` (except module augmentation); `import type` for type-only imports.
- Format like the reference (Prettier: no semicolons, double quotes, 2 spaces, `es5` trailing commas, ~80 cols); run the repo formatter if one is configured.
- Section banners: `// ---…` inside services, `// ===…` around spec `describe` blocks.

## 4. Repositories

Template: `users/src/repositories/user.repository.ts`.

```ts
export class FooRepository extends DrizzleRepository<FooDatabase> {
  constructor(protected readonly db: FooDatabase) {
    super(db)
  }

  protected getDB(db?: FooDatabase): FooDatabase {
    return db ?? this.db
  }

  findById = async (params: { where: { id: string }; db?: FooDatabase }) => {
    const database = params.db ?? this.db

    const row = await database.query.foos.findFirst({
      where: eq(foos.id, params.where.id),
    })

    return row ?? null // reads: null when missing
  }
}
```

- Params shape: `where` = lookup keys, `data` = values to write, `db?` = optional transaction/executor. **Always accept `db?`** so a service can run the call inside `withTransaction`; resolve it with `params.db ?? this.db`.
- Reads use the relational API (`database.query.<table>.findFirst/findMany`, `with` for relations). Writes use the builder with `.returning()` and `const [row] = …`; throw if `row` is missing.
- Partial updates: copy only `!== undefined` fields into a `Partial<typeof table.$inferInsert>`; throw `"No fields to update"` when it ends up empty.
- Normalize identifier-like values (`trim().toLowerCase()`) inside the repository before storing or querying.
- Multi-table writes: `const database = params.db ?? this.db`, then `database.transaction(async (tx) => …)` with every statement on `tx`.
- `createTransaction` comes from `DrizzleRepository` — don't re-implement it.
- Type against `<Domain>Database` (`repositories/<domain>-db.type.ts`, derived from `Database` in `@avuny/db`), never raw Drizzle types.
- Need a new table, column or enum? Stop and flag it — that belongs in `@avuny/db`.

## 5. Services

Template: `users/src/services/auth.service.ts`.

```ts
export class FooService {
  constructor(
    private readonly fooRepository: FooRepository,
    private readonly tokenService: TokenService,
    private readonly config?: { secret?: string } // optional config object goes last
  ) {}

  withTransaction = async <T>(
    callback: (tx: FooDatabase) => Promise<T>
  ): Promise<T> => {
    try {
      return await this.fooRepository.createTransaction(callback)
    } catch (error) {
      throw new Error("Transaction failed", { cause: error })
    }
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------
  create = async (params: {
    data: CreateFooInput // type from @avuny/contracts
    context?: { userAgent?: string; ipAddress?: string }
  }) => {
    const { data } = params

    const existing = await this.fooRepository.findByName({
      where: { name: data.name },
    })

    if (existing) {
      return fail({
        error: FooCreateErrorCode.FOO_CREATE_ALREADY_EXISTS,
        msg: "Foo already exists",
        meta: { name: data.name },
      })
    }

    const foo = await this.fooRepository.insert({ data })

    return ok({
      data: { foo: { id: foo.id, name: foo.name } }, // explicit DTO, never the raw row
      msg: "Foo created successfully",
    })
  }
}
```

- Input: `data` (a contract type), optional `context` (`{ userAgent?, ipAddress? }`) and ids. The host app has already validated request shape with the contract schema — services enforce business rules only.
- Order of work: cheap guards and early `fail(...)` first; expensive or side-effecting work (hashing, writes) last. A failed guard must trigger no side effects (specs assert this).
- `msg` is a short English, developer-facing sentence. User-facing text comes from i18n via the error code. `meta` carries non-secret context, e.g. `{ identifier }`.
- Bubble another service's failure up unchanged: `if (!verification.success) return verification`.
- Repositories throw when a write target is missing. If "not found" is a domain outcome, check with a `find*` first and `fail(...)` — don't catch-and-translate.
- Atomic work: use `withTransaction` and pass `tx` as `db` to every repository call inside the callback.
- Dependencies are classes injected through the constructor as `private readonly`.

## 6. Errors — adding a code touches all of these

Code format: `<DOMAIN>_<FEATURE>_<REASON>` (upper snake), grouped per feature — e.g. `AUTH_SIGN_UP_USER_EXIST`, `AUTH_LOGIN_INCORRECT_CREDENTIALS`.

**1. `errors/errors.ts`** — const object whose values equal their keys, plus a same-named type. Then spread the group into the `<Domain>ErrorCode` aggregate; its type is derived from that const, so there is no union to update.

```ts
export const FooCreateErrorCode = {
  FOO_CREATE_ALREADY_EXISTS: "FOO_CREATE_ALREADY_EXISTS",
} as const
export type FooCreateErrorCode =
  (typeof FooCreateErrorCode)[keyof typeof FooCreateErrorCode]
```

**2. `errors/errors-map.ts`** — HTTP status + default English message, one mapping per group. Then spread the group into the `<domain>ErrorMapping` aggregate (`satisfies Record<<Domain>ErrorCode, ErrorMeta>`), so a missing entry fails the build:

```ts
export const fooCreateErrorMapping = {
  [FooCreateErrorCode.FOO_CREATE_ALREADY_EXISTS]: {
    statusCode: 409,
    responseMessage: "Foo already exists",
  },
} as const satisfies Record<FooCreateErrorCode, ErrorMeta>
```

**3. `intl/locales/<domain>/en.json`** and **4. `ar.json`** — `{ "errors": { "FOO_CREATE_ALREADY_EXISTS": "…" } }`. The key *is* the error code; both files get the same keys. `intl/i18next.ts` has a `satisfies` guard, so a missing key fails the build.

**5. The service spec** — a test for each new failure path (§10). `errors/errors.spec.ts` already cross-checks codes, mapping and both locales (stale keys, empty messages, placeholders).

- Status guide: `400` invalid request/state · `401` unauthenticated or bad credentials · `403` forbidden / required step missing · `404` not found · `409` duplicate or conflict.
- `en.json` is user-facing and polite (it also drives the translation types); `msg` and `responseMessage` stay short and developer-facing.
- `ar.json` must be a real Arabic translation — never a copy of the English or a placeholder — keeping any `{{placeholders}}` identical.

## 7. i18n

- Files: `intl/i18next.ts` (instance + resources), `intl/i18next.d.ts` (resource types derived from `en.json`), `intl/trans.ts` (`<domain>Trans({ lang })` → `i18n.getFixedT(lang)`), `intl/locales/<domain>/{en,ar}.json`. Export `trans.ts` from `index.ts`.
- Languages: `en` (fallback) and `ar`. Namespace = `<domain>`, `keySeparator: "."`. Adding a language = a JSON file per namespace, registered in `resources`, plus the `lang` union in `trans.ts`.
- Services never translate. Consumers do: `const t = <domain>Trans({ lang })`, then `t("errors.<CODE>")`.
- **Use an isolated instance** (`createInstance()`), never the global one — otherwise a second module's `init` overwrites the first module's translations. Keep the `satisfies` guard so a missing locale key fails the build.

```ts
import i18next from "i18next"

import type { FooErrorCode } from "../errors/errors.js"
import fooEn from "./locales/foo/en.json" with { type: "json" }
import fooAr from "./locales/foo/ar.json" with { type: "json" }

type FooMessages = { errors: Record<FooErrorCode, string> }

const en = fooEn satisfies FooMessages // build fails if a code is missing
const ar = fooAr satisfies FooMessages

const i18n = i18next.createInstance()

i18n.init({
  fallbackLng: "en",
  lng: "en",
  resources: { en: { foo: en }, ar: { foo: ar } },
  ns: ["foo"],
  interpolation: { escapeValue: false },
  keySeparator: ".",
})

export { i18n }
```

## 8. Container

Template: `users/src/auth.container.ts`. Plain constructor injection, no DI framework.

- Signature: `create<Domain>Container(db: <Domain>Database, config: <Domain>Config): <Domain>Container`.
- Build in dependency order with numbered comments: 1 repositories → 2 base services → 3 domain services → 4 orchestrator service → 5 middlewares.
- Derive config types from the constructors so they can't drift: `jwt: ConstructorParameters<typeof JwtService>[0]`. Optional config stays optional in the type.
- Return an object exposing **every** instance, typed as `<Domain>Container`.
- Changing a constructor means updating the container, the `ConstructorParameters<…>[n]` index in the config type, and the `new Service(...)` call in the spec.
- Middleware factories (`create<Framework><Name>Middleware(deps)`) take their dependencies as an object and are created here.

## 9. Contracts (`@avuny/contracts`)

- Location: `packages/modules/contract/src/<feature>/schema.ts`. `src/index.ts` re-exports `./schemas.js`, which holds one `export * from "./<feature>/schema.js"` line per feature — add yours there.
- `import { z } from "@avuny/zod"`. Every exported schema ends with `.openapi("<PascalName>")`; every field gets `.openapi({ example })`. OpenAPI names are global: keep them unique and equal to the exported type name (the reference's `Local…` prefix is older naming).
- Define shared field schemas (`identifier`, `password`) once at the top of the file and reuse them — don't re-declare.
- Naming: `signUpInputSchema` → type `SignUpInput`; `userResponseSchema` → `UserResponse`. Types are always `z.infer<typeof …>`.
- File order: shared fields → input schemas → response schemas → types, each block under a banner comment (`// ─────…` + schema name).
- Modules use `import type { SignUpInput } from "@avuny/contracts"` and never redefine request/response types. Keep a service's `data` shape compatible with its response schema.
- Build order for a feature: contract → repository → service → errors → spec → container → `index.ts`.

## 10. Tests (Vitest)

Template: `users/src/services/auth.service.spec.ts`. Services are unit-tested in isolation — no database.

- Spec next to the service: `foo.service.spec.ts`. Import `beforeEach, describe, expect, it, vi` from `"vitest"` explicitly.
- Mock collaborators with hand-written factories returning `vi.fn()` objects (`createFooRepositoryMock`), cast at the call site: `new FooService(fooRepository as unknown as FooRepository)`. Mock utility modules with `vi.mock("../utils/x.util.js", () => ({ … }))` and use `vi.mocked(fn)`.
- `beforeEach`: `vi.clearAllMocks()`, then rebuild every mock and the service under test.
- One `describe` per public method, under a `// ====…` banner. Test names are behavior sentences ("rejects registration when…", "rotates a valid refresh token and preserves its token family").
- Cover the success path, **every** `fail(...)` branch, and the side-effect invariants.
- Assert the complete `Result` with `toEqual({ success, error?, data?, msg, meta? })`, not just `success`.
- Assert negative invariants (`expect(repo.insert).not.toHaveBeenCalled()`) and say *why* in a comment above them (`// Important invariant: …`).
- Fixtures: `create*()` helpers and `satisfies <ContractInput>` consts at the top of the file, under a `// ---…` "Test helpers" banner.

## 11. Auth invariants (when editing `users/`)

- Passwords go through `utils/password.util.ts` (`bcryptjs`). Plaintext is never persisted, logged or returned.
- Sign-in returns `AUTH_LOGIN_INCORRECT_CREDENTIALS` for both an unknown identifier and a wrong password (no user enumeration), and doesn't verify a password when there is no user.
- Refresh tokens rotate: verify → delete the used token → issue a new pair keeping `familyId`. An invalid token is never deleted or replaced.
- Identifiers go through `parseIdentifier` and are normalized (`trim().toLowerCase()`) before lookup or storage.

## 12. Known quirks in the reference — don't copy, fix only when asked

- `UNAUTHENTICATED` has no domain prefix (it is a public code, so it stays). New codes are `<DOMAIN>_…`.
- `RefreshTokenService.verify(token)` / `delete(token)` take a bare string, and `verifyIdentifierOtpToken` returns `{ success, code, message }` instead of a `Result`. New code: params object and `Result`.
- Contract schemas are published to OpenAPI as `LocalSignUpInput` / `LocalLoginInput`, which don't match the type names. Name new components after the exported type.

## 13. Ask first

- Adding routes, controllers or handlers inside a module (the reference has none; HTTP wiring belongs to the host app).
- Any new table, column, enum or migration (`@avuny/db`).
- Renaming or removing anything exported from `index.ts`; adding a dependency, including module → module.
- Repository tests — no pattern exists yet.

## 14. Workflows

**Add a service method**

1. Contract: add or extend input/response schemas in `@avuny/contracts` (§9).
2. Repository: add the method with `{ where, data, db? }` (§4).
3. Service: add the arrow-function field under a section banner; return `ok` / `fail` (§5).
4. Errors: every new `fail` gets its code in all places of §6.
5. Spec: success path, every failure branch, invariants (§10).
6. `index.ts`: export new files only. Build and test.

**Create a module**

1. Copy `package.json`, `tsconfig.json`, `tsconfig.build.json`, `eslint.config.mjs` from `users/`. Set `"name": "@avuny/<name>"`, keep only the dependencies you use (`workspace:*` for internal packages).
2. Create only the folders from §3 that you need.
3. Write in this order: `<Domain>Database` type → contracts → repositories → services (+ specs) → errors + map + locales → container → middlewares → `index.ts`.
4. `pnpm install`, then build and test the module.

**Commands**

```bash
pnpm --filter @avuny/<name> build        # tsc -p tsconfig.build.json → dist/
pnpm --filter @avuny/<name> test         # vitest run
pnpm --filter @avuny/<name> typecheck    # tsc --noEmit
pnpm --filter @avuny/<name> lint         # eslint . (add :fix to autofix)
pnpm --filter @avuny/<name> check        # typecheck + lint + test — run this before finishing
pnpm --filter @avuny/<name> dev          # tsc --watch
pnpm --filter @avuny/<name> api:extract  # API Extractor — run after changing public exports, if configured
```

Workspace dependencies are consumed from `dist/`. After changing `@avuny/contracts`, `@avuny/db` or `@avuny/utils`, rebuild it first (or run `turbo run build --filter=@avuny/<name>...`) before building or testing dependents.

**Done =** `pnpm --filter @avuny/<name> check` passes and the module builds · new public symbols are exported from `index.ts` · every new error code exists in all places of §6 · nothing from §12 was reproduced.
