import { logger } from "@avuny/logger"
import { Context } from "hono"

export const logHttpRequest = ({
  c,
  level,
  error,
  meta,
  msg,
}: {
  c: Context
  level: "info" | "warn" | "error"
  error?: unknown
  meta?: {}
  msg: string
}) => {
  const { organizationId, user } = c.var
  const { path, method, url } = c.req
  const log = c.var.logger || logger
  log[level]({
    msg,
    method,
    path,
    url,
    userId: user ? user.id : undefined,
    organizationId,
    error,
    meta,
  })
}
