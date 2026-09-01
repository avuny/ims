import { ErrorMeta } from "../response.js"
import { ModuleErrorCode, ModuleErrorCodes } from "./module.errors.js"
export const ModuleErrorResponseMap = {
  /**
   * Duplicate name
   */
  [ModuleErrorCodes.MODULE_NAME_CONFLICT]: {
    statusCode: 409,
    responseMessage: "Name is already in use",
  },

  /**
   * Creation limit exceeded
   */
  [ModuleErrorCodes.MODULE_CREATION_LIMIT_EXCEEDED]: {
    statusCode: 429,
    responseMessage:
      "You have reached the maximum number of roles allowed in your plan. Please upgrade your plan to create more roles.",
  },

  /**
   * Permission denied
   */
  [ModuleErrorCodes.USER_NO_PERMISSION]: {
    statusCode: 403,
    responseMessage: "The user does not have permission to perform this action",
  },

  /**
   * Resource not found
   */
  [ModuleErrorCodes.RESOURCE_NOT_FOUND]: {
    statusCode: 404,
    responseMessage: "Resource not found",
  },

  /**
   * Transaction serialization failure
   */
  [ModuleErrorCodes.TRANSACTION_SERIALIZATION_FAILURE]: {
    statusCode: 400,
    responseMessage:
      "Transaction failed due to concurrent modifications. Please try again.",
  },
} as const satisfies Record<ModuleErrorCode, ErrorMeta>
