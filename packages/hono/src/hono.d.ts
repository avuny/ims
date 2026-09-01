import "hono" // needed so TS loads this file for module augmentation
import type { Logger } from "pino"
declare module "hono" {
  interface ContextVariableMap {
    requestId: string
    organizationId: string
    user: { id: string }
    lang: string
    logger: Logger
  }
}
