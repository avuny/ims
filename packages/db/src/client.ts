import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema/index.js"

export type Database = PostgresJsDatabase<typeof schema>

export const createDbClient = (connectionString: string): Database => {
  const queryClient = postgres(connectionString)

  return drizzle(queryClient, { schema })
}
