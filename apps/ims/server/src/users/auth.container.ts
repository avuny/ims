import "dotenv/config"

import { createDbClient } from "@avuny/db"

export const db = createDbClient(config.DATABASE_URL)

import { config } from "../config.js"

import { AuthService, createAuthContainer } from "@avuny/users"

const authContainer = createAuthContainer(db, {
  jwt: {
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
    algorithm: config.JWT_ALGORITHM,
  },

  accessToken: {
    accessTokenSecret: config.ACCESS_TOKEN_SECRET,
    accessTokenExpiresIn: config.ACCESS_TOKEN_EXPIRES_IN,
  },

  refreshToken: {
    refreshTokenExpiresIn: config.REFRESH_TOKEN_EXPIRES_IN,
  },

  // auth: {
  //   otpTokenSecret: config.OTP_TOKEN_SECRET,
  // },
})

export const authService = authContainer.authService
export const honoAuthenticatedMiddleware =
  authContainer.honoAuthenticatedMiddleware
