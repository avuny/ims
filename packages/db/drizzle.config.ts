import { defineConfig } from "drizzle-kit"
import "dotenv/config"
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is missing.")
}

export default defineConfig({
  schema: "./dist/schema/index.js",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
})
