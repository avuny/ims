// const exampleUsage = async () => {
//   refreshTokenRepository.createTransaction(async (tx) => {
//     const user = await tx.insert(users).values({ name: "khaled" }).returning()
//     const rf = await refreshTokenRepository.create({
//       db: tx,
//       data: { expiresAt: new Date(), tokenHash: "", userId: "" },
//     })
//   })
// }

import type { PgDatabase } from "drizzle-orm/pg-core"

export type Transaction<TDatabase extends PgDatabase<any, any, any>> =
  Parameters<Parameters<TDatabase["transaction"]>[0]>[0]

export abstract class DrizzleRepository<
  TDatabase extends PgDatabase<any, any, any>,
> {
  constructor(protected readonly db: TDatabase) {}

  protected getDB(db?: TDatabase): TDatabase {
    return db ?? this.db
  }

  async createTransaction<T>(
    callback: (tx: Transaction<TDatabase>) => Promise<T>
  ): Promise<T> {
    try {
      return await this.db.transaction(async (tx) => callback(tx))
    } catch (error) {
      throw new Error("Transaction failed", { cause: error })
    }
  }
}
