import {
  createApi,
  createOpenAPIRouter,
  handleResult,
  response,
} from "@avuny/hono"
import {
  createDomainErrorResponseSchema,
  createResponseSchema,
  refreshTokenCookieOpts,
} from "@avuny/utils"
import { OpenAPIHono } from "@hono/zod-openapi"
import { z } from "@avuny/zod"
import { getCookie, setCookie } from "hono/cookie"

import { authService } from "../../auth.container.js"
import { AuthenticatedErrorCode, authenticatedErrorMapping } from "@avuny/users"
import { authTokensResponseSchema } from "@avuny/contracts"

export const refreshTokenRoute = createOpenAPIRouter()

const route = createApi({
  method: "post",
  operationId: "refreshToken",
  path: "/token/refresh",
  tags: ["auth"],
  bodySchema: z.object({
    refreshToken: z.string().optional(),
  }),
  responses: [
    response({
      status: 200,
      description:
        "return new refreshToken and accessToken if refreshToken is valid",
      schema: createResponseSchema(authTokensResponseSchema),
    }),
    response({
      status: 401,
      description: "Token is missing or invalid, user is required to login",
      schema: createDomainErrorResponseSchema([
        AuthenticatedErrorCode.AUTH_REFRESH_TOKEN_INVALID,
      ]),
    }),
  ],
})

refreshTokenRoute.openapi(route, async (c) => {
  const body = c.req.valid("json")

  // Invoked as a function just like in the signOut route
  const { cookieName, ...rest } = refreshTokenCookieOpts()

  // Updated to look for 'refreshToken' to match the updated body schema
  const refreshToken = getCookie(c, cookieName) || body.refreshToken

  const result = await authService.refreshToken({ token: refreshToken })

  return handleResult({
    c,
    result,
    successStatus: 200,
    errorMap: authenticatedErrorMapping,
    onSuccess: (data) => {
      setCookie(c, cookieName, data.refreshToken, rest)
    },
    moduleName: "auth",
  })
})
