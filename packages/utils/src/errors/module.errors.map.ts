import { ErrorMeta } from "../response.js"
import { ModuleErrorCode } from "./module.errors.js"
export const ModuleErrorResponseMap = {
  /**
   * Duplicate name
   */
  [ModuleErrorCode.MODULE_NAME_CONFLICT]: {
    statusCode: 409,
    responseMessage: "Name is already in use",
  },

  /**
   * Creation limit exceeded
   */
  [ModuleErrorCode.MODULE_CREATION_LIMIT_EXCEEDED]: {
    statusCode: 429,
    responseMessage:
      "You have reached the maximum number of roles allowed in your plan. Please upgrade your plan to create more roles.",
  },

  /**
   * Permission denied
   */
  [ModuleErrorCode.USER_NO_PERMISSION]: {
    statusCode: 403,
    responseMessage: "The user does not have permission to perform this action",
  },

  /**
   * Resource not found
   */
  [ModuleErrorCode.RESOURCE_NOT_FOUND]: {
    statusCode: 404,
    responseMessage: "Resource not found",
  },

  /**
   * Transaction serialization failure
   */
  [ModuleErrorCode.TRANSACTION_SERIALIZATION_FAILURE]: {
    statusCode: 400,
    responseMessage:
      "Transaction failed due to concurrent modifications. Please try again.",
  },
} as const satisfies Record<ModuleErrorCode, ErrorMeta>
