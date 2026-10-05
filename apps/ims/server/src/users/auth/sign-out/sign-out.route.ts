import { createApi, createOpenAPIRouter, response } from "@avuny/hono"

import { OpenAPIHono } from "@hono/zod-openapi"
import { z } from "@avuny/zod"
import { deleteCookie, getCookie } from "hono/cookie"
import { authService } from "../../auth.container.js"
import { refreshTokenCookieOpts } from "@avuny/utils"

export const signOutRoute = createOpenAPIRouter()

const route = createApi({
  method: "post",
  path: "/sign-out",
  operationId: "signOut",
  tags: ["auth"],
  bodySchema: z.object({
    refreshToken: z.string().optional(),
  }),
  responses: [
    response({
      status: 200,
      description: "sign out user by delete refresh token in the database",
      schema: z.string(),
    }),
  ],
})

signOutRoute.openapi(route, async (c) => {
  const body = c.req.valid("json")
  const { cookieName, ...rest } = refreshTokenCookieOpts()
  const refreshToken = getCookie(c, cookieName) || body.refreshToken
  if (!refreshToken) {
    return c.json("you are already logged out", 200)
  }
  deleteCookie(c, cookieName)
  await authService.signOut({ refreshToken })
  return c.json("done", 200)
})
