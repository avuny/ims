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

/**
 * Find a user by their Primary Key (UUID)
 * Includes their identifiers and OAuth providers for a complete profile view.
 */
export async function getUserById(id: string) {
  return await db.query.users.findFirst({
    where: eq(users.id, id),
    with: {
      identifiers: {
        with: {
          providers: true,
        },
      },
    },
  })
}

/**
 * Find a user by their identifier (Email, Phone, Username)
 * Extremely useful for standard Password/OTP logins.
 */
export async function getUserByIdentifier(
  identifier: string,
  type?: IdentifierType
) {
  const normalizedIdentifier = identifier.toLowerCase().trim()

  const conditions = [eq(userIdentifiers.identifier, normalizedIdentifier)]
  if (type) {
    conditions.push(eq(userIdentifiers.identifierType, type))
  }

  const identifierRecord = await db.query.userIdentifiers.findFirst({
    where: and(...conditions),
    with: {
      user: true,
    },
  })

  return identifierRecord?.user || null
}

/**
 * Find a user via their OAuth Provider (e.g., Google or Facebook)
 * Useful for handling OAuth callbacks.
 */
export async function getUserByProvider(
  provider: AuthProviderType,
  providerId: string
) {
  const providerRecord = await db.query.userProviders.findFirst({
    where: and(
      eq(userProviders.provider, provider),
      eq(userProviders.providerId, providerId)
    ),
    with: {
      identifier: {
        with: {
          user: true,
        },
      },
    },
  })

  return providerRecord?.identifier?.user || null
}
