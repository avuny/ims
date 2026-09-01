import { describe, expect, it } from "vitest"

import { fail, ok } from "./result.js"
import {
  ErrorMeta,
  resultToErrorResponse,
  resultToResponse,
  resultToSuccessResponse,
} from "./response.js"

describe("resultToResponse", () => {
  describe("success", () => {
    it("returns a successful response with the default status code", () => {
      const result = ok({
        data: { id: "123" },
        msg: "Product retrieved successfully",
      })

      expect(resultToResponse(result)).toEqual({
        status: 200,
        body: {
          success: true,
          data: { id: "123" },
        },
      })
    })

    it("returns a successful response with a custom status code", () => {
      const result = ok({
        data: "created",
        msg: "Product created successfully",
      })

      expect(resultToResponse(result, undefined, 201)).toEqual({
        status: 201,
        body: {
          success: true,
          data: "created",
        },
      })
    })

    it("preserves the response data", () => {
      const data = {
        id: "123",
        name: "Product",
        quantity: 10,
      }

      const result = ok({
        data,
        msg: "Product retrieved successfully",
      })

      const response = resultToResponse(result)

      expect(response.body.data).toBe(data)
    })
  })

  describe("error", () => {
    it("returns the mapped error status and message", () => {
      const result = fail({
        error: "NOT_FOUND",
        msg: "Product was not found",
      })

      const errorMap: Record<string, ErrorMeta> = {
        NOT_FOUND: {
          statusCode: 404,
          responseMessage: "Resource not found",
        },
      }

      expect(resultToResponse(result, errorMap)).toEqual({
        status: 404,
        body: {
          success: false,
          code: "NOT_FOUND",
          message: "Resource not found",
        },
      })
    })

    it("uses the default status code when no error map is provided", () => {
      const result = fail({
        error: "VALIDATION_ERROR",
        msg: "Invalid product data",
      })

      expect(resultToResponse(result)).toEqual({
        status: 200,
        body: {
          success: false,
          code: "VALIDATION_ERROR",
          message: undefined,
        },
      })
    })

    it("uses the default status code when the error is not mapped", () => {
      const result = fail<"NOT_FOUND" | "UNKNOWN">({
        error: "UNKNOWN",
        msg: "Unknown error",
      })

      const errorMap: Record<string, ErrorMeta> = {
        NOT_FOUND: {
          statusCode: 404,
          responseMessage: "Resource not found",
        },
      }

      expect(resultToResponse(result, errorMap)).toEqual({
        status: 200,
        body: {
          success: false,
          code: "UNKNOWN",
          message: undefined,
        },
      })
    })

    it("uses the provided success status code as the fallback status", () => {
      const result = fail({
        error: "UNKNOWN",
        msg: "Unknown error",
      })

      expect(resultToResponse(result, undefined, 201)).toEqual({
        status: 201,
        body: {
          success: false,
          code: "UNKNOWN",
          message: undefined,
        },
      })
    })
  })
})

describe("resultToErrorResponse", () => {
  const errorMap = {
    NOT_FOUND: {
      statusCode: 404,
      responseMessage: "Product not found",
    },
    CONFLICT: {
      statusCode: 409,
      responseMessage: "Product already exists",
    },
  }

  it("returns the mapped domain error response", () => {
    expect(resultToErrorResponse("NOT_FOUND", errorMap)).toEqual({
      status: 404,
      body: {
        success: false,
        code: "NOT_FOUND",
        message: "Product not found",
        type: "domain",
      },
    })
  })

  it("returns the correct response for different error codes", () => {
    expect(resultToErrorResponse("CONFLICT", errorMap)).toEqual({
      status: 409,
      body: {
        success: false,
        code: "CONFLICT",
        message: "Product already exists",
        type: "domain",
      },
    })
  })
})

describe("resultToSuccessResponse", () => {
  it("returns a successful response", () => {
    expect(resultToSuccessResponse({ id: "123" }, 200)).toEqual({
      status: 200,
      body: {
        success: true,
        data: { id: "123" },
      },
    })
  })

  it("supports custom success status codes", () => {
    expect(resultToSuccessResponse({ id: "123" }, 201)).toEqual({
      status: 201,
      body: {
        success: true,
        data: { id: "123" },
      },
    })
  })

  it("preserves the exact data reference", () => {
    const data = {
      id: "123",
      name: "Product",
    }

    const response = resultToSuccessResponse(data, 200)

    expect(response.body.data).toBe(data)
  })
})
