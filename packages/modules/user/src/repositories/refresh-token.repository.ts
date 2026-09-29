import { and, eq, isNull, lt } from "drizzle-orm"

import { DrizzleRepository, refreshTokens, users } from "@avuny/db"

import { AuthDatabase } from "./auth-db.type.js"

type DB = AuthDatabase
export class RefreshTokenRepositoy extends DrizzleRepository<DB> {
  constructor(protected readonly db: AuthDatabase) {
    super(db)
  }

  protected getDB(db?: AuthDatabase): AuthDatabase {
    return db ?? this.db
  }

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  create = async (params: {
    data: {
      userId: string
      tokenHash: string
      familyId?: string
      userAgent?: string
      ipAddress?: string
      expiresAt: Date
    }
    db?: DB
  }) => {
    const { data, db } = params
    const database = this.getDB(db)

    const [token] = await database
      .insert(refreshTokens)
      .values({
        userId: data.userId,
        tokenHash: data.tokenHash,
        familyId: data.familyId,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        expiresAt: data.expiresAt,
      })
      .returning()

    if (!token) {
      throw new Error("Failed to create refresh token")
    }

    return token
  }

  // ---------------------------------------------------------------------------
  // Find by ID
  // ---------------------------------------------------------------------------

  getById = async (params: {
    where: {
      id: string
    }
    db?: DB
  }) => {
    const { where, db } = params
    const database = this.getDB(db)

    const token = await database.query.refreshTokens.findFirst({
      where: eq(refreshTokens.id, where.id),
    })

    return token ?? null
  }

  // ---------------------------------------------------------------------------
  // Find by token hash
  // ---------------------------------------------------------------------------

  getByTokenHash = async (params: {
    where: {
      tokenHash: string
    }
    db?: DB
  }) => {
    const { where, db } = params
    const database = this.getDB(db)

    const token = await database.query.refreshTokens.findFirst({
      where: eq(refreshTokens.tokenHash, where.tokenHash),
    })

    return token ?? null
  }

  // ---------------------------------------------------------------------------
  // Find all tokens belonging to a user
  // ---------------------------------------------------------------------------

  getByUserId = async (params: {
    where: {
      userId: string
    }
    db?: DB
  }) => {
    const { where, db } = params
    const database = this.getDB(db)

    return database.query.refreshTokens.findMany({
      where: eq(refreshTokens.userId, where.userId),
      orderBy: (tokens, { desc }) => [desc(tokens.createdAt)],
    })
  }

  // ---------------------------------------------------------------------------
  // Find all tokens in a family
  // ---------------------------------------------------------------------------

  getByFamilyId = async (params: {
    where: {
      familyId: string
    }
    db?: DB
  }) => {
    const { where, db } = params
    const database = this.getDB(db)

    return database.query.refreshTokens.findMany({
      where: eq(refreshTokens.familyId, where.familyId),
      orderBy: (tokens, { desc }) => [desc(tokens.createdAt)],
    })
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  update = async (params: {
    where: {
      id: string
    }
    data: {
      revokedAt?: Date | null
      expiresAt?: Date
    }
    db?: DB
  }) => {
    const { where, data, db } = params
    const database = this.getDB(db)

    const updateData: Partial<typeof refreshTokens.$inferInsert> = {}

    if (data.revokedAt !== undefined) {
      updateData.revokedAt = data.revokedAt
    }

    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error("No fields to update")
    }

    const [token] = await database
      .update(refreshTokens)
      .set(updateData)
      .where(eq(refreshTokens.id, where.id))
      .returning()

    if (!token) {
      throw new Error("Refresh token not found")
    }

    return token
  }

  // ---------------------------------------------------------------------------
  // Revoke one token
  // ---------------------------------------------------------------------------

  revoke = async (params: {
    where: {
      id: string
    }
    db?: DB
  }) => {
    const { where, db } = params
    const database = this.getDB(db)

    const [token] = await database
      .update(refreshTokens)
      .set({
        revokedAt: new Date(),
      })
      .where(
        and(
          eq(refreshTokens.id, where.id),
          // Don't needlessly update an already-revoked token.
          // This condition can be removed if you want idempotency.
          isNull(refreshTokens.revokedAt)
        )
      )
      .returning()

    return token ?? null
  }

  // ---------------------------------------------------------------------------
  // Delete one
  // ---------------------------------------------------------------------------

  delete = async (params: {
    where: {
      id: string
    }
    db?: DB
  }) => {
    const { where, db } = params
    const database = this.getDB(db)

    const [token] = await database
      .delete(refreshTokens)
      .where(eq(refreshTokens.id, where.id))
      .returning()

    return token ?? null
  }

  // ---------------------------------------------------------------------------
  // Delete expired tokens
  // ---------------------------------------------------------------------------

  deleteExpired = async (params?: { db?: DB }) => {
    const database = this.getDB(params?.db)

    return database
      .delete(refreshTokens)
      .where(lt(refreshTokens.expiresAt, new Date()))
      .returning()
  }
}
