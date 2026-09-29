// auth-db.types.ts
import type { NodePgDatabase } from "drizzle-orm/node-postgres"
import type * as schema from "@avuny/db/schema"

export type AuthSchema = Pick<
  typeof schema,
  | "users"
  | "refreshTokens"
  | "userIdentifiers"
  | "userIdentifiersRelations"
  | "usersRelations"
  | "refreshTokensRelations"
>

export type AuthDatabase = NodePgDatabase<AuthSchema>
