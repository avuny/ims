// src/domain/errors.ts
export const AuthLoginDomainErrorCodes = {
  AUTH_LOGIN_INCORRECT_CREDENTIALS: "AUTH_LOGIN_INCORRECT_CREDENTIALS",
  AUTH_LOGIN_USER_PASSWORD_NOT_SET: "AUTH_LOGIN_USER_PASSWORD_NOT_SET",
} as const;
export type AuthLoginDomainErrorCodesType =
  (typeof AuthLoginDomainErrorCodes)[keyof typeof AuthLoginDomainErrorCodes];

export const AuthSignUpDomainErrorCodes = {
  AUTH_SIGN_UP_USER_EXIST: "AUTH_SIGN_UP_USER_EXIST",
} as const;
export type AuthSignUpDomainErrorCodesType =
  (typeof AuthSignUpDomainErrorCodes)[keyof typeof AuthSignUpDomainErrorCodes];

export const AuthenticatedErrorCodes = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  AUTH_REFRESH_TOKEN_INVALID: "AUTH_REFRESH_TOKEN_INVALID",
} as const;
export type AuthenticatedCodesType =
  (typeof AuthenticatedErrorCodes)[keyof typeof AuthenticatedErrorCodes];

export const AuthDomainErrorCodes = {
  ...AuthLoginDomainErrorCodes,
  ...AuthSignUpDomainErrorCodes,
  ...AuthenticatedErrorCodes,
} as const;
export type AuthDomainErrorCodesType =
  | AuthLoginDomainErrorCodesType
  | AuthSignUpDomainErrorCodesType
  | AuthenticatedCodesType;
