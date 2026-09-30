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

//********************** Types ******************************/
export type SignUpInput = z.infer<typeof signUpInputSchema>
export type SignInInput = z.infer<typeof signInInputSchema>
