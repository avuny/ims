import "dotenv/config"

import { createDbClient } from "@avuny/db"

export const db = createDbClient(config.DATABASE_URL)

import { config } from "../config.js"

import { createAuthContainer, IAuthService, ITokenService } from "@avuny/users"

const authContainer = createAuthContainer(db, {
  jwt: {
    issuer: config.JWT_ISSUER,
    audience: config.JWT_AUDIENCE,
    algorithm: config.JWT_ALGORITHM,
  },

  token: {
    accessTokenSecret: config.ACCESS_TOKEN_SECRET,
    accessTokenExpiresIn: config.ACCESS_TOKEN_EXPIRES_IN,
    refreshTokenExpiresIn: config.REFRESH_TOKEN_EXPIRES_IN,
  },

  auth: {
    otpTokenSecret: config.OTP_TOKEN_SECRET,
  },
})

export const authService: IAuthService = authContainer.authService
export const tokenService: ITokenService = authContainer.tokenService
