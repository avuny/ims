export const AuthLoginErrorCode = {
  AUTH_LOGIN_INCORRECT_CREDENTIALS: "AUTH_LOGIN_INCORRECT_CREDENTIALS",
  AUTH_LOGIN_USER_PASSWORD_NOT_SET: "AUTH_LOGIN_USER_PASSWORD_NOT_SET",
} as const
export type AuthLoginErrorCode =
  (typeof AuthLoginErrorCode)[keyof typeof AuthLoginErrorCode]

export const AuthSignUpErrorCode = {
  AUTH_SIGN_UP_USER_EXIST: "AUTH_SIGN_UP_USER_EXIST",
  AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_REQUIRED:
    "AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_REQUIRED",
  AUTH_SIGN_UP_INVALID_VERIFICATION_TOKEN:
    "AUTH_SIGN_UP_INVALID_VERIFICATION_TOKEN",
  AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_MISMATCH:
    "AUTH_SIGN_UP_IDENTIFIER_VERIFICATION_MISMATCH",
} as const
export type AuthSignUpErrorCode =
  (typeof AuthSignUpErrorCode)[keyof typeof AuthSignUpErrorCode]

export const AuthenticatedErrorCode = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  AUTH_REFRESH_TOKEN_INVALID: "AUTH_REFRESH_TOKEN_INVALID",
} as const
export type AuthenticatedErrorCode =
  (typeof AuthenticatedErrorCode)[keyof typeof AuthenticatedErrorCode]

export const AuthErrorCode = {
  ...AuthLoginErrorCode,
  ...AuthSignUpErrorCode,
  ...AuthenticatedErrorCode,
} as const
export type AuthErrorCode =
  AuthLoginErrorCode | AuthSignUpErrorCode | AuthenticatedErrorCode
