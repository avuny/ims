import type { Database } from "@avuny/db"
import {
  AuthProviderType,
  DrizzleRepository,
  IdentifierType,
  userIdentifiers,
  userProviders,
  users,
} from "@avuny/db"
import { and, eq } from "drizzle-orm"
import { AuthDatabase } from "./auth-db.type.js"

export class UserRepository extends DrizzleRepository<AuthDatabase> {
  constructor(protected readonly db: AuthDatabase) {
    super(db)
  }

  protected getDB(db?: AuthDatabase): AuthDatabase {
    return db ?? this.db
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
      setPrimaryIdentifier?: boolean
    }
  }) => {
    const { data } = params

    return this.db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          name: data.name,
          avatarUrl: data.avatarUrl,
          passwordHash: data.passwordHash,
        })
        .returning()

      if (!newUser) {
        throw new Error("Failed to create user record")
      }

      const [newIdentifier] = await tx
        .insert(userIdentifiers)
        .values({
          userId: newUser.id,
          identifier: data.identifier.trim().toLowerCase(),
          identifierType: data.identifierType,
          isVerified: true,
          isPrimary: data.setPrimaryIdentifier,
          verifiedAt: new Date(),
        })
        .returning()

      if (!newIdentifier) {
        throw new Error("Failed to create user identifier")
      }

      if (data.provider) {
        const [newProvider] = await tx
          .insert(userProviders)
          .values({
            identifierId: newIdentifier.id,
            provider: data.provider.name,
            providerId: data.provider.id,
          })
          .returning()

        if (!newProvider) {
          throw new Error("Failed to create user provider")
        }
      }

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
    db?: AuthDatabase
  }) => {
    const database = params.db ?? this.db

    const updateData: Partial<typeof users.$inferInsert> = {}

    if (params.data.name !== undefined) {
      updateData.name = params.data.name
    }

    if (params.data.avatarUrl !== undefined) {
      updateData.avatarUrl = params.data.avatarUrl
    }

    if (params.data.isActive !== undefined) {
      updateData.isActive = params.data.isActive
    }

    if (Object.keys(updateData).length === 0) {
      throw new Error("No fields to update")
    }

    const [user] = await database
      .update(users)
      .set(updateData)
      .where(eq(users.id, params.where.id))
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
    db?: AuthDatabase
  }) => {
    const database = params.db ?? this.db

    const [identifier] = await database
      .update(userIdentifiers)
      .set({
        identifier: params.data.identifier.trim().toLowerCase(),
        isVerified: false,
        verifiedAt: null,
      })
      .where(eq(userIdentifiers.id, params.where.id))
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
    db?: AuthDatabase
  }) => {
    const database = params.db ?? this.db

    const [user] = await database
      .update(users)
      .set({
        passwordHash: params.data.passwordHash,
      })
      .where(eq(users.id, params.where.id))
      .returning()

    if (!user) {
      throw new Error("User not found")
    }

    return user
  }

  findById = async (params: { where: { id: string }; db?: AuthDatabase }) => {
    const database = params.db ?? this.db

    const user = await database.query.users.findFirst({
      where: eq(users.id, params.where.id),
      with: {
        identifiers: {
          with: {
            providers: true,
          },
        },
      },
    })

    return user ?? null
  }

  findByIdentifier = async (params: {
    where: {
      identifier: string
      type?: IdentifierType
    }
    db?: AuthDatabase
  }) => {
    const database = params.db ?? this.db

    const normalizedIdentifier = params.where.identifier.trim().toLowerCase()

    const conditions = [eq(userIdentifiers.identifier, normalizedIdentifier)]

    if (params.where.type) {
      conditions.push(eq(userIdentifiers.identifierType, params.where.type))
    }

    const identifierRecord = await database.query.userIdentifiers.findFirst({
      where: and(...conditions),
      with: {
        user: true,
      },
    })

    return identifierRecord?.user ?? null
  }
}
