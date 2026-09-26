import { eq, and } from "drizzle-orm"

import {
  AuthProviderType,
  Database,
  db,
  IdentifierType,
  userIdentifiers,
  userProviders,
  users,
} from "@avuny/db"

type CreateUserWithPasswordDTO = {
  name: string
  identifier: string
  identifierType: IdentifierType
  passwordHash: string
}

export async function createUserWithPassword(data: CreateUserWithPasswordDTO) {
  return await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        name: data.name,
        passwordHash: data.passwordHash,
      })
      .returning()

    if (!newUser) throw new Error("Failed to create user record")

    const [newIdentifier] = await tx
      .insert(userIdentifiers)
      .values({
        userId: newUser.id,
        identifier: data.identifier.toLowerCase().trim(),
        identifierType: data.identifierType,
        isVerified: false,
        verifiedAt: null,
      })
      .returning()

    if (!newIdentifier) throw new Error("Failed to create user identifier")

    return { user: newUser, identifier: newIdentifier }
  })
}

type CreateUserWithProviderDTO = {
  name: string
  identifier: string
  identifierType: IdentifierType
  provider: AuthProviderType
  providerId: string
  avatarUrl?: string
}

export async function createUserWithProvider(data: CreateUserWithProviderDTO) {
  return await db.transaction(async (tx) => {
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

    const [newProvider] = await tx
      .insert(userProviders)
      .values({
        identifierId: newIdentifier.id,
        provider: data.provider,
        providerId: data.providerId,
      })
      .returning()

    if (!newProvider) throw new Error("Failed to create user provider")

    return {
      user: newUser,
      identifier: newIdentifier,
      provider: newProvider,
    }
  })
}

// Add this DTO type
type UpdateUserDTO = {
  name?: string
  passwordHash?: string
  avatarUrl?: string
  contactEmail?: string
  isActive?: boolean
}

/**
 * Updates a user's core profile information.
 * Only the fields provided in the `data` object will be updated.
 * Note: The `updatedAt` timestamp is automatically handled by the schema's `$onUpdate`.
 */
export async function updateUser(userId: string, data: UpdateUserDTO) {
  // Prevent empty updates which would throw a SQL syntax error
  if (Object.keys(data).length === 0) {
    throw new Error("No fields provided to update")
  }

  const [updatedUser] = await db
    .update(users)
    .set(data)
    .where(eq(users.id, userId))
    .returning()

  if (!updatedUser) {
    throw new Error("User not found or failed to update")
  }

  return updatedUser
}

type AddUserIdentifierDTO = {
  userId: string
  identifier: string
  identifierType: IdentifierType
  /**
   * Defaults to false. If an admin is adding it or it's implicitly trusted,
   * you can pass true.
   */
  isVerified?: boolean
}

/**
 * Adds a new identifier (e.g., a new phone number or a second email) to an existing user.
 */
export async function addUserIdentifier(data: AddUserIdentifierDTO) {
  const isVerified = data.isVerified ?? false

  const [newIdentifier] = await db
    .insert(userIdentifiers)
    .values({
      userId: data.userId,
      identifier: data.identifier.toLowerCase().trim(), // Honors `isNormalized`
      identifierType: data.identifierType,
      isVerified: isVerified,
      verifiedAt: isVerified ? new Date() : null, // Honors `verified_consistent_chk`
    })
    .returning()

  if (!newIdentifier) {
    throw new Error("Failed to add new user identifier")
  }

  return newIdentifier
}

type UpdateIdentifierDTO = {
  identifier: string
  /**
   * When changing an identifier (e.g., changing an email address),
   * you almost always want to force the user to re-verify it.
   * Defaults to `false`.
   */
  isVerified?: boolean
}

/**
 * Updates an existing identifier (e.g., user is correcting a typo in their email).
 * Note: By default, this revokes the "verified" status so the user must verify the new string.
 */
export async function updateUserIdentifier(
  identifierId: string,
  data: UpdateIdentifierDTO
) {
  // Default to false because changing an email/phone means it needs new verification
  const isVerified = data.isVerified ?? false

  const [updatedIdentifier] = await db
    .update(userIdentifiers)
    .set({
      identifier: data.identifier.toLowerCase().trim(),
      isVerified: isVerified,
      verifiedAt: isVerified ? new Date() : null,
    })
    .where(eq(userIdentifiers.id, identifierId))
    .returning()

  if (!updatedIdentifier) {
    throw new Error("Identifier not found or failed to update")
  }

  return updatedIdentifier
}
