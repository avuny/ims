import { ErrorMeta } from "@avuny/utils"

import {
  AuthenticatedCodesType,
  AuthenticatedErrorCodes,
  AuthLoginDomainErrorCodes,
  AuthLoginDomainErrorCodesType,
  AuthSignUpDomainErrorCodes,
  AuthSignUpDomainErrorCodesType,
} from "./errors.js"

export const authLoginErrorMapping = {
  [AuthLoginDomainErrorCodes.AUTH_LOGIN_INCORRECT_CREDENTIALS]: {
    statusCode: 401,
    responseMessage: "Incorrect credentials",
  },
  [AuthLoginDomainErrorCodes.AUTH_LOGIN_USER_PASSWORD_NOT_SET]: {
    statusCode: 400,
    responseMessage: "User password is not set",
  },
} as const satisfies Record<AuthLoginDomainErrorCodesType, ErrorMeta>

export const authSignUpErrorMapping = {
  [AuthSignUpDomainErrorCodes.AUTH_SIGN_UP_USER_EXIST]: {
    statusCode: 409, // Conflict
    responseMessage: "User already exists with this identifier",
  },
  [AuthSignUpDomainErrorCodes.AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_REQUIRED]: {
    statusCode: 403, // Forbidden or 400 Bad Request
    responseMessage: "Identifier verification is required",
  },
  [AuthSignUpDomainErrorCodes.AUTH_SIGN_UP_INVALID_VERIFICATION_TOKEN]: {
    statusCode: 400,
    responseMessage: "Invalid or expired verification token",
  },
  [AuthSignUpDomainErrorCodes.AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_MISMATCH]: {
    statusCode: 400,
    responseMessage:
      "Verification token does not match the provided identifier or type",
  },
} as const satisfies Record<AuthSignUpDomainErrorCodesType, ErrorMeta>

export const authenticatedErrorMapping = {
  [AuthenticatedErrorCodes.UNAUTHENTICATED]: {
    statusCode: 401,
    responseMessage: "Unauthenticated",
  },
  [AuthenticatedErrorCodes.AUTH_REFRESH_TOKEN_INVALID]: {
    statusCode: 401,
    responseMessage: "Invalid refresh token",
  },
} as const satisfies Record<AuthenticatedCodesType, ErrorMeta>
