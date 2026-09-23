import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

export type Database = PostgresJsDatabase<typeof schema>

// Factory function for standalone initialization
export const createDbClient = (connectionString: string): Database => {
  const queryClient = postgres(connectionString)
  return drizzle(queryClient, { schema })
}

// Singleton instance for app runtime
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined
}

const conn = globalForDb.conn ?? postgres(process.env.DATABASE_URL!)
if (process.env.NODE_ENV !== "production") globalForDb.conn = conn

export const db = drizzle(conn, { schema })
