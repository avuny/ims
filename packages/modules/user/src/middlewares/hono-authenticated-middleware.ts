import { MiddlewareHandler } from "hono"

import { v4 as uuidv4 } from "uuid"
import { resultToErrorResponse } from "@avuny/utils"

import { AccessTokenService } from "../services/access-token.service.js"
import { authenticatedErrorMapping } from "../errors/errors-map.js"

export const createHonoAuthenticatedMiddleware = ({
  tokensService: tokenService,
}: {
  tokensService: Pick<AccessTokenService, "verify">
}): MiddlewareHandler => {
  return async (c, next) => {
    // ─────────────────────────────
    // 1. Authenticate user
    // ─────────────────────────────
    const authHeader = c.req.header("authorization")

    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null

    const result = await tokenService.verify(token)

    if (!result.success) {
      return c.json(
        resultToErrorResponse(result.error, authenticatedErrorMapping),
        401
      )
    }

    // ─────────────────────────────
    // 2. Resolve organization context
    // ─────────────────────────────
    const organizationId = c.req.header("X-Organization-Id")

    // ─────────────────────────────
    // 3. Attach request context
    // ─────────────────────────────
    c.set("user", {
      id: result.data.userId,
    })

    c.set("organizationId", organizationId || "") // <WIP>
    c.set("requestId", uuidv4())

    await next()
  }
}
