import { ErrorMeta } from "@avuny/utils"

import {
  AuthenticatedErrorCode,
  AuthLoginErrorCode,
  AuthSignUpErrorCode,
} from "./errors.js"

export const authLoginErrorMapping = {
  [AuthLoginErrorCode.AUTH_LOGIN_INCORRECT_CREDENTIALS]: {
    statusCode: 401,
    responseMessage: "Incorrect credentials",
  },
  [AuthLoginErrorCode.AUTH_LOGIN_USER_PASSWORD_NOT_SET]: {
    statusCode: 400,
    responseMessage: "User password is not set",
  },
} as const satisfies Record<AuthLoginErrorCode, ErrorMeta>

export const authSignUpErrorMapping = {
  [AuthSignUpErrorCode.AUTH_SIGN_UP_USER_EXIST]: {
    statusCode: 409, // Conflict
    responseMessage: "User already exists with this identifier",
  },
  [AuthSignUpErrorCode.AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_REQUIRED]: {
    statusCode: 403, // Forbidden or 400 Bad Request
    responseMessage: "Identifier verification is required",
  },
  [AuthSignUpErrorCode.AUTH_SIGN_UP_INVALID_VERIFICATION_TOKEN]: {
    statusCode: 400,
    responseMessage: "Invalid or expired verification token",
  },
  [AuthSignUpErrorCode.AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_MISMATCH]: {
    statusCode: 400,
    responseMessage:
      "Verification token does not match the provided identifier or type",
  },
} as const satisfies Record<AuthSignUpErrorCode, ErrorMeta>

export const authenticatedErrorMapping = {
  [AuthenticatedErrorCode.UNAUTHENTICATED]: {
    statusCode: 401,
    responseMessage: "Unauthenticated",
  },
  [AuthenticatedErrorCode.AUTH_REFRESH_TOKEN_INVALID]: {
    statusCode: 401,
    responseMessage: "Invalid refresh token",
  },
} as const satisfies Record<AuthenticatedErrorCode, ErrorMeta>
