import type { Database } from "../client.js"

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0]

export abstract class DrizzleRepository {
  constructor(protected readonly _db: Database) {}

  async createTransaction<T>(
    callback: (tx: Transaction) => Promise<T>
  ): Promise<T> {
    try {
      return await this._db.transaction(async (tx) => {
        return await callback(tx)
      })
    } catch (error) {
      throw new Error("Transaction failed", {
        cause: error,
      })
    }
  }
}
