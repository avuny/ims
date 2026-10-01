// TODO
// type RefreshTokenCookieOpts = {
//   cookieName?: string
//   path?: string
//   httpOnly?: boolean
//   secure?: boolean
//   sameSite?: "lax" | "strict" | "none"
//   maxAge?: number
// }

// export const refreshTokenCookieOpts = (
//   opts: RefreshTokenCookieOpts = {},
// ) => ({
//   cookieName: opts.cookieName ?? "refreshToken",
//   path: opts.path ?? "/",
//   httpOnly: opts.httpOnly ?? true,
//   secure: opts.secure ?? (process.env.NODE_ENV === "production"),
//   sameSite:
//     opts.sameSite ??
//     (process.env.NODE_ENV === "production" ? "lax" : "strict"),
//   maxAge: opts.maxAge ?? 60 * 60 * 24 * 15, // 15 days
// })
// import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi"

// import {
//   createResponseSchema,
//   createDomainErrorResponseSchema,
//   globalErrorResponses,
// } from "@avuny/utils"

// import { setCookie } from "hono/cookie"
// import { createOpenAPIRouter, handleResult } from "@avuny/hono"
// import { trans } from "../../intl/trans.js"
// import { authSignInErrorMapping } from "../errors/errors.map.js"
// import { authResponseSchema, signInSchema } from "@avuny/shared"
// import { AuthSignInDomainErrorCodes } from "../errors/errors.js"
// import { refreshTokenCookieOpts } from "../constants.js"
// import { authService } from "../dependencies.js"

// export const signInRoute = createOpenAPIRouter()

// const route = createRoute({
//   method: "post",
//   path: "/sign-in",
//   operationId: "signIn",
//   tags: ["auth"],
//   request: {
//     body: {
//       content: {
//         "application/json": {
//           schema: signInSchema,
//         },
//       },
//     },
//   },
//   responses: {
//     [200]: {
//       description: "User Signed up in successfully",
//       content: {
//         "application/json": {
//           schema: createResponseSchema(authResponseSchema),
//         },
//       },
//     },
//     [authSignInErrorMapping.AUTH_LOGIN_INCORRECT_CREDENTIALS.statusCode]: {
//       description: "Incorrect credentials",
//       content: {
//         "application/json": {
//           schema: createDomainErrorResponseSchema([
//             AuthSignInDomainErrorCodes.AUTH_LOGIN_INCORRECT_CREDENTIALS,
//           ]),
//         },
//       },
//     },
//     [authSignInErrorMapping.AUTH_LOGIN_USER_PASSWORD_NOT_SET.statusCode]: {
//       description: "User password is not set",
//       content: {
//         "application/json": {
//           schema: createDomainErrorResponseSchema([
//             AuthSignInDomainErrorCodes.AUTH_LOGIN_USER_PASSWORD_NOT_SET,
//           ]),
//         },
//       },
//     },
//     ...globalErrorResponses,
//   },
// })

// signInRoute.openapi(route, async (c) => {
//   const lang = c.get("lang")
//   const errorTrans = trans({ lang })

//   const body = c.req.valid("json")

//   const result = await authService.signIn({ data: body })

//   return handleResult({
//     c,
//     result,
//     successStatus: 200,
//     errorMap: authSignInErrorMapping,
//     onSuccess: (data) => {
//       const { cookieName, ...rest } = refreshTokenCookieOpts
//       setCookie(c, cookieName, data.tokens.refreshToken, rest)
//     },
//     errorTrans,
//     moduleName: "auth",
//   })
// })
