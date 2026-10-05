import { createRoute } from "@hono/zod-openapi"
import { setCookie } from "hono/cookie"

import {
  createResponseSchema,
  createDomainErrorResponseSchema,
  globalErrorResponses,
  refreshTokenCookieOpts,
} from "@avuny/utils"
import { authResponseSchema, signUpInputSchema } from "@avuny/contracts"
import { createOpenAPIRouter, handleResult } from "@avuny/hono"

import {
  AuthSignUpErrorCode,
  authSignUpErrorMapping,
  authTrans,
} from "@avuny/users"
import { signUpUseCase } from "./sign-up.usecase.js"

export const signUpRoute = createOpenAPIRouter()

const route = createRoute({
  method: "post",
  path: "/sign-up",
  operationId: "signUp",
  tags: ["auth"],
  request: {
    body: {
      content: {
        "application/json": {
          schema: signUpInputSchema,
        },
      },
    },
  },
  responses: {
    [201]: {
      description: "User signed up successfully",
      content: {
        "application/json": {
          schema: createResponseSchema(authResponseSchema),
        },
      },
    },
    [authSignUpErrorMapping.AUTH_SIGN_UP_INVALID_VERIFICATION_TOKEN.statusCode]:
      {
        description: "Invalid verification token or identifier mismatch",
        content: {
          "application/json": {
            schema: createDomainErrorResponseSchema([
              AuthSignUpErrorCode.AUTH_SIGN_UP_INVALID_VERIFICATION_TOKEN,
              AuthSignUpErrorCode.AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_MISMATCH,
            ]),
          },
        },
      },
    [authSignUpErrorMapping.AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_REQUIRED
      .statusCode]: {
      description: "Identifier verification is required",
      content: {
        "application/json": {
          schema: createDomainErrorResponseSchema([
            AuthSignUpErrorCode.AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_REQUIRED,
          ]),
        },
      },
    },
    [authSignUpErrorMapping.AUTH_SIGN_UP_USER_EXIST.statusCode]: {
      description: "User already exists with this identifier",
      content: {
        "application/json": {
          schema: createDomainErrorResponseSchema([
            AuthSignUpErrorCode.AUTH_SIGN_UP_USER_EXIST,
          ]),
        },
      },
    },
    ...globalErrorResponses,
  },
})

signUpRoute.openapi(route, async (c) => {
  const lang = c.get("lang")
  const errorTrans = authTrans({ lang })

  const body = c.req.valid("json")

  const result = await signUpUseCase({
    data: body,
  })

  return handleResult({
    c,
    result,
    successStatus: 201,
    errorMap: authSignUpErrorMapping,
    onSuccess: (data) => {
      const { cookieName, ...rest } = refreshTokenCookieOpts()
      setCookie(c, cookieName, data.tokens.refreshToken, rest)
    },
    errorTrans,
    moduleName: "auth",
  })
})
