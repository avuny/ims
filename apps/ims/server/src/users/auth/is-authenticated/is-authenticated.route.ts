import {
  createApi,
  createOpenAPIRouter,
  handleResult,
  response,
} from "@avuny/hono"
import { AuthenticatedErrorCode, authenticatedErrorMapping } from "@avuny/users"
import {
  createDomainErrorResponseSchema,
  createResponseSchema,
} from "@avuny/utils"
import {
  authService,
  honoAuthenticatedMiddleware,
} from "../../auth.container.js"
import { userResponseSchema } from "@avuny/contracts"

export const isAutenticatedRoute = createOpenAPIRouter()
const route = createApi({
  method: "get",
  operationId: "isAuthenticated",
  path: "/is-authenticated",
  tags: ["auth"],
  middleware: [honoAuthenticatedMiddleware],
  responses: [
    response({
      status: 200,
      description: "User is authenticated",
      schema: createResponseSchema(userResponseSchema),
    }),
    response({
      status: 401,
      description: "Token is missing or invalid, user is required to login",
      schema: createDomainErrorResponseSchema([
        AuthenticatedErrorCode.UNAUTHENTICATED,
      ]),
    }),
  ],
})

isAutenticatedRoute.openapi(route, async (c) => {
  const user = c.get("user")

  const result = await authService.getUser({ userId: user.id })

  return handleResult({
    c,
    result,
    successStatus: 200,
    errorMap: authenticatedErrorMapping,
    moduleName: "auth",
  })
})
