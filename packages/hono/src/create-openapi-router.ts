import { OpenAPIHono } from "@hono/zod-openapi"
import { logHttpRequest } from "./create-log.js"

const defaultHook = (result: any, c: any) => {
  if (!result.success) {
    logHttpRequest({
      c,
      level: "error", // it means it bypasses the validation in frontend, which is a critical issue that needs to be fixed.
      error: result.error.flatten().fieldErrors,
      msg: "validation_error",
    })

    return c.json(
      {
        success: false,
        type: "validation",
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
        errors: result.error.flatten().fieldErrors,
      },
      422
    )
  }
}

export function createOpenAPIRouter() {
  return new OpenAPIHono({
    defaultHook,
  })
}
