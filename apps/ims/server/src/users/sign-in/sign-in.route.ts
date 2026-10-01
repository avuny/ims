import { createRoute } from "@hono/zod-openapi"

import {
  createResponseSchema,
  createDomainErrorResponseSchema,
  globalErrorResponses,
} from "@avuny/utils"
import { authResponseSchema, signInInputSchema } from "@avuny/contracts"
import { setCookie } from "hono/cookie"
import { createOpenAPIRouter, handleResult } from "@avuny/hono"

import { refreshTokenCookieOpts } from "@avuny/utils"
import {
  AuthLoginErrorCode,
  authLoginErrorMapping,
  authTrans,
} from "@avuny/users"
import { signInUseCase } from "./sign-in.usecase.js"
export const signInRoute = createOpenAPIRouter()

const route = createRoute({
  method: "post",
  path: "/sign-in",
  operationId: "signIn",
  tags: ["auth"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: signInInputSchema,
        },
      },
    },
  },
  responses: {
    [200]: {
      description: "User Signed up in successfully",
      content: {
        "application/json": {
          schema: createResponseSchema(authResponseSchema),
        },
      },
    },
    [authLoginErrorMapping.AUTH_LOGIN_INCORRECT_CREDENTIALS.statusCode]: {
      description: "Incorrect credentials",
      content: {
        "application/json": {
          schema: createDomainErrorResponseSchema([
            AuthLoginErrorCode.AUTH_LOGIN_INCORRECT_CREDENTIALS,
          ]),
        },
      },
    },
    [authLoginErrorMapping.AUTH_LOGIN_USER_PASSWORD_NOT_SET.statusCode]: {
      description: "User password is not set",
      content: {
        "application/json": {
          schema: createDomainErrorResponseSchema([
            AuthLoginErrorCode.AUTH_LOGIN_USER_PASSWORD_NOT_SET,
          ]),
        },
      },
    },
    ...globalErrorResponses,
  },
})

signInRoute.openapi(route, async (c) => {
  const lang = c.get("lang")
  const errorTrans = authTrans({ lang })

  const body = c.req.valid("json")

  const result = await signInUseCase({ data: body })

  return handleResult({
    c,
    result,
    successStatus: 200,
    errorMap: authLoginErrorMapping,
    onSuccess: (data) => {
      const { cookieName, ...rest } = refreshTokenCookieOpts()
      setCookie(c, cookieName, data.tokens.refreshToken, rest)
    },
    errorTrans,
    moduleName: "auth",
  })
})
