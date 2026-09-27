import type { Database } from "@avuny/db"
import { eq, and } from "drizzle-orm"

import {
  AuthProviderType,
  db,
  IdentifierType,
  userIdentifiers,
  userProviders,
  users,
} from "@avuny/db"

export class UserRepository {
  constructor(private db: Database) {}
  private getDB(tx?: Database): Database {
    return tx ?? this.db
  }

  insert = async (params: {
    data: {
      name: string
      identifier: string
      identifierType: IdentifierType
      passwordHash?: string
      provider?: {
        id: string
        name: AuthProviderType
      }
      avatarUrl?: string
    }
    db?: Database
  }) => {
    const { data, db } = params
    const _db = this.getDB(db)
    return await _db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          name: data.name,
          avatarUrl: data.avatarUrl,
        })
        .returning()

      if (!newUser) throw new Error("Failed to create user record")

      const [newIdentifier] = await tx
        .insert(userIdentifiers)
        .values({
          userId: newUser.id,
          identifier: data.identifier.toLowerCase().trim(),
          identifierType: data.identifierType,
          isVerified: true,
          verifiedAt: new Date(),
        })
        .returning()

      if (!newIdentifier) throw new Error("Failed to create user identifier")
      if (!data.provider)
        return {
          ...newUser,
          identifier: newIdentifier.identifier,
          identifierType: newIdentifier.identifierType,
        }

      const [newProvider] = await tx
        .insert(userProviders)
        .values({
          identifierId: newIdentifier.id,
          provider: data.provider?.name,
          providerId: data.provider?.id,
        })
        .returning()

      if (!newProvider) throw new Error("Failed to create user provider")

      return {
        ...newUser,
        identifier: newIdentifier.identifier,
        identifierType: newIdentifier.identifierType,
      }
    })
  }

  update = async (params: {
    where: { id: string }
    data: {
      name?: string
      avatarUrl?: string
      isActive?: boolean
    }
    db?: Database
  }) => {
    const { where, data, db } = params
    const database = this.getDB(db)

    const updateData: Partial<typeof users.$inferInsert> = {}

    if (data.name !== undefined) {
      updateData.name = data.name
    }

    if (data.avatarUrl !== undefined) {
      updateData.avatarUrl = data.avatarUrl
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error("No fields to update")
    }

    const [user] = await database
      .update(users)
      .set(updateData)
      .where(eq(users.id, where.id))
      .returning()

    if (!user) {
      throw new Error("User not found")
    }

    return user
  }

  updateIdentifier = async (params: {
    where: { id: string }
    data: {
      identifier: string
    }
    db?: Database
  }) => {
    const { where, data, db } = params
    const database = this.getDB(db)

    const [identifier] = await database
      .update(userIdentifiers)
      .set({
        identifier: data.identifier.trim().toLowerCase(),
        isVerified: false,
        verifiedAt: null,
      })
      .where(eq(userIdentifiers.id, where.id))
      .returning()

    if (!identifier) {
      throw new Error("Identifier not found")
    }

    return identifier
  }

  updatePassword = async (params: {
    where: { id: string }
    data: {
      passwordHash: string
    }
    db?: Database
  }) => {
    const { where, data, db } = params
    const database = this.getDB(db)

    const [user] = await database
      .update(users)
      .set({
        passwordHash: data.passwordHash,
      })
      .where(eq(users.id, where.id))
      .returning()

    if (!user) {
      throw new Error("User not found")
    }

    return user
  }

  /** Queries */

  findById = async (params: { where: { id: string }; db?: Database }) => {
    const { where, db } = params
    const database = this.getDB(db)
    const user = await database.query.users.findFirst({
      where: eq(users.id, where.id),
      with: { identifiers: { with: { providers: true } } },
    })
    return user ?? null
  }

  findByIdentifier = async (params: {
    where: { identifier: string; type?: IdentifierType }
    db?: Database
  }) => {
    const { where, db } = params
    const database = this.getDB(db)
    const normalizedIdentifier = where.identifier.toLowerCase().trim()

    const conditions = [eq(userIdentifiers.identifier, normalizedIdentifier)]
    if (where.type) {
      conditions.push(eq(userIdentifiers.identifierType, where.type))
    }

    const identifierRecord = await database.query.userIdentifiers.findFirst({
      where: and(...conditions),
      with: { user: true },
    })

    return identifierRecord?.user || null
  }
}
