import { z } from "@avuny/zod"

const identifier = z.union([
  z.email().openapi({ example: "john@example.com" }),
  z.e164().openapi({ example: "+201012345678" }),
  z.string().openapi({ example: "john_doe" }),
])
const password = z.string().openapi({ example: "P@ssw0rd" }).min(8).max(20)

// ─────────────────────────────────────────────
// localSignUpInputSchema
// ─────────────────────────────────────────────

export const signUpInputSchema = z
  .object({
    identifier,
    password: z.string().openapi({ example: "P@ssw0rd" }).min(8).max(20),
    name: z.string().min(1).openapi({ example: "John Doe" }),
  })
  .openapi("LocalSignUpInput")

// ─────────────────────────────────────────────
// localLoginInputSchema
// ─────────────────────────────────────────────
export const signInInputSchema = z
  .object({
    identifier,
    password,
  })
  .openapi("LocalLoginInput")

/*******************Response********************* */
// ─────────────────────────────────────────────
// userResponseTypeSchema
// ─────────────────────────────────────────────
export const userResponseSchema = z
  .object({
    id: z.string().openapi({ example: "user_123" }),
    name: z.string().openapi({ example: "John Doe" }),
    identifier: z.string().openapi({ example: "john@example.com" }),
  })
  .openapi("UserResponse")

// ─────────────────────────────────────────────
// authTokensResponseTypeSchema
// ─────────────────────────────────────────────
export const authTokensResponseSchema = z
  .object({
    accessToken: z.string().openapi({ example: "jwt-access-token" }),
    refreshToken: z.string().openapi({ example: "jwt-refresh-token" }),
  })
  .openapi("AuthTokensResponse")

// ─────────────────────────────────────────────
// authResponseTypeSchema
// ─────────────────────────────────────────────
export const authResponseSchema = z
  .object({
    user: userResponseSchema,
    tokens: authTokensResponseSchema,
  })
  .openapi("AuthResponse")

//********************** Types ******************************/
export type SignUpInput = z.infer<typeof signUpInputSchema>
export type SignInInput = z.infer<typeof signInInputSchema>

//*******************Response********************* */
export type UserResponse = z.infer<typeof userResponseSchema>
export type AuthTokensResponse = z.infer<typeof authTokensResponseSchema>
export type AuthResponse = z.infer<typeof authResponseSchema>
