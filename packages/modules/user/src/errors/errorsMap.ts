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
    statusCode: 409,
    responseMessage: "User already exists",
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
