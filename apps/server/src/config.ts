import { z } from "zod"
import "dotenv/config"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.url(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error("❌Invalid environment variables:")
  console.error(parsed.error.format())
  process.exit(1)
}

export const config = Object.freeze(parsed.data)
