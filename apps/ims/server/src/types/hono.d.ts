import "hono" // needed so TS loads this file for module augmentation
import type { Logger } from "pino"
declare module "hono" {
  interface ContextVariableMap {
    requestId: string
    organizationId: string
    user: { id: string }
    lang: "en" | "ar"
    logger: Logger
    findManyQuery: {
      page: number
      pageSize: number
      filters: Record<string, unknown>
      orderBy: Record<string, unknown>
    }
  }
}
