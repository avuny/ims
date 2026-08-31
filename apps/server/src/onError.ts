// import { logHttpRequest } from "@avuny/hono"
import type { ErrorHandler } from "hono"

export const onError: ErrorHandler = (err, c) => {
  // logHttpRequest({
  //   c,
  //   level: "error",
  //   error: err,
  //   msg: err.message,
  // })

  return c.json(
    {
      success: false,
      type: "server",
      code: "SERVER_ERROR",
      message: err.message || "Internal server error",
    },
    500
  )
}
