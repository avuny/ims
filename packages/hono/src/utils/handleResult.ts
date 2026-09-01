import { z } from "@avuny/zod"
import {
  ClientErrorStatusCode,
  ContentfulStatusCode,
} from "hono/utils/http-status"
import { Context } from "hono"
import {
  Result,
  resultToErrorResponse,
  resultToSuccessResponse,
} from "@avuny/utils"
import { logHttpRequest } from "../create-log.js"
type ErrorKey<M extends string, E extends string> = `${M}:errors.${E}`
export function handleResult<
  T,
  E extends string,
  S extends ContentfulStatusCode,
  SE extends ClientErrorStatusCode,
  ModuleName extends string,
>({
  c,
  errorMap,
  result,
  successStatus,
  errorTrans,
  onError,
  onSuccess,
  moduleName,
}: {
  c: Context
  result: Result<T, E>
  successStatus: S
  errorMap: Record<E, { statusCode: SE; responseMessage: string }>

  onSuccess?: (result: T) => void
  onError?: (error: E) => void
  errorTrans?: (key: ErrorKey<typeof moduleName, E>) => string
  moduleName: ModuleName
}) {
  if (!result.success) {
    const errMsg =
      errorTrans?.(`${moduleName}:errors.${result.error}`) ||
      errorMap[result.error]?.responseMessage ||
      "An error occurred"

    const mappedError = errorMap[result.error]

    onError?.(result.error)

    logHttpRequest({
      c,
      level: "info",
      error: result.error,
      msg: result.msg,
      meta: result.meta,
    })

    if (!mappedError) {
      return c.json(
        {
          success: false,
          code: result.error,
          message: errMsg,
          type: "domain",
        },
        undefined
      )
    }

    const err = resultToErrorResponse(result.error, errorMap)

    return c.json({ ...err.body, message: errMsg }, err.status)
  }
  onSuccess?.(result.data)

  const ok = resultToSuccessResponse(result.data, successStatus)
  logHttpRequest({
    c,
    level: "info",
    msg: result.msg,
    meta: result.meta,
  })
  return c.json(ok.body, ok.status)
}

const ErrorResponseSchema = z.object({
  message: z.string(),
})

export function mapErrorsToResponses<
  T extends Record<string, { statusCode: number; responseMessage: string }>,
>(errorMap: T) {
  const responses: Record<number, any> = {}

  for (const error of Object.values(errorMap)) {
    responses[error.statusCode] ??= {
      description: "Error",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
          example: { message: error.responseMessage },
        },
      },
    }
  }

  return responses
}
