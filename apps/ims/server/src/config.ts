import "dotenv/config"
import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),

  PORT: z.coerce.number().int().positive(),

  DATABASE_URL: z.url(),

  // ---------------------------------------------------------------------------
  // JWT
  // ---------------------------------------------------------------------------

  JWT_ISSUER: z.string().min(1),

  JWT_AUDIENCE: z.string().min(1),

  JWT_ALGORITHM: z.enum(["HS256", "HS384", "HS512"]).default("HS256"),

  // ---------------------------------------------------------------------------
  // Access token
  // ---------------------------------------------------------------------------

  ACCESS_TOKEN_SECRET: z.string().min(32),

  ACCESS_TOKEN_EXPIRES_IN: z.coerce.number().int().positive(),

  // ---------------------------------------------------------------------------
  // Refresh token
  // ---------------------------------------------------------------------------

  REFRESH_TOKEN_EXPIRES_IN: z.coerce.number().int().positive(),

  // ---------------------------------------------------------------------------
  // Identifier verification / OTP
  // ---------------------------------------------------------------------------

  IDENTIFIER_SHOULD_BE_VERIFIED: z
    .enum(["true", "false"])
    .transform((value) => value === "true"),

  OTP_TOKEN_SECRET: z.string().min(32),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("❌ Invalid environment variables:")
  console.error(parsed.error.format())
  process.exit(1)
}

export const config = Object.freeze(parsed.data)
