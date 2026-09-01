import { describe, expect, it, vi, beforeEach } from "vitest"
import { ClientErrorStatusCode, fail, ok } from "@avuny/utils"
import { handleResult, mapErrorsToResponses } from "./utils/handleResult.js"
import { logHttpRequest } from "./create-log.js"

vi.mock("./create-log.js", () => ({
  logHttpRequest: vi.fn(),
}))

describe("handleResult", () => {
  const json = vi.fn()

  const c = {
    json,
    var: {
      organizationId: "org-123",
      user: {
        id: "user-123",
      },
    },
    req: {
      path: "/products",
      method: "GET",
      url: "http://localhost/products",
    },
  } as any

  const errorMap = {
    NOT_FOUND: {
      statusCode: 404,
      responseMessage: "Resource not found",
    },
    CONFLICT: {
      statusCode: 409,
      responseMessage: "Resource already exists",
    },
  } satisfies Record<
    "NOT_FOUND" | "CONFLICT",
    {
      statusCode: ClientErrorStatusCode
      responseMessage: string
    }
  >
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("success", () => {
    it("returns a successful JSON response", () => {
      const result = ok({
        data: { id: "123" },
        msg: "Resource retrieved",
      })

      const response = handleResult({
        c,
        result,
        errorMap,
        successStatus: 200,
        moduleName: "products",
      })

      expect(response).toBe(json.mock.results[0]?.value)

      expect(json).toHaveBeenCalledWith(
        {
          success: true,
          data: { id: "123" },
        },
        200
      )
    })

    it("uses the provided success status code", () => {
      const result = ok({
        data: { id: "123" },
        msg: "Resource created",
      })

      handleResult({
        c,
        result,
        errorMap,
        successStatus: 201,
        moduleName: "products",
      })

      expect(json).toHaveBeenCalledWith(
        {
          success: true,
          data: { id: "123" },
        },
        201
      )
    })

    it("calls onSuccess with the result data", () => {
      const onSuccess = vi.fn()

      const data = {
        id: "123",
        name: "Product",
      }

      const result = ok({
        data,
        msg: "Resource retrieved",
      })

      handleResult({
        c,
        result,
        errorMap,
        successStatus: 200,
        moduleName: "products",
        onSuccess,
      })

      expect(onSuccess).toHaveBeenCalledOnce()
      expect(onSuccess).toHaveBeenCalledWith(data)
    })

    it("does not call onError on success", () => {
      const onError = vi.fn()

      const result = ok({
        data: { id: "123" },
        msg: "Resource retrieved",
      })

      handleResult({
        c,
        result,
        errorMap,
        successStatus: 200,
        moduleName: "products",
        onError,
      })

      expect(onError).not.toHaveBeenCalled()
    })

    it("logs a successful request", () => {
      const result = ok({
        data: { id: "123" },
        msg: "Resource retrieved",
        meta: {
          source: "api",
        },
      })

      handleResult({
        c,
        result,
        errorMap,
        successStatus: 200,
        moduleName: "products",
      })

      expect(logHttpRequest).toHaveBeenCalledOnce()
      expect(logHttpRequest).toHaveBeenCalledWith({
        c,
        level: "info",
        msg: "Resource retrieved",
        meta: {
          source: "api",
        },
      })
    })
  })

  describe("error", () => {
    it("returns the mapped error response", () => {
      const result = fail({
        error: "NOT_FOUND",
        msg: "Product was not found",
      })

      handleResult({
        c,
        result,
        errorMap,
        successStatus: 200,
        moduleName: "products",
      })

      expect(json).toHaveBeenCalledWith(
        {
          success: false,
          code: "NOT_FOUND",
          message: "Resource not found",
          type: "domain",
        },
        404
      )
    })

    it("uses the translated error message when errorTrans is provided", () => {
      const result = fail({
        error: "NOT_FOUND",
        msg: "Product was not found",
      })

      const errorTrans = vi.fn().mockReturnValue("Product does not exist")

      handleResult({
        c,
        result,
        errorMap,
        successStatus: 200,
        moduleName: "products",
        errorTrans,
      })

      expect(errorTrans).toHaveBeenCalledOnce()
      expect(errorTrans).toHaveBeenCalledWith("products:errors.NOT_FOUND")

      expect(json).toHaveBeenCalledWith(
        {
          success: false,
          code: "NOT_FOUND",
          message: "Product does not exist",
          type: "domain",
        },
        404
      )
    })

    it("falls back to the mapped response message when translation returns an empty value", () => {
      const result = fail({
        error: "CONFLICT",
        msg: "Resource already exists",
      })

      const errorTrans = vi.fn().mockReturnValue("")

      handleResult({
        c,
        result,
        errorMap,
        successStatus: 200,
        moduleName: "products",
        errorTrans,
      })

      expect(json).toHaveBeenCalledWith(
        {
          success: false,
          code: "CONFLICT",
          message: "Resource already exists",
          type: "domain",
        },
        409
      )
    })

    it("calls onError with the error code", () => {
      const onError = vi.fn()

      const result = fail({
        error: "NOT_FOUND",
        msg: "Product was not found",
      })

      handleResult({
        c,
        result,
        errorMap,
        successStatus: 200,
        moduleName: "products",
        onError,
      })

      expect(onError).toHaveBeenCalledOnce()
      expect(onError).toHaveBeenCalledWith("NOT_FOUND")
    })

    it("does not call onSuccess on error", () => {
      const onSuccess = vi.fn()

      const result = fail({
        error: "NOT_FOUND",
        msg: "Product was not found",
      })

      handleResult({
        c,
        result,
        errorMap,
        successStatus: 200,
        moduleName: "products",
        onSuccess,
      })

      expect(onSuccess).not.toHaveBeenCalled()
    })

    it("logs an error request", () => {
      const result = fail({
        error: "NOT_FOUND",
        msg: "Product was not found",
        meta: {
          resource: "product",
        },
      })

      handleResult({
        c,
        result,
        errorMap,
        successStatus: 200,
        moduleName: "products",
      })

      expect(logHttpRequest).toHaveBeenCalledOnce()
      expect(logHttpRequest).toHaveBeenCalledWith({
        c,
        level: "info",
        error: "NOT_FOUND",
        msg: "Product was not found",
        meta: {
          resource: "product",
        },
      })
    })

    it("uses the generic fallback message when the error is not mapped", () => {
      const result = fail<string>({
        error: "UNKNOWN",
        msg: "Unknown domain error",
      })

      const partialErrorMap = {
        NOT_FOUND: {
          statusCode: 404,
          responseMessage: "Resource not found",
        },
      } satisfies Record<
        "NOT_FOUND",
        {
          statusCode: ClientErrorStatusCode
          responseMessage: string
        }
      >
      handleResult({
        c,
        result,
        errorMap: partialErrorMap,
        successStatus: 200,
        moduleName: "products",
      })

      expect(json).toHaveBeenCalledWith(
        {
          success: false,
          code: "UNKNOWN",
          message: "An error occurred",
          type: "domain",
        },
        undefined
      )
    })

    it("passes the error status code from the error map", () => {
      const result = fail({
        error: "CONFLICT",
        msg: "Conflict occurred",
      })

      handleResult({
        c,
        result,
        errorMap,
        successStatus: 201,
        moduleName: "products",
      })

      expect(json).toHaveBeenCalledWith(
        {
          success: false,
          code: "CONFLICT",
          message: "Resource already exists",
          type: "domain",
        },
        409
      )
    })
  })
})

describe("mapErrorsToResponses", () => {
  it("maps an error to its HTTP response schema", () => {
    const errorMap = {
      NOT_FOUND: {
        statusCode: 404,
        responseMessage: "Resource not found",
      },
    }

    expect(mapErrorsToResponses(errorMap)).toEqual({
      404: {
        description: "Error",
        content: {
          "application/json": {
            schema: expect.anything(),
            example: {
              message: "Resource not found",
            },
          },
        },
      },
    })
  })

  it("maps multiple errors with different status codes", () => {
    const errorMap = {
      NOT_FOUND: {
        statusCode: 404,
        responseMessage: "Resource not found",
      },
      CONFLICT: {
        statusCode: 409,
        responseMessage: "Resource already exists",
      },
      BAD_REQUEST: {
        statusCode: 400,
        responseMessage: "Invalid request",
      },
    }

    expect(mapErrorsToResponses(errorMap)).toMatchObject({
      404: {
        description: "Error",
        content: {
          "application/json": {
            example: {
              message: "Resource not found",
            },
          },
        },
      },
      409: {
        description: "Error",
        content: {
          "application/json": {
            example: {
              message: "Resource already exists",
            },
          },
        },
      },
      400: {
        description: "Error",
        content: {
          "application/json": {
            example: {
              message: "Invalid request",
            },
          },
        },
      },
    })
  })

  it("creates only one response for errors sharing the same status code", () => {
    const errorMap = {
      PRODUCT_NOT_FOUND: {
        statusCode: 404,
        responseMessage: "Product not found",
      },
      CUSTOMER_NOT_FOUND: {
        statusCode: 404,
        responseMessage: "Customer not found",
      },
    }

    const responses = mapErrorsToResponses(errorMap)

    expect(Object.keys(responses)).toHaveLength(1)
    expect(responses[404]).toEqual({
      description: "Error",
      content: {
        "application/json": {
          schema: expect.anything(),
          example: {
            message: "Product not found",
          },
        },
      },
    })
  })

  it("returns an empty object for an empty error map", () => {
    expect(mapErrorsToResponses({})).toEqual({})
  })

  it("uses the first error message for duplicate status codes", () => {
    const errorMap = {
      FIRST: {
        statusCode: 400,
        responseMessage: "First error",
      },
      SECOND: {
        statusCode: 400,
        responseMessage: "Second error",
      },
    }

    const responses = mapErrorsToResponses(errorMap)

    expect(responses[400].content["application/json"].example).toEqual({
      message: "First error",
    })
  })
})
