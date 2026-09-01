import { z } from "@avuny/zod"
import { createRoute } from "@hono/zod-openapi"

import { StatusCode } from "hono/utils/http-status"
import { globalErrorResponses } from "@avuny/utils"
import { MiddlewareHandler } from "hono/types"

/* ======================================================
 * HTTP STATUS (OPTIONAL BUT RECOMMENDED)
 * ====================================================== */

export type HttpStatus =
  | 200
  | 201
  | 204
  | 400
  | 401
  | 403
  | 404
  | 409
  | 422
  | 500

/* ======================================================
 * API RESPONSE HELPERS
 * ====================================================== */

export type ApiResponse<
  Status extends StatusCode,
  Schema extends z._ZodType,
> = {
  status: Status
  description: string
  schema: Schema
}

export const response = <Status extends StatusCode, Schema extends z._ZodType>({
  description,
  schema,
  status,
}: {
  status: Status
  description: string
  schema: Schema
}): ApiResponse<Status, Schema> => ({
  status,
  description,
  schema,
})

/* ======================================================
 * OPENAPI RESPONSE MAPPING
 * ====================================================== */

type OpenApiResponses<
  R extends readonly ApiResponse<HttpStatus, z._ZodType>[],
> = {
  [K in R[number] as K["status"]]: {
    description: K["description"]
    content: {
      "application/json": {
        schema: K["schema"]
      }
    }
  }
}

/**
 * WHY THIS EXISTS
 * ----------------
 * Hono's `c.req.valid()` is typed based on the OpenAPI route definition.
 *
 * When `body`, `params`, or `query` are OPTIONAL at the type level,
 * TypeScript produces a union of:
 *   - route WITH that request part
 *   - route WITHOUT that request part
 *
 * That union causes `c.req.valid()` to collapse its accepted keys to `never`,
 * which leads to errors like:
 *
 *   Argument of type '"json"' is not assignable to parameter of type 'never'
 *
 * To fix this, we must make the presence of `body`, `params`, and `query`
 * CONDITIONAL AT THE TYPE LEVEL, not just at runtime.
 *
 * We achieve this using conditional types + intersections (`&`),
 * which is the only TS-safe way to conditionally add object properties in types.
 */

/**
 * Conditionally adds a JSON request body definition
 * ONLY if a Zod schema is provided.
 */

type BodyRequest<Body> = Body extends z.ZodTypeAny
  ? {
      body: {
        content: {
          "application/json": {
            schema: Body
          }
        }
      }
    }
  : {}

type ParamsRequest<Params> = Params extends RouteParamSchema
  ? { params: Params }
  : {}

type QueryRequest<Query> = Query extends RouteParamSchema
  ? { query: Query }
  : {}

type RequestConfig<
  Body extends z.ZodTypeAny | undefined,
  Params extends RouteParamSchema | undefined,
  Query extends RouteParamSchema | undefined,
> = BodyRequest<Body> & ParamsRequest<Params> & QueryRequest<Query>

const mapResponses = <R extends readonly ApiResponse<HttpStatus, z._ZodType>[]>(
  responses: R
): OpenApiResponses<R> => {
  const result = {} as OpenApiResponses<R>

  for (const r of responses) {
    const status = r.status as keyof OpenApiResponses<R>

    result[status] = {
      description: r.description,
      content: {
        "application/json": {
          schema: r.schema,
        },
      },
    } as unknown as OpenApiResponses<R>[typeof status]
  }

  return result
}

/* ======================================================
 * REQUEST SCHEMA CONSTRAINTS (HONO SAFE)
 * ====================================================== */

type RouteParamSchema = z.ZodObject
// | z.ZodEffects<z.ZodObject<any>>;

/* ======================================================
 * CREATE API ARGUMENTS
 * ====================================================== */

type CreateApiArgs<
  Body extends z._ZodType | undefined,
  Params extends RouteParamSchema | undefined,
  Query extends RouteParamSchema | undefined,
  Responses extends readonly ApiResponse<HttpStatus, z._ZodType>[],
> = {
  method: "get" | "post" | "put" | "patch" | "delete"
  path: string
  middleware?: MiddlewareHandler[]
  operationId: string

  bodySchema?: Body
  paramsSchema?: Params
  querySchema?: Query

  responses: Responses
  tags?: string[]
}

/* ======================================================
 * CREATE API ROUTE
 * ====================================================== */

export const createApi = <
  Body extends z._ZodType | undefined,
  Params extends RouteParamSchema | undefined,
  Query extends RouteParamSchema | undefined,
  Responses extends readonly ApiResponse<HttpStatus, z._ZodType>[],
>(
  args: CreateApiArgs<Body, Params, Query, Responses>
) => {
  const {
    method,
    path,
    operationId,
    bodySchema,
    paramsSchema,
    querySchema,
    responses,
    tags,
    middleware,
  } = args

  return createRoute({
    method,
    path,
    operationId,
    tags,
    middleware,
    request: {
      ...(bodySchema
        ? {
            body: {
              content: {
                "application/json": {
                  schema: bodySchema,
                },
              },
            },
          }
        : {}),
      ...(paramsSchema ? { params: paramsSchema } : {}),
      ...(querySchema ? { query: querySchema } : {}),
    } as RequestConfig<Body, Params, Query>,

    responses: { ...mapResponses(responses), ...globalErrorResponses },
  })
}
