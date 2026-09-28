// factory.ts

// 1. Import your database instance
import { db } from "@avuny/db" // Assuming this is your drizzle db instance export

// 2. Import config
import { config } from "./config.js"

// 3. Import Repositories
// Note: Using exact spelling from your snippet (RefreshTokenRepositoy)
import { RefreshTokenRepositoy } from "./repositories/refresh-token.repository.js"
import { UserRepository } from "./repositories/user.repository.js"

// 4. Import Services
import { JwtService } from "./services/jwt.service.js"
import { TokenService } from "./services/token.service.js"
import { AuthService } from "./services/auth.service.js"

// ============================================================================
// Initialize Repositories
// ============================================================================

export const userRepository = new UserRepository(db)
export const refreshTokenRepository = new RefreshTokenRepositoy(db)

// ============================================================================
// Initialize Services
// ============================================================================

export const jwtService = new JwtService({
  issuer: config.jwt.issuer,
  audience: config.jwt.audience,
  algorithm: config.jwt.algorithm,
})

export const tokenService = new TokenService(
  refreshTokenRepository,
  jwtService,
  {
    accessTokenSecret: config.token.accessTokenSecret,
    accessTokenExpiresIn: config.token.accessTokenExpiresIn,
    refreshTokenExpiresIn: config.token.refreshTokenExpiresIn,
  }
)

export const authService = new AuthService(
  userRepository,
  tokenService,
  jwtService,
  {
    identifierShouldBeVerified: config.auth.identifierShouldBeVerified,
    otpTokenSecret: config.auth.otpTokenSecret,
  }
)
