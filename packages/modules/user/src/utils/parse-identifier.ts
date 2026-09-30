import { z } from "@avuny/zod"

export const IdentifierWithTransformSchema = z
  .string()
  .trim()
  .pipe(
    z.union([
      z.e164().transform((val) => ({
        identifierType: "PHONE" as const,
        identifier: val,
      })),

      z.email().transform((val) => ({
        identifierType: "EMAIL" as const,
        identifier: val.toLowerCase(),
      })),

      z
        .string()
        .min(3)
        .max(30)
        .regex(/^[a-zA-Z0-9._-]+$/)
        .transform((val) => ({
          identifierType: "USERNAME" as const,
          identifier: val,
        })),
    ])
  )

export type Identifier = z.infer<typeof IdentifierWithTransformSchema>

export function parseIdentifier(_identifier: string): Identifier {
  const result = IdentifierWithTransformSchema.safeParse(_identifier)

  if (!result.success) {
    throw new Error("Invalid identifier", {
      cause: result.error,
    })
  }

  return result.data
}
